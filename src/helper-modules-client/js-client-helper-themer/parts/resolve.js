// Info: The resolution chain for helper-themer.
//
// A token's value can arrive by any of six routes - literal, alias, rule,
// generator, type set, or shadow - and nothing downstream can tell which route
// it took. That uniformity is the whole design: a theme that pins every value
// and a theme that pins four seeds are the same object shape on the same code
// path, with no modes to branch on.
//
// Resolution is platform independent. It produces canonical, unit-free values;
// projecting them onto a platform is the emit part's job.
//
// Loader pattern: SINGLETON part. Lib, CONFIG, and ERRORS are assigned once
// from the uniform parts signature; the public object closes over them.
'use strict';


// Shared dependencies injected by loader (uniform parts signature)
let Lib;
let CONFIG;
let ERRORS;

// Sibling parts and validators, injected on the container by the parent
let Color;
let Scale;
let Validators;


// Shadow geometry per elevation level. Authored rather than derived because no
// formula reproduces the two-layer construction a designer expects: a tight
// contact shadow plus a wider ambient one, whose ratio changes with height.
const ELEVATION = {
  1: [
    { offset_x: 0, offset_y: 1, blur: 3, spread: 0, opacity: 0.12 },
    { offset_x: 0, offset_y: 1, blur: 2, spread: 0, opacity: 0.24 }
  ],
  2: [
    { offset_x: 0, offset_y: 3, blur: 6, spread: 0, opacity: 0.16 },
    { offset_x: 0, offset_y: 3, blur: 6, spread: 0, opacity: 0.23 }
  ],
  3: [
    { offset_x: 0, offset_y: 10, blur: 20, spread: 0, opacity: 0.19 },
    { offset_x: 0, offset_y: 6, blur: 6, spread: 0, opacity: 0.23 }
  ],
  4: [
    { offset_x: 0, offset_y: 14, blur: 28, spread: 0, opacity: 0.25 },
    { offset_x: 0, offset_y: 10, blur: 10, spread: 0, opacity: 0.22 }
  ],
  5: [
    { offset_x: 0, offset_y: 19, blur: 38, spread: 0, opacity: 0.30 },
    { offset_x: 0, offset_y: 15, blur: 12, spread: 0, opacity: 0.22 }
  ]
};


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton part loader. Assigns the uniform part dependencies plus
the sibling parts and validators, and returns the shared Resolve
object.

@param {Object} shared_libs - Lib container with Utils, Color, Scale, Validators
@param {Object} config - Merged config from the parent module
@param {Object} errors - Frozen error catalog from the parent module

@return {Object} - Public Resolve interface
*********************************************************************/
module.exports = function loader (shared_libs, config, errors) {

  // Assign to module-scope vars so the public object can close over them
  Lib = shared_libs;
  CONFIG = config;
  ERRORS = errors;

  // Siblings ride in on the container, keeping the parts signature uniform
  Color = shared_libs.Color;
  Scale = shared_libs.Scale;
  Validators = shared_libs.Validators;

  return Resolve;

};/////////////////////////// Module-Loader END /////////////////////////////////



