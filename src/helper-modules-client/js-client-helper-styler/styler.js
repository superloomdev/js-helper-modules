// Info: Styler — the label-agnostic core of the js-client-helper-styler package. Pure
// derivation logic with zero external dependencies. It knows nothing about
// "primary" or "xs"; it orchestrates three pure PARTS:
//   - parts/color-ops : mix / lighten / darken / contrast / pseudo-states
//   - parts/scale     : modular (ratio) and linear (unit multiples) builders
//   - parts/utilities : an assembled theme -> atomic utility styles
// A TEMPLATE (styler.template.js) describes WHICH tokens exist and HOW each is
// derived; Styler interprets that template against a SCHEME's values
// (base + variant) to produce a theme: { Color, Dimension, Font }.
//
// Compatibility: Node.js 18+ and React Native (Hermes). No React, no DOM.
//
// Loader pattern: SINGLETON. The public (Styler) and private (_Styler) objects
// live at module scope; the loader injects Lib + config, initializes ERRORS +
// Validators, and builds the pure parts (color-ops, scale, utilities), attaching
// their interfaces to the public object. Node's require cache guarantees one
// Styler per process. Only Lib.Debug is used — for assembly logging at DEBUG
// level (verbosity is the logger's own level threshold, not a flag).
'use strict';


// Injected dependencies + sibling modules, set by the loader (module-scope).
let Lib;        // shared_libs container (Lib.Debug used for assembly logging)
let CONFIG;     // merged config; passed to parts (no knobs consumed today)
let ERRORS;     // frozen error catalog
let Validators; // validators module, initialized with Lib

// Pure stateless parts, built by the loader (module-scope).
const Parts = {};  // { colorOps, scale, utilities } — populated in loader


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib, merges config, initializes ERRORS +
Validators (subloader), builds the pure parts, and returns the
module-scope Styler object with the part interfaces attached.

@param {Object} shared_libs - Lib container (uses shared_libs.Debug if present)
@param {Object} config - Overrides merged over module config defaults

@return {Object} - Public Styler interface
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Capture injected deps and merge config over module defaults
  Lib = shared_libs || {};
  CONFIG = Object.assign({}, require('./styler.config'), config || {});
  ERRORS = require('./styler.errors');

  // Build the validators subloader (fails fast on a malformed template)
  Validators = require('./styler.validators')(Lib);

  // Build the pure parts with the uniform (Lib, CONFIG, ERRORS) signature
  Parts.colorOps = require('./parts/color-ops')(Lib, CONFIG, ERRORS);
  Parts.scale = require('./parts/scale')(Lib, CONFIG, ERRORS);
  Parts.utilities = require('./parts/utilities')(Lib, CONFIG, ERRORS);

  // Attach the default template so consumers can use Styler.defaultTemplate directly
  Styler.defaultTemplate = require('./styler.template.js');

  // Expose generateUtilities from the utilities part
  Styler.generateUtilities = Parts.utilities.generateUtilities;

  return Styler;

};/////////////////////////// Module-Loader END ////////////////////////////////



