// Info: Themer - a token engine that derives a complete design-token theme
// from a template plus a cascade of layers, then emits it for web and for
// React Native from that one resolved source.
//
// The engine is pure: synchronous derivation, no I/O, no network, no external
// state. It never loads a font, never fetches a theme, and never observes
// whether a typeface is ready. A type set carries a font family TOKEN, which
// the font module resolves to a registered family name on its own timeline.
// Nothing here waits on that, so text renders immediately in a fallback family
// and swaps when the font module is done.
//
// Compatibility: Node.js 24+ and React Native (Hermes). No React, no DOM.
//
// Factory pattern: each loader call returns an independent instance with its
// own result cache. A host that renders one theme makes one instance and keeps
// it; a build tool that sweeps many themes makes one and discards it.
import CONFIG_DEFAULTS from './themer.config.js';
import ERRORS_CATALOG from './themer.errors.js';
import createValidators from './themer.validators.js';
import createColor from './parts/color.js';
import createScale from './parts/scale.js';
import createEmit from './parts/emit.js';
import createResolve from './parts/resolve.js';


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call returns one independent instance with its
own config and its own result cache.

@param {Object} shared_libs - Lib container with Utils and Debug
@param {Object} config - Overrides merged over module config defaults

@return {Object} - Public Themer interface
*********************************************************************/
export default function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    CONFIG_DEFAULTS,
    config || {}
  );

  // Error catalog (frozen, owned by the main module)
  const ERRORS = ERRORS_CATALOG;

  // Validators singleton - Lib and ERRORS injected here
  const Validators = createValidators(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Build the pure parts, threading siblings through the uniform parts container
  const Parts = _Themer.buildParts(Lib, CONFIG, ERRORS, Validators);

  // Mutable per-instance state (the result cache lives here)
  const state = {
    cache: new Map(),
    object_ids: new WeakMap(),
    next_object_id: 0,
    hits: 0,
    misses: 0,
    evictions: 0
  };

  return createInterface(Lib, CONFIG, ERRORS, Validators, Parts, state);

};/////////////////////////// Module-Loader END /////////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public interface for one instance. Public and private
functions close over the provided Lib, CONFIG, ERRORS, Validators,
Parts, and state.

@param {Object} Lib - Dependency container
@param {Object} CONFIG - Merged config for this instance
@param {Object} ERRORS - Frozen error catalog
@param {Object} Validators - Validators singleton
@param {Object} Parts - Pure parts built by the loader
@param {Object} state - Mutable per-instance state