/////////////////////////// Public Functions START /////////////////////////////
const Resolve = {


  /********************************************************************
  Resolve a template plus a cascade of layers into a complete,
  platform-independent token map.

  Layers apply in array order, so the last layer to pin a token
  wins. A layer may also override scale seeds, which is what makes
  a density change a one-number edit rather than a second theme.

  @param {Object} template - The template being resolved
  @param {Object[]} layers - Ordered sparse overlays
  @param {Object} options - Per-call overrides
  @param {String} [options.contrast] - 'correct' to rewrite violations, anything else to only report
  @param {Number} [options.min_contrast_ratio] - Overrides the configured floor
  @param {Number} [options.motion_factor] - Scales every duration token

  @return {Object} - Resolution result
  @return {Object} .tokens - Canonical value per token name
  @return {Object} .scales - Merged scale seeds after the cascade
  @return {String} .polarity - Effective polarity
  @return {Object} .stats - Route and source counts
  @return {Object[]} .corrections - Contrast rewrites that were applied
  @return {Object[]} .violations - Contrast failures that were found
  *********************************************************************/
  run: function (template, layers, options) {

    // Build the cascade context once, so token resolution reads a settled world
    const context = _Resolve.buildContext(template, layers, options);

    // Resolve every declared token, following aliases and rules as they appear
    const names = Object.keys(template.tokens);

    for (let i = 0; i < names.length; i++) {
      _Resolve.resolveToken(names[i], context);
    }

    // Scale durations after resolution so the factor reaches literals and rules alike
    _Resolve.applyMotionFactor(template, context);

    // Enforce contrast last, so the pass sees final values whatever route produced them
    _Resolve.applyContrastRules(template, context);

    return {
      tokens: context.resolved,
      scales: context.scales,
      polarity: context.polarity,
      anchor_index: context.anchor_index,
      motion_factor: context.motion_factor,
      contrast_mode: context.contrast_mode,
      stats: context.stats,
      corrections: context.corrections,
      violations: context.violations
    };

  }

};/////////////////////////// Public Functions END //////////////////////////////