/////////////////////////// Public Functions START /////////////////////////////
const Styler = { // Public derivation interface accessible by other modules


  // ~~~~~~~~~~~~~~~~~~~~ Derivation ~~~~~~~~~~~~~~~~~~~~
  // Interpret a template against theme values to produce { Color, Dimension, Font }.

  /********************************************************************
  Derive the Color token map from a template + a theme's color values.

  @param {Object} color_template - { defaults, swatches } from a template
  @param {Object} color_values   - the theme's color values (+ optional overrides)

  @return {Object} - flat map of UPPER_SNAKE color tokens
  *********************************************************************/
  deriveColor: function (color_template, color_values) {

    // Default both inputs so a partial template still derives
    color_template = color_template || {};
    color_values = color_values || {};

    // Template defaults provide a complete seed; theme values override them
    const values = Object.assign({}, color_template.defaults, color_values);
    const swatches = color_template.swatches || {};

    // Run every swatch rule (ref or operation) against the resolved values
    const Color = {};
    Object.keys(swatches).forEach(function (token) {
      Color[token] = _Styler.applyColorRule(swatches[token], values);
    });

    // Explicit per-token overrides win over anything derived above
    return Object.assign(Color, color_values.overrides || {});

  },


  /********************************************************************
  Derive the Dimension object from a template + a theme's dimension values.

  @param {Object} dimension_template - { defaults, scales, constants } from a template
  @param {Object} dimension_values   - the theme's dimension values

  @return {Object} - { <scale_name>: {...}, ...constants keys }
  *********************************************************************/
  deriveDimension: function (dimension_template, dimension_values) {

    // Default both inputs so a partial template still derives
    dimension_template = dimension_template || {};
    dimension_values = dimension_values || {};

    // Template defaults provide the seed numbers; theme values override them
    const values = Object.assign({}, dimension_template.defaults, dimension_values);
    const scales = dimension_template.scales || {};
    const out = {};

    // Build each named scale from its seed values per its declared type
    Object.keys(scales).forEach(function (scale_name) {
      const scale = scales[scale_name];
      let built;
      if (scale.type === 'modular') {
        built = Parts.scale.modular(values[scale.base], values[scale.ratio], scale.steps);
      } else if (scale.type === 'linear') {
        built = Parts.scale.linear(values[scale.unit], scale.steps);
      } else {
        throw _Styler.fail(ERRORS.SCALE_TYPE_UNKNOWN, '("' + scale.type + '")');
      }

      // Preset (non-derived) entries, then explicit per-step overrides win
      built = Object.assign(built, scale.presets || {}, dimension_values[scale_name] || {});
      out[scale_name] = built;
    });

    // Copy scalar constants straight through (e.g. lineHeightRatio)
    (dimension_template.constants || []).forEach(function (key) {
      out[key] = values[key];
    });

    return out;

  },


  /********************************************************************
  Derive the Font object from a template + a theme's font values.

  @param {Object} font_template - { defaults, roles } from a template
  @param {Object} font_values   - the theme's font values

  @return {Object} - { family: { <role>: name }, weight: {...} }
  *********************************************************************/
  deriveFont: function (font_template, font_values) {

    // Default both inputs so a partial template still derives
    font_template = font_template || {};
    font_values = font_values || {};

    // Template defaults provide the seed; theme values override them
    const values = Object.assign({}, font_template.defaults, font_values);
    const roles = font_template.roles || ['primary'];

    // Each role falls back to the previous role's family, then 'System', so a
    // theme can register just the families it cares about
    const family = {};
    let previous = null;
    roles.forEach(function (role) {
      const name = values[role + 'Family'];
      const resolved = !_Styler.isEmpty(name) ? name : (previous || 'System');
      family[role] = resolved;
      previous = resolved;
    });

    // Weight fallback chain: each weight borrows the nearest provided weight
    const provided = values.weight || {};
    const regular = provided.regular || '400';
    const medium = provided.medium || regular;
    const semibold = provided.semibold || provided.medium || '600';
    const bold = provided.bold || provided.semibold || '700';

    return {
      family: family,
      weight: { regular: regular, medium: medium, semibold: semibold, bold: bold }
    };

  },


  /********************************************************************
  Merge a base theme with a variant theme (variant wins). Merge is
  per-group shallow so a variant can override individual values without
  re-stating the whole theme.

  @param {Object} base    - complete fallback theme values
  @param {Object} variant - partial override values

  @return {Object} - merged theme values { color, dimension, font }
  *********************************************************************/
  extend: function (base, variant) {

    // Default both inputs so a missing variant is a no-op merge
    base = base || {};
    variant = variant || {};

    // Shallow-merge each group so a variant overrides individual values
    return {
      color: Object.assign({}, base.color, variant.color),
      dimension: Object.assign({}, base.dimension, variant.dimension),
      font: Object.assign({}, base.font, variant.font)
    };

  },


  /********************************************************************
  Derive the full token system from a template and a single set of theme
  values (already merged; for base + variant use assemble()).

  @param {Object} template - { color, dimension, font } template
  @param {Object} values   - { color, dimension, font } theme values

  @return {Object} - { Color, Dimension, Font }
  *********************************************************************/
  derive: function (template, values) {

    // Default both inputs so a partial call still derives
    template = template || {};
    values = values || {};

    // Each group is derived independently from its own template + values
    const Color = Styler.deriveColor(template.color, values.color || {});
    const Dimension = Styler.deriveDimension(template.dimension, values.dimension || {});
    const Font = Styler.deriveFont(template.font, values.font || {});

    // Emit a debug summary of the assembled theme
    _Styler.logAssembly(Color, Dimension);

    return { Color: Color, Dimension: Dimension, Font: Font };

  },


  /********************************************************************
  Convenience: extend(base, variant) then derive(template, merged).
  This is the one call a host typically makes per app shape.

  @param {Object} template - the template to fill
  @param {Object} base     - complete base theme values
  @param {Object} variant  - partial variant values (wins over base)

  @return {Object} - { Color, Dimension, Font }
  *********************************************************************/
  assemble: function (template, base, variant) {

    // Fail fast on a malformed template before any derivation runs
    Validators.validateTemplate(template);

    // Merge base + variant, then derive the full token system
    return Styler.derive(template, Styler.extend(base, variant));

  }

};/////////////////////////// Public Functions END //////////////////////////////