@return {Object} - Public Themer interface
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, Parts, state) {

  const Themer = {


    // ~~~~~~~~~~~~~~~~~~~~ Theme Building ~~~~~~~~~~~~~~~~~~~~
    // The two stages, and the one call that runs both.

    /********************************************************************
    Derive a theme and emit it for one platform.

    This is the call a host makes at startup. It is synchronous and
    does no I/O, so a theme is ready in the same tick and rendering
    never waits on it.

    @param {Object} template - The template to derive from
    @param {Object[]} layers - Ordered sparse overlays
    @param {String} platform - 'web' or 'native'
    @param {Object} [options] - Per-call overrides

    @return {Object} - Emitted theme
    @return {Object} .tokens - Platform-ready value per token name
    @return {Object[]} .substituted - Tokens replaced by a platform fallback
    @return {Object[]} .lossy - Facts a platform projection could not carry
    @return {Object[]} .corrections - Contrast rewrites that were applied
    @return {Object[]} .violations - Contrast failures that were found
    *********************************************************************/
    buildTheme: function (template, layers, platform, options) {

      // Resolve first, so the emitted result and the reports share one derivation
      const resolved = Themer.resolve(template, layers, options);

      // Project the resolved tokens onto the requested platform
      const emitted = Themer.emit(resolved, template, platform);

      // Carry the contrast reports through, since they belong to the derivation
      return {
        tokens: emitted.tokens,
        substituted: emitted.substituted,
        lossy: emitted.lossy,
        corrections: resolved.corrections,
        violations: resolved.violations,
        stats: resolved.stats
      };

    },


    /********************************************************************
    Derive a platform-independent token map.

    @param {Object} template - The template to derive from
    @param {Object[]} layers - Ordered sparse overlays
    @param {Object} [options] - Per-call overrides

    @return {Object} - Resolution result, as documented in schemas
    *********************************************************************/
    resolve: function (template, layers, options) {

      // Validate before any property read, so a bad argument names itself
      Validators.validateTemplate(template);
      Validators.validateLayers(layers);
      Validators.validateOptions(options);

      // Serve a cached derivation when this instance has produced it already
      const key = _Themer.resolveKey(state, template, layers, options);
      const cached = _Themer.getCache(state, key);

      if (cached) {
        return cached;
      }

      // Derive, then store under the key so an equal call hits next time
      const result = Parts.Resolve.run(template, layers, options);
      _Themer.writeCache(state, CONFIG, key, result);

      return result;

    },


    /********************************************************************
    Project a resolved token map onto one platform.

    A token unavailable on the target platform takes its declared
    fallback rather than disappearing, and any fact a projection
    cannot carry is reported rather than dropped.

    @param {Object} resolved - Output of resolve
    @param {Object} template - The template that produced it
    @param {String} platform - 'web' or 'native'

    @return {Object} - Emitted result
    @return {Object} .tokens - Platform-ready value per token name
    @return {Object[]} .substituted - Tokens replaced by a platform fallback
    @return {Object[]} .lossy - Facts the projection could not carry
    *********************************************************************/
    emit: function (resolved, template, platform) {

      // Validate the platform so an unknown target fails instead of passing values through
      Validators.validatePlatform(platform, Parts.Emit.platforms());

      // Serve a cached projection when this resolved object was emitted before
      const key = _Themer.emitKey(state, resolved, platform);
      const cached = _Themer.getCache(state, key);

      if (cached) {
        return cached;
      }

      // Project every token, collecting substitutions and losses as it goes
      const result = _Themer.project(Parts, CONFIG, resolved, template, platform);
      _Themer.writeCache(state, CONFIG, key, result);

      return result;

    },


    // ~~~~~~~~~~~~~~~~~~~~ Inspection ~~~~~~~~~~~~~~~~~~~~
    // What a host needs to check a template or watch the cache.

    /********************************************************************
    Check a template's structural shape without deriving from it.

    Reports rather than throws, and is the one function here that
    does. It exists to be called before resolution by a build tool
    or by a host accepting a theme document, and both want every
    problem at once: raising the first finding turns checking a
    theme package into a five-round guessing game.

    Resolution keeps throwing, because by then a malformed template
    is a caller bug rather than a document under review.

    @param {Object} template - The template to check

    @return {Object} - Check result
    @return {Boolean} .success - True when no finding was recorded
    @return {String[]} .errors - Every finding, in the order found
    *********************************************************************/
    validateTemplate: function (template) {

      // Delegate so the rules live in exactly one place
      return Validators.checkTemplate(template);

    },


    /********************************************************************
    List the platforms this engine emits for.

    @return {String[]} - Platform names
    *********************************************************************/
    platforms: function () {

      // Delegate to the emit part, which owns the platform tables
      return Parts.Emit.platforms();

    },


    /********************************************************************
    Report this instance's cache counters.

    @return {Object} - Cache counters
    @return {Number} .hits - Calls served from the cache
    @return {Number} .misses - Calls that had to derive
    @return {Number} .evictions - Entries dropped to stay within capacity
    @return {Number} .size - Entries currently held
    *********************************************************************/
    cacheStats: function () {

      // Copy so a caller cannot mutate the live counters
      return {
        hits: state.hits,
        misses: state.misses,
        evictions: state.evictions,
        size: state.cache.size
      };

    },


    /********************************************************************
    Drop every cached result and reset the counters.

    @return {void}
    *********************************************************************/
    clearCache: function () {

      // Release the entries and start the counters over
      state.cache.clear();
      state.hits = 0;
      state.misses = 0;
      state.evictions = 0;

    }

  };

  return Themer;

};/////////////////////////// createInterface END ///////////////////////////////