/////////////////////////// Private Functions START ////////////////////////////
const _Resolve = {


  // ~~~~~~~~~~~~~~~~~~~~ Cascade Setup ~~~~~~~~~~~~~~~~~~~~
  // Flattening the layer stack into the single world token resolution reads.

  /********************************************************************
  Flatten the layer stack into a resolution context.

  @param {Object} template - The template being resolved
  @param {Object[]} layers - Ordered sparse overlays
  @param {Object} options - Per-call overrides

  @return {Object} - Resolution context
  *********************************************************************/
  buildContext: function (template, layers, options) {

    // Deep copy the seeds so a layer override cannot mutate the shared template
    const settings = options || {};
    const scales = JSON.parse(JSON.stringify(template.scales || {}));
    const overlay = {};

    // Apply each layer in order, so a later layer overwrites an earlier pin
    for (let i = 0; i < layers.length; i++) {
      _Resolve.applyLayer(layers[i], overlay, scales);
    }

    // Polarity comes from the last layer that states one, else the template
    const polarity = _Resolve.effectivePolarity(template, layers);
    const ramp = template.ramp || [];

    return {
      overlay: overlay,
      scales: scales,
      polarity: polarity,
      ramp: ramp,
      anchor_index: _Resolve.anchorIndex(ramp, polarity, overlay),
      palette: template.palette || {},
      tokens: template.tokens,
      resolved: {},
      in_progress: {},
      motion_factor: _Resolve.effectiveMotionFactor(layers),
      contrast_mode: settings.contrast || 'correct',
      min_contrast_ratio: Lib.Utils.isNumber(settings.min_contrast_ratio) ? settings.min_contrast_ratio : CONFIG.MIN_CONTRAST_RATIO,
      corrections: [],
      violations: [],
      stats: {
        route: { literal: 0, alias: 0, rule: 0, generator: 0, type_set: 0, shadow: 0 },
        source: { theme: 0, default: 0 }
      }
    };

  },


  /********************************************************************
  Fold one layer into the overlay and the scale seeds.

  @param {Object} layer - One sparse overlay
  @param {Object} overlay - Accumulated token pins
  @param {Object} scales - Accumulated scale seeds

  @return {void}
  *********************************************************************/
  applyLayer: function (layer, overlay, scales) {

    // Copy each pinned token forward, letting this layer win over earlier ones
    const token_pins = layer.tokens || {};
    const token_names = Object.keys(token_pins);

    for (let i = 0; i < token_names.length; i++) {
      overlay[token_names[i]] = token_pins[token_names[i]];
    }

    // Merge scale seeds per scale, so a layer can change one seed without restating the rest
    const scale_pins = layer.scales || {};
    const scale_names = Object.keys(scale_pins);

    for (let i = 0; i < scale_names.length; i++) {
      scales[scale_names[i]] = Object.assign({}, scales[scale_names[i]], scale_pins[scale_names[i]]);
    }

  },


  /********************************************************************
  Determine the effective polarity for this cascade.

  @param {Object} template - The template being resolved
  @param {Object[]} layers - Ordered sparse overlays

  @return {String} - 'light' or 'dark'
  *********************************************************************/
  effectivePolarity: function (template, layers) {

    // Start from the template and let any layer that states a polarity replace it
    let polarity = template.polarity || 'light';

    for (let i = 0; i < layers.length; i++) {
      if (layers[i].polarity) {
        polarity = layers[i].polarity;
      }
    }

    return polarity;

  },


  /********************************************************************
  Determine the effective motion factor for this cascade.

  @param {Object[]} layers - Ordered sparse overlays

  @return {Number} - Factor every duration is multiplied by
  *********************************************************************/
  effectiveMotionFactor: function (layers) {

    // Unscaled unless a layer says otherwise
    let factor = 1;

    for (let i = 0; i < layers.length; i++) {
      if (Lib.Utils.isNumber(layers[i].motion_factor)) {
        Validators.assertUnitInterval(layers[i].motion_factor, 'layers[' + i + '].motion_factor');
        factor = layers[i].motion_factor;
      }
    }

    return factor;

  },


  /********************************************************************
  Locate the position on the neutral ramp that the page background
  occupies, which is where ramp-relative rules count from.

  @param {String[]} ramp - Ordered neutral ramp
  @param {String} polarity - Effective polarity
  @param {Object} overlay - Accumulated token pins

  @return {Number} - Index into the ramp
  *********************************************************************/
  anchorIndex: function (ramp, polarity, overlay) {

    // A light theme starts at the light end of the ramp, a dark theme at the dark end
    let index = (polarity === 'light') ? 0 : Math.max(0, ramp.length - 1);

    // A pinned background that exists on the ramp moves the anchor to that step
    const background = overlay['background'];

    if (Lib.Utils.isString(background) && background.charAt(0) === '#') {
      const found = ramp.indexOf(background.toLowerCase());

      if (found !== -1) {
        index = found;
      }
    }

    return index;

  },


  // ~~~~~~~~~~~~~~~~~~~~ Token Resolution ~~~~~~~~~~~~~~~~~~~~
  // One token at a time, recursing through aliases and rule operands.

  /********************************************************************
  Resolve one token by name, memoizing the result for this run.

  @param {String} name - Token name
  @param {Object} context - Resolution context

  @return {*} - The canonical value
  *********************************************************************/
  resolveToken: function (name, context) {

    // Return the settled value when this token was already reached
    if (Object.prototype.hasOwnProperty.call(context.resolved, name)) {
      return context.resolved[name];
    }

    // A token reached while it is still resolving means the aliases form a loop
    if (context.in_progress[name]) {
      Validators.fail('tokens.' + name, ERRORS.MUST_NOT_CYCLE);
    }

    context.in_progress[name] = true;

    // A layer pin wins over the template default, and the source is recorded
    const from_theme = Object.prototype.hasOwnProperty.call(context.overlay, name);
    const entry = from_theme ? context.overlay[name] : context.tokens[name];

    // An alias can name a token nothing declares, which is a template defect
    if (entry === undefined) {
      delete context.in_progress[name];
      Validators.fail('tokens.' + name, ERRORS.MUST_BE_DECLARED_TOKEN);
    }

    // Dispatch on the entry's shape, which is what makes the routes uniform
    const value = _Resolve.valueOf(name, entry, context, from_theme);

    // Release the cycle guard and memoize before returning
    delete context.in_progress[name];
    context.resolved[name] = value;

    return value;

  },


  /********************************************************************
  Produce the canonical value for one template entry.

  @param {String} name - Token name, for error messages
  @param {*} entry - The template or overlay entry
  @param {Object} context - Resolution context
  @param {Boolean} from_theme - Whether a layer supplied the entry

  @return {*} - The canonical value
  *********************************************************************/
  valueOf: function (name, entry, context, from_theme) {

    // Each branch records the route it took, so a theme's real shape is measurable
    if (_Resolve.isAlias(entry)) {
      _Resolve.countRoute(context, 'alias', from_theme);

      return _Resolve.resolveToken(entry.slice(1, -1), context);
    }

    if (_Resolve.isTypeSet(entry)) {
      _Resolve.countRoute(context, 'type_set', from_theme);

      return _Resolve.typeSetValue(name, entry, context);
    }

    if (_Resolve.isShadow(entry)) {
      _Resolve.countRoute(context, 'shadow', from_theme);

      return _Resolve.shadowValue(name, entry, context);
    }

    if (_Resolve.isGenerator(entry)) {
      _Resolve.countRoute(context, 'generator', from_theme);

      return Scale.byName(entry.scale, name)(entry, context.scales[entry.scale] || {});
    }

    if (_Resolve.isRule(entry)) {
      _Resolve.countRoute(context, 'rule', from_theme);

      return _Resolve.ruleValue(name, entry, context);
    }

    if (_Resolve.isLiteral(entry)) {
      _Resolve.countRoute(context, 'literal', from_theme);

      return _Resolve.literalValue(entry);
    }

    // Nothing matched, so the entry is a shape this engine has no route for
    delete context.in_progress[name];
    Validators.fail('tokens.' + name, ERRORS.MUST_BE_KNOWN_ENTRY);

  },


  /********************************************************************
  Build a type set value.

  A type set resolves to an object rather than to separate sibling
  tokens. That is what makes an absolute native line height
  computable at emit time: the font size it depends on is already
  inside the same object, so emit never reaches across tokens.

  @param {String} name - Token name, for error messages
  @param {Object} entry - Type set entry
  @param {Object} context - Resolution context

  @return {Object} - Canonical type set
  *********************************************************************/
  typeSetValue: function (name, entry, context) {

    // A negative line height would invert the text box
    if (!Lib.Utils.isNullOrUndefined(entry.line_height)) {
      Validators.assertNonNegativeNumber(entry.line_height, 'tokens.' + name + '.line_height');
    }

    // The family is a token, so it must be a plain string and never an object
    if (!Lib.Utils.isNullOrUndefined(entry.font_family) && !Lib.Utils.isString(entry.font_family)) {
      Validators.fail('tokens.' + name + '.font_family', ERRORS.MUST_BE_KNOWN_ENTRY);
    }

    // Size comes off the type scale, so one seed moves the whole ramp
    const value = {
      fontSize: Scale.byName(entry.scale || 'carbonType', name)({ step: entry.step }, context.scales[entry.scale || 'carbonType'] || {}),
      lineHeight: entry.line_height,
      letterSpacing: entry.letter_spacing
    };

    // An unset weight stays unset, so emit can omit it rather than invent one
    if (entry.weight !== undefined) {
      value.fontWeight = entry.weight;
    }

    // Carried through untranslated. The engine has no font registry and does no
    // I/O, so it cannot know which typeface a token names or whether it loaded.
    // Resolving the token to a family name, and loading the file, belong to the
    // font module. React Native accepts one family, so a CSS-style fallback
    // list could not be represented here even if the engine wanted to emit one.
    if (entry.font_family !== undefined) {
      value.fontFamily = entry.font_family;
    }

    return value;

  },


  /********************************************************************
  Build a shadow value.

  A shadow resolves to an object for the same reason a type set
  does: emit needs every layer together to build one platform
  value, and sibling tokens would force cross-token reads.

  @param {String} name - Token name, for error messages
  @param {Object} entry - Shadow entry
  @param {Object} context - Resolution context

  @return {Object} - Canonical shadow
  *********************************************************************/
  shadowValue: function (name, entry, context) {

    // Geometry comes either from an elevation level or from explicit layers
    const layers = _Resolve.shadowLayers(name, entry, context);

    // The colour may itself be an alias, so it resolves through the same chain
    const colour = _Resolve.shadowColour(entry, context);

    // Stamp the resolved colour onto every layer so emit needs no second lookup
    const composed = layers.map(function (l) {
      return Object.assign({ color: colour }, l);
    });

    return {
      layers: composed,
      elevation: (entry.elevation !== undefined) ? entry.elevation : (entry.level || 0)
    };

  },


  /********************************************************************
  Select the layer geometry for a shadow entry.

  @param {String} name - Token name, for error messages
  @param {Object} entry - Shadow entry
  @param {Object} context - Resolution context

  @return {Object[]} - Copied layer geometry
  *********************************************************************/
  shadowLayers: function (name, entry, context) {

    // A level seeds the geometry from the authored elevation table
    if (entry.level !== undefined) {

      if (!ELEVATION[entry.level]) {
        delete context.in_progress[name];
        Validators.fail('tokens.' + name + '.level', ERRORS.MUST_BE_KNOWN_ENTRY);
      }

      return ELEVATION[entry.level].map(function (l) {
        return Object.assign({}, l);
      });
    }

    // Explicit layers let a template state geometry the table does not cover
    if (Array.isArray(entry.layers)) {
      return entry.layers.map(function (l) {
        return Object.assign({}, l);
      });
    }

    // Neither route was declared, so there is no geometry to emit
    delete context.in_progress[name];
    Validators.fail('tokens.' + name, ERRORS.MUST_BE_KNOWN_ENTRY);

  },


  /********************************************************************
  Resolve the colour a shadow paints with.

  @param {Object} entry - Shadow entry
  @param {Object} context - Resolution context

  @return {String} - Hex colour
  *********************************************************************/
  shadowColour: function (entry, context) {

    // Default to black, which is what an unstated shadow colour means
    if (!entry.color) {
      return '#000000';
    }

    // An alias routes through token resolution so a themed shadow follows the theme
    if (_Resolve.isAlias(entry.color)) {
      return _Resolve.resolveToken(entry.color.slice(1, -1), context);
    }

    return entry.color;

  },


  /********************************************************************
  Evaluate a rule entry through its named operation.

  @param {String} name - Token name, for error messages
  @param {Object} entry - Rule entry
  @param {Object} context - Resolution context

  @return {*} - The operation's result
  *********************************************************************/
  ruleValue: function (name, entry, context) {

    // An unknown operation would otherwise resolve the token to undefined
    const operation = _Operations[entry.op];

    if (!operation) {
      delete context.in_progress[name];
      Validators.fail('tokens.' + name + '.op', ERRORS.MUST_BE_KNOWN_OPERATION);
    }

    return operation(entry.args || [], context);

  },


  /********************************************************************
  Normalize a literal entry.

  @param {*} entry - Literal entry

  @return {*} - The normalized value
  *********************************************************************/
  literalValue: function (entry) {

    // Lowercase hex so later identity comparisons against the palette match
    if (Lib.Utils.isString(entry) && entry.charAt(0) === '#') {
      return entry.toLowerCase();
    }

    return entry;

  },


  /********************************************************************
  Record which route produced a value and where the entry came from.

  Route is how the value was produced; source is where the entry
  came from. Conflating them hides which parts of the chain a theme
  actually uses.

  @param {Object} context - Resolution context
  @param {String} route - Route name
  @param {Boolean} from_theme - Whether a layer supplied the entry

  @return {void}
  *********************************************************************/
  countRoute: function (context, route, from_theme) {

    // Two independent counters, incremented together on every resolved token
    context.stats.route[route]++;
    context.stats.source[from_theme ? 'theme' : 'default']++;

  },


  // ~~~~~~~~~~~~~~~~~~~~ Post Passes ~~~~~~~~~~~~~~~~~~~~
  // Derivations that run once over the settled token map.

  /********************************************************************
  Scale every duration token by the effective motion factor.

  Reduced motion is a derivation over the durations a theme already
  has, not a second theme to author and keep in step.

  @param {Object} template - The template being resolved
  @param {Object} context - Resolution context

  @return {void}
  *********************************************************************/
  applyMotionFactor: function (template, context) {

    // Nothing to do at full motion, which is the common case
    if (context.motion_factor === 1) {
      return;
    }

    // Scale only the tokens the template marks as durations
    const meta = template.meta || {};
    const names = Object.keys(meta);

    for (let i = 0; i < names.length; i++) {
      if (meta[names[i]].group === 'duration' && Lib.Utils.isNumber(context.resolved[names[i]])) {
        context.resolved[names[i]] = Math.round(context.resolved[names[i]] * context.motion_factor);
      }
    }

  },


  /********************************************************************
  Enforce the template's contrast rules over the settled values.

  Enforcement runs after resolution so it covers literals, aliases,
  and rules alike. Whether a violation is corrected or only recorded
  is the caller's policy: a build tool reports and fails, a runtime
  corrects so a bad remote theme degrades instead of blanking the
  screen.

  @param {Object} template - The template being resolved
  @param {Object} context - Resolution context

  @return {void}
  *********************************************************************/
  applyContrastRules: function (template, context) {

    // Each rule names a foreground token, its background, and the required ratio
    const rules = template.contrast_rules || [];

    for (let i = 0; i < rules.length; i++) {
      _Resolve.applyOneContrastRule(rules[i], i, context);
    }

  },


  /********************************************************************
  Check one contrast rule and record or correct the outcome.

  @param {Array} rule - Triple of token name, background name, ratio
  @param {Number} index - Rule position, for error messages
  @param {Object} context - Resolution context

  @return {void}
  *********************************************************************/
  applyOneContrastRule: function (rule, index, context) {

    // A ratio above the representable maximum can never be satisfied
    const min_ratio = Lib.Utils.isNumber(rule[2]) ? rule[2] : context.min_contrast_ratio;
    Validators.assertContrastRatio(min_ratio, 'template.contrast_rules[' + index + '][2]');

    // Only a pair of resolved colour strings can be measured
    const before = context.resolved[rule[0]];
    const against = context.resolved[rule[1]];

    if (!Lib.Utils.isString(before) || !Lib.Utils.isString(against)) {
      return;
    }

    // A compliant pair needs no record at all
    const ratio_before = Color.contrastRatio(before, against);

    if (ratio_before >= min_ratio) {
      return;
    }

    // Find the replacement once, then decide whether policy applies it
    const suggestion = Color.correctForContrast(before, against, min_ratio, context.palette);

    context.violations.push({
      token: rule[0],
      against: rule[1],
      value: before,
      ratio: Number(ratio_before.toFixed(2)),
      required: min_ratio,
      suggested: suggestion.value,
      strategy: suggestion.strategy
    });

    // Reporting mode stops here, leaving the failing value in place
    if (context.contrast_mode !== 'correct') {
      return;
    }

    // Correcting mode rewrites the token and records what changed
    context.resolved[rule[0]] = suggestion.value;

    context.corrections.push({
      token: rule[0],
      from: before,
      to: suggestion.value,
      strategy: suggestion.strategy,
      ratio_before: Number(ratio_before.toFixed(2)),
      ratio_after: Number(Color.contrastRatio(suggestion.value, against).toFixed(2))
    });

  },


  // ~~~~~~~~~~~~~~~~~~~~ Entry Shape Tests ~~~~~~~~~~~~~~~~~~~~
  // Which of the six routes an entry declares. Order matters at the call site,
  // because a type set and a shadow are both plain objects.

  /********************************************************************
  Report whether an entry is an alias reference.

  @param {*} entry - Template entry

  @return {Boolean} - True when the entry names another token
  *********************************************************************/
  isAlias: function (entry) {

    // Braces are the alias marker, chosen so a hex literal can never collide
    return Lib.Utils.isString(entry) && entry.charAt(0) === '{' && entry.charAt(entry.length - 1) === '}';

  },


  /********************************************************************
  Report whether an entry is a rule.

  @param {*} entry - Template entry

  @return {Boolean} - True when the entry names an operation
  *********************************************************************/
  isRule: function (entry) {

    // A rule is identified by carrying an operation name
    return Lib.Utils.isObject(entry) && !Array.isArray(entry) && Lib.Utils.isString(entry.op);

  },


  /********************************************************************
  Report whether an entry is a generator.

  @param {*} entry - Template entry

  @return {Boolean} - True when the entry names a scale
  *********************************************************************/
  isGenerator: function (entry) {

    // A generator is identified by naming the scale it draws from
    return Lib.Utils.isObject(entry) && !Array.isArray(entry) && Lib.Utils.isString(entry.scale) && entry.type_set !== true;

  },


  /********************************************************************
  Report whether an entry is a type set.

  @param {*} entry - Template entry

  @return {Boolean} - True when the entry declares a type set
  *********************************************************************/
  isTypeSet: function (entry) {

    // An explicit marker, because a type set and a generator both name a scale
    return Lib.Utils.isObject(entry) && entry.type_set === true;

  },


  /********************************************************************
  Report whether an entry is a shadow.

  @param {*} entry - Template entry

  @return {Boolean} - True when the entry declares a shadow
  *********************************************************************/
  isShadow: function (entry) {

    // An explicit marker, because a shadow and a type set are both plain objects
    return Lib.Utils.isObject(entry) && entry.shadow === true;

  },


  /********************************************************************
  Report whether an entry is a literal value.

  @param {*} entry - Template entry

  @return {Boolean} - True when the entry is a directly usable value
  *********************************************************************/
  isLiteral: function (entry) {

    // Anything scalar that reached here is its own value
    return Lib.Utils.isString(entry) || Lib.Utils.isNumber(entry) || Lib.Utils.isBoolean(entry) || Array.isArray(entry);

  }

};/////////////////////////// Private Functions END /////////////////////////////