/////////////////////////// Private Functions START ////////////////////////////
const _Styler = { // Private helpers accessible within this module only


  // ~~~~~~~~~~~~~~~~~~~~ Color Rule Resolution ~~~~~~~~~~~~~~~~~~~~
  // Turn a template swatch rule (ref or operation) into a concrete hex color.

  /********************************************************************
  Resolve a single color-rule argument. A number is a literal weight; a
  string is looked up in the resolved value map, falling back to itself
  (so a literal '#FFFFFF' may be passed inline).

  @param {String|Number} arg    - raw argument from a swatch rule
  @param {Object}        values - resolved value map (defaults + theme)

  @return {String|Number} - looked-up value, inline literal, or number
  *********************************************************************/
  resolveColorArg: function (arg, values) {

    // A number is a literal weight, passed straight through
    if (typeof arg === 'number') {
      return arg;
    }

    // A known value name resolves to its value
    if (Object.prototype.hasOwnProperty.call(values, arg)) {
      return values[arg];
    }

    // Otherwise treat the string as an inline literal (e.g. '#FFFFFF')
    return arg;

  },


  /********************************************************************
  Apply one color swatch rule against the resolved values:
    { ref: 'primary' }                                -> copy a value
    { operation: 'mix', args: ['primary', 'bg', 12] } -> run a named ColorOp

  @param {Object} rule   - swatch rule ({ ref } or { operation, args })
  @param {Object} values - resolved value map (defaults + theme)

  @throws {Error} OPERATION_UNKNOWN when the named operation is missing
  @return {String} - the resulting hex color
  *********************************************************************/
  applyColorRule: function (rule, values) {

    // A `ref` rule simply copies a resolved value
    if (rule.ref !== undefined) {
      return _Styler.resolveColorArg(rule.ref, values);
    }

    // Otherwise look up the named color operation in the colorOps part
    const operation = Parts.colorOps[rule.operation];
    if (typeof operation !== 'function') {
      throw _Styler.fail(ERRORS.OPERATION_UNKNOWN, '("' + rule.operation + '")');
    }

    // Resolve each argument, then run the operation
    const args = (rule.args || []).map(function (arg) {
      return _Styler.resolveColorArg(arg, values);
    });
    return operation.apply(null, args);

  },


  // ~~~~~~~~~~~~~~~~~~~~ Guards & Errors ~~~~~~~~~~~~~~~~~~~~
  // Small value guards and the coded-error builder.

  /********************************************************************
  Treat undefined / null / empty string as "not provided".

  @param {*} value - value to test

  @return {Boolean} - true when undefined, null, or ''
  *********************************************************************/
  isEmpty: function (value) {

    // Empty means absent or a blank string
    return value === undefined || value === null || value === '';

  },


  /********************************************************************
  Build an Error carrying a stable .code from the error catalog, so
  callers can branch on `code` rather than message text.

  @param {Object} err    - catalog entry { code, message }
  @param {String} detail - optional context appended to the message

  @return {Error} - Error instance with .code set
  *********************************************************************/
  fail: function (err, detail) {

    // Append optional detail, then carry the stable code
    const error = new Error(detail ? err.message + ' ' + detail : err.message);
    error.code = err.code;
    return error;

  },


  // ~~~~~~~~~~~~~~~~~~~~ Logging ~~~~~~~~~~~~~~~~~~~~
  // Optional assembly summary via the injected Lib.Debug.

  /********************************************************************
  Log an assembly summary via the injected Lib.Debug at DEBUG level, so
  the logger's own level threshold controls verbosity (raise it to
  silence). No-op when no Lib.Debug is injected.

  @param {Object} Color     - the derived Color token map
  @param {Object} Dimension - the derived Dimension object

  @return {void}
  *********************************************************************/
  logAssembly: function (Color, Dimension) {

    // Skip entirely when no logger was injected
    if (Lib.Debug && typeof Lib.Debug.debug === 'function') {
      Lib.Debug.debug('Theme assembled', {
        primary: Color.APP_PRIMARY,
        fontMd: Dimension.fontSize ? Dimension.fontSize.md : undefined
      });
    }

  }

};/////////////////////////// Private Functions END ////////////////////////////