/////////////////////////// Private Functions START ////////////////////////////
const _Themer = {


  // ~~~~~~~~~~~~~~~~~~~~ Construction ~~~~~~~~~~~~~~~~~~~~
  // Wiring the pure parts together at loader time.

  /********************************************************************
  Build the pure parts, threading siblings through the container.

  Every part loader takes the uniform (shared_libs, config, errors)
  signature, so a part that needs a sibling receives it on the
  container rather than through a wider signature.

  @param {Object} Lib - Dependency container
  @param {Object} CONFIG - Merged config for this instance
  @param {Object} ERRORS - Frozen error catalog
  @param {Object} Validators - Validators singleton

  @return {Object} - Map of part name to part interface
  *********************************************************************/
  buildParts: function (Lib, CONFIG, ERRORS, Validators) {

    // Colour and scale depend on nothing but Lib, so they build first
    const Color = createColor(Lib, CONFIG, ERRORS);
    const Scale = createScale(Lib, CONFIG, ERRORS);

    // Emit needs colour to render shadow layers as rgba
    const emit_libs = Object.assign({}, Lib, { Color: Color });

    // Resolve needs colour for contrast, scale for generators, and the validators
    const resolve_libs = Object.assign({}, Lib, {
      Color: Color,
      Scale: Scale,
      Validators: Validators
    });

    return {
      Color: Color,
      Scale: Scale,
      Emit: createEmit(emit_libs, CONFIG, ERRORS),
      Resolve: createResolve(resolve_libs, CONFIG, ERRORS)
    };

  },


  // ~~~~~~~~~~~~~~~~~~~~ Projection ~~~~~~~~~~~~~~~~~~~~
  // Walking a resolved map through one platform's emitters.

  /********************************************************************
  Project every resolved token onto one platform.

  @param {Object} Parts - Pure parts
  @param {Object} CONFIG - Merged config for this instance
  @param {Object} resolved - Output of resolve
  @param {Object} template - The template that produced it
  @param {String} platform - Target platform

  @return {Object} - Emitted result with its two reports
  *********************************************************************/
  project: function (Parts, CONFIG, resolved, template, platform) {

    // The template's own base size wins, so one template can restate the root
    const scales = resolved.scales || {};
    const base_font_size = scales.base_font_size || CONFIG.BASE_FONT_SIZE;

    const meta = template.meta || {};
    const supported = Parts.Emit.platforms();
    const out = {};
    const substituted = [];
    const lossy = [];

    // Project each token through the emitter its group names
    const names = Object.keys(resolved.tokens);

    for (let i = 0; i < names.length; i++) {
      _Themer.projectOne(Parts, names[i], resolved, meta, platform, supported, base_font_size, out, substituted, lossy);
    }

    return {
      tokens: out,
      substituted: substituted,
      lossy: lossy
    };

  },


  /********************************************************************
  Project one token, recording a substitution when the platform
  cannot carry it at all.

  @param {Object} Parts - Pure parts
  @param {String} name - Token name
  @param {Object} resolved - Output of resolve
  @param {Object} meta - Template metadata
  @param {String} platform - Target platform
  @param {String[]} supported - Every platform this engine emits for
  @param {Number} base_font_size - Root size for rem conversion
  @param {Object} out - Accumulated emitted tokens
  @param {Object[]} substituted - Accumulated substitution reports
  @param {Object[]} lossy - Accumulated loss reports

  @return {void}
  *********************************************************************/
  projectOne: function (Parts, name, resolved, meta, platform, supported, base_font_size, out, substituted, lossy) {

    // A token with no metadata passes through as a raw value
    const entry_meta = meta[name] || { group: 'raw' };
    const platforms = entry_meta.platforms || supported;
    const value = resolved.tokens[name];

    // Unavailable here, so emit the declared fallback rather than omitting the
    // key. Omitting it would force every caller to guard against undefined,
    // and a value that vanishes with no record is exactly what this reports.
    if (platforms.indexOf(platform) === -1) {
      out[name] = entry_meta.fallback ? entry_meta.fallback[platform] : null;

      substituted.push({
        token: name,
        declared: value,
        fallback: out[name]
      });

      return;
    }

    // The token name travels with the context so a lossy emitter can name it.
    // Without it a loss report says what was dropped but not where.
    const context = {
      base_font_size: base_font_size,
      token: name,
      lossy: lossy
    };

    out[name] = Parts.Emit.value(value, entry_meta.group, platform, context);

  },


  // ~~~~~~~~~~~~~~~~~~~~ Result Cache ~~~~~~~~~~~~~~~~~~~~
  // A bounded, least-recently-used cache over the two derivation stages. The
  // key is deliberately hybrid, because the inputs have opposite lifetimes: a
  // template is a long-lived import, so it is keyed by identity, while a layer
  // stack is rebuilt on every render, so it is keyed by content.

  /********************************************************************
  Build the cache key for a resolve call.

  Hashing the template instead of keying it by identity would make
  the hit path scale with token count, costing more than the
  derivation it avoids. Keying on the layers alone would be wrong
  rather than merely slow: a second template with the same layers
  would receive the first template's result.

  @param {Object} state - Per-instance state
  @param {Object} template - The template being resolved
  @param {Object[]} layers - Ordered sparse overlays
  @param {Object} options - Per-call overrides

  @return {String} - Cache key
  *********************************************************************/
  resolveKey: function (state, template, layers, options) {

    // Options join the key because they change the result
    return _Themer.idOf(state, template)
      + '|resolve|' + JSON.stringify(layers)
      + '|' + JSON.stringify(options === undefined ? null : options);

  },


  /********************************************************************
  Build the cache key for an emit call.

  Keyed on the resolved object's identity, not its content. A cached
  resolve returns the same reference, so identity is already an
  exact proxy for content here, and serializing a whole token map
  per call would cost more than the projection it avoids.

  A hand-built resolved object gets a fresh id and simply misses
  every time, which is correct but uncached.

  @param {Object} state - Per-instance state
  @param {Object} resolved - Output of resolve
  @param {String} platform - Target platform

  @return {String} - Cache key
  *********************************************************************/
  emitKey: function (state, resolved, platform) {

    // Platform joins the key so the two targets never serve each other's result
    return _Themer.idOf(state, resolved) + '|emit|' + platform;

  },


  /********************************************************************
  Assign a short stable id to an object, by identity.

  The ids live in a WeakMap, so a discarded template is collectable
  and takes its id with it.

  @param {Object} state - Per-instance state
  @param {Object} object - Object to identify

  @return {String} - Stable id for this object
  *********************************************************************/
  idOf: function (state, object) {

    // Mint an id the first time this object is seen
    if (!state.object_ids.has(object)) {
      state.object_ids.set(object, 'o' + state.next_object_id);
      state.next_object_id++;
    }

    return state.object_ids.get(object);

  },


  /********************************************************************
  Read a cache entry, refreshing its recency on a hit.

  @param {Object} state - Per-instance state
  @param {String} key - Cache key

  @return {*} - The cached value, or undefined on a miss
  *********************************************************************/
  getCache: function (state, key) {

    // Count the miss and let the caller derive
    if (!state.cache.has(key)) {
      state.misses++;

      return undefined;
    }

    // Re-insert so insertion order stays recency order, which is what makes
    // this least-recently-used rather than first-in-first-out
    const value = state.cache.get(key);
    state.cache.delete(key);
    state.cache.set(key, value);
    state.hits++;

    return value;

  },


  /********************************************************************
  Store a cache entry, evicting the oldest when at capacity.

  @param {Object} state - Per-instance state
  @param {Object} CONFIG - Merged config for this instance
  @param {String} key - Cache key
  @param {*} value - Value to store

  @return {void}
  *********************************************************************/
  writeCache: function (state, CONFIG, key, value) {

    // Storing nothing keeps every call cold, which is what the toggle is for
    if (CONFIG.CACHE_ENABLED !== true) {
      return;
    }

    // Drop the oldest entry when this insert would exceed the bound
    if (!state.cache.has(key) && state.cache.size >= CONFIG.CACHE_CAPACITY) {
      state.cache.delete(state.cache.keys().next().value);
      state.evictions++;
    }

    state.cache.set(key, value);

  }

};/////////////////////////// Private Functions END /////////////////////////////