/////////////////////////// Operations START ///////////////////////////////////
const _Operations = {

  /********************************************************************
  Step a fixed distance along the neutral ramp from the page
  background.

  Polarity aware: on a light theme it walks darker, on a dark theme
  it walks lighter, so one rule serves both.

  @param {Array} args - Operation arguments
  @param {Object} context - Resolution context

  @return {String} - Hex colour from the ramp
  *********************************************************************/
  rampStep: function (args, context) {

    // Walk away from the background, whichever direction that is for this polarity
    const direction = (context.polarity === 'light') ? 1 : -1;
    const target = context.anchor_index + (args[0] * direction);

    // Clamp so a deep step saturates at the end of the ramp instead of failing
    const clamped = Math.max(0, Math.min(context.ramp.length - 1, target));

    return context.ramp[clamped];

  },


  /********************************************************************
  Read a named step from a palette hue family.

  @param {Array} args - Family name and step number
  @param {Object} context - Resolution context

  @return {String} - Hex colour from the palette
  *********************************************************************/
  hue: function (args, context) {

    // Compose the palette key the two arguments name
    const key = args[0] + args[1];

    // A missing entry means the template names a colour its palette lacks
    if (!context.palette[key]) {
      Validators.fail('template.palette.' + key, ERRORS.MUST_BE_DECLARED_TOKEN);
    }

    return context.palette[key];

  },


  /********************************************************************
  Blend two resolved tokens.

  @param {Array} args - Two token references and a weight
  @param {Object} context - Resolution context

  @return {String} - Blended hex colour
  *********************************************************************/
  mix: function (args, context) {

    // Both operands resolve through the same chain, so either may itself be derived
    const a = _Resolve.resolveToken(args[0], context);
    const b = _Resolve.resolveToken(args[1], context);

    return Color.mix(a, b, args[2]);

  },


  /********************************************************************
  Scale an already-resolved numeric token.

  @param {Array} args - Token reference and multiplier
  @param {Object} context - Resolution context

  @return {Number} - The scaled value
  *********************************************************************/
  scaleBy: function (args, context) {

    // Resolving first lets a density variant scale a generated value
    return _Resolve.resolveToken(args[0], context) * args[1];

  }

};/////////////////////////// Operations END ////////////////////////////////////
