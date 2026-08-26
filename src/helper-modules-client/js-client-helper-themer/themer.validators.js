// Info: Validators for helper-themer.
//
// Receives Lib and ERRORS by injection from the loader.
// Never self-requires the error catalog or data files.
//
// This module is a pure engine, so every validator throws rather than
// returning an error object: a malformed template or a bad argument can only
// reach the engine through a caller bug. A host that accepts a theme document
// from a network response validates it before handing it here.


// Shared dependency injected by loader
let Lib;

// Error catalog injected by loader (never self-required)
let ERRORS;

// Findings accumulator. Null means throwing mode, which is what resolution
// uses: the first bad field is the one worth naming. An array means collecting
// mode, which is what a build tool checking a theme package wants, because a
// list of every problem beats one problem discovered five times in a row.
let collector = null;


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Module-root singleton loader. Assigns the injected Lib and error
catalog to module scope and returns the shared Validators object.

@param {Object} shared_libs - Lib container with Utils
@param {Object} errors - Frozen error catalog owned by the main module

@return {Object} - Public Validators interface
*********************************************************************/
export default function loader (shared_libs, errors) {

  // Assign injected dependencies so the public object can close over them
  Lib = shared_libs;
  ERRORS = errors;

  return Validators;

};/////////////////////////// Module-Loader END /////////////////////////////////



/////////////////////////// Public Functions START /////////////////////////////
const Validators = {


  // ~~~~~~~~~~~~~~~~~~~~ Load Time ~~~~~~~~~~~~~~~~~~~~
  // Runs once per loader call, before any derivation happens.

  /********************************************************************
  Validate the merged config object. Throws on any misconfiguration
  so the module fails at startup rather than at first render.

  @param {Object} CONFIG - Merged config for this instance

  @return {void}
  *********************************************************************/
  validateConfig: function (CONFIG) {

    // A wrong root size silently rescales every rem the web emitter produces
    if (!Lib.Utils.isNumber(CONFIG.BASE_FONT_SIZE) || CONFIG.BASE_FONT_SIZE <= 0) {
      _Validators.fail('CONFIG.BASE_FONT_SIZE', ERRORS.MUST_BE_POSITIVE_NUMBER);
    }

    // A capacity below one would evict the entry it just stored
    if (!Lib.Utils.isNumber(CONFIG.CACHE_CAPACITY) || CONFIG.CACHE_CAPACITY < 1 || Math.floor(CONFIG.CACHE_CAPACITY) !== CONFIG.CACHE_CAPACITY) {
      _Validators.fail('CONFIG.CACHE_CAPACITY', ERRORS.MUST_BE_CACHE_CAPACITY);
    }

    // Guard the toggle so a truthy string does not read as an enabled cache
    if (!Lib.Utils.isBoolean(CONFIG.CACHE_ENABLED)) {
      _Validators.fail('CONFIG.CACHE_ENABLED', ERRORS.MUST_BE_BOOLEAN);
    }

    // Ratios outside the representable range make the correction pass unsatisfiable
    if (!Lib.Utils.isNumber(CONFIG.MIN_CONTRAST_RATIO) || CONFIG.MIN_CONTRAST_RATIO < 1 || CONFIG.MIN_CONTRAST_RATIO > 21) {
      _Validators.fail('CONFIG.MIN_CONTRAST_RATIO', ERRORS.MUST_BE_CONTRAST_RATIO);
    }

  },


  // ~~~~~~~~~~~~~~~~~~~~ Reporting ~~~~~~~~~~~~~~~~~~~~
  // The build-time surface, which gathers findings instead of raising them.

  /********************************************************************
  Run the template checks in collecting mode and return every
  finding rather than throwing on the first.

  @param {*} template - Value to check as a template

  @return {Object} - Check result
  @return {Boolean} .success - True when no finding was recorded
  @return {String[]} .errors - Every finding, in the order found
  *********************************************************************/
  checkTemplate: function (template) {

    // A non-object has no fields to go on checking, so it is reported alone
    if (!Lib.Utils.isObject(template)) {

      return {
        success: false,
        errors: ['[helper-themer] template ' + ERRORS.MUST_BE_PLAIN_OBJECT]
      };

    }

    // Divert failures into a list for the duration of this call
    const found = [];
    collector = found;

    // Restore throwing mode whatever happens, so one bad call cannot leave the
    // module collecting and turn a later resolve into a silent pass
    try {

      // Reuse the same checks the throwing path runs, so the two cannot diverge
      Validators.validateTemplate(template);

    } finally {

      collector = null;

    }

    return {
      success: (found.length === 0),
      errors: found
    };

  },


  // ~~~~~~~~~~~~~~~~~~~~ Per Call ~~~~~~~~~~~~~~~~~~~~
  // Runs on every public call, before the engine reads the argument.

  /********************************************************************
  Validate the structural shape of a template. Checks the sections
  the engine reads, not the meaning of individual token entries;
  entry-level rules are enforced during resolution where the token
  name is known.

  @param {*} template - Value to validate as a template

  @return {void}
  *********************************************************************/
  validateTemplate: function (template) {

    // Reject a missing or non-object template before any property read
    if (!Lib.Utils.isObject(template)) {
      _Validators.fail('template', ERRORS.MUST_BE_PLAIN_OBJECT);
    }

    // The token map is the one section the engine cannot derive without
    if (!Lib.Utils.isObject(template.tokens)) {
      _Validators.fail('template.tokens', ERRORS.MUST_BE_PLAIN_OBJECT);
    }

    // Metadata drives platform availability and emitter selection
    if (!Lib.Utils.isNullOrUndefined(template.meta) && !Lib.Utils.isObject(template.meta)) {
      _Validators.fail('template.meta', ERRORS.MUST_BE_PLAIN_OBJECT);
    }

    // Scale seeds feed every generator entry
    if (!Lib.Utils.isNullOrUndefined(template.scales) && !Lib.Utils.isObject(template.scales)) {
      _Validators.fail('template.scales', ERRORS.MUST_BE_PLAIN_OBJECT);
    }

    // The palette is the operand pool for hue and contrast rules
    if (!Lib.Utils.isNullOrUndefined(template.palette) && !Lib.Utils.isObject(template.palette)) {
      _Validators.fail('template.palette', ERRORS.MUST_BE_PLAIN_OBJECT);
    }

    // Validate the nested base size here so a bad seed fails before resolution
    if (Lib.Utils.isObject(template.scales) && !Lib.Utils.isNullOrUndefined(template.scales.base_font_size)) {
      Validators.assertPositiveNumber(template.scales.base_font_size, 'template.scales.base_font_size');
    }

  },


  /********************************************************************
  Validate a layer stack. Each layer is a sparse overlay applied in
  array order, so a malformed entry would silently skip its pins.

  @param {*} layers - Value to validate as a layer array

  @return {void}
  *********************************************************************/
  validateLayers: function (layers) {

    // The cascade is ordered, so the argument must be an array and not a map
    if (!Array.isArray(layers)) {
      _Validators.fail('layers', ERRORS.MUST_BE_LAYER_ARRAY);
    }

    // Check each entry so the failure names the offending index
    for (let i = 0; i < layers.length; i++) {

      if (!Lib.Utils.isObject(layers[i])) {
        _Validators.fail('layers[' + i + ']', ERRORS.MUST_BE_PLAIN_OBJECT);
      }

    }

  },


  /********************************************************************
  Validate the per-call options bundle.

  @param {*} options - Value to validate as an options object

  @return {void}
  *********************************************************************/
  validateOptions: function (options) {

    // Absent options are legitimate: every key has a config-level default
    if (Lib.Utils.isNullOrUndefined(options)) {
      return;
    }

    // Reject a non-object so a misplaced positional argument fails loudly
    if (!Lib.Utils.isObject(options)) {
      _Validators.fail('options', ERRORS.MUST_BE_PLAIN_OBJECT);
    }

    // An unsatisfiable ratio would loop the correction pass to no purpose
    if (!Lib.Utils.isNullOrUndefined(options.min_contrast_ratio)) {
      Validators.assertContrastRatio(options.min_contrast_ratio, 'options.min_contrast_ratio');
    }

    // The motion factor scales durations, so it is a proportion by definition
    if (!Lib.Utils.isNullOrUndefined(options.motion_factor)) {
      Validators.assertUnitInterval(options.motion_factor, 'options.motion_factor');
    }

  },


  /********************************************************************
  Validate a platform name against the emitters this engine ships.

  @param {*} platform - Value to validate as a platform name

  @param {String[]} supported - Platform names the engine emits for

  @return {void}
  *********************************************************************/
  validatePlatform: function (platform, supported) {

    // An unknown platform would otherwise return a token map with no emitters applied
    if (!Lib.Utils.isString(platform) || supported.indexOf(platform) === -1) {
      _Validators.fail('platform', ERRORS.MUST_BE_PLATFORM);
    }

  },


  // ~~~~~~~~~~~~~~~~~~~~ Shared Assertions ~~~~~~~~~~~~~~~~~~~~
  // Called by the engine during resolution, where the token name is known.

  /********************************************************************
  Assert that a value is a number greater than zero.

  @param {*} value - Value to check
  @param {String} path - Dotted field path for the message

  @return {void}
  *********************************************************************/
  assertPositiveNumber: function (value, path) {

    // Reject NaN as well as non-numbers, which a raw typeof would admit
    if (!Lib.Utils.isNumber(value) || value <= 0) {
      _Validators.fail(path, ERRORS.MUST_BE_POSITIVE_NUMBER);
    }

  },


  /********************************************************************
  Assert that a value is a number of zero or greater.

  @param {*} value - Value to check
  @param {String} path - Dotted field path for the message

  @return {void}
  *********************************************************************/
  assertNonNegativeNumber: function (value, path) {

    // Zero is legitimate here, so the bound differs from the positive check
    if (!Lib.Utils.isNumber(value) || value < 0) {
      _Validators.fail(path, ERRORS.MUST_BE_NON_NEGATIVE_NUMBER);
    }

  },


  /********************************************************************
  Assert that a value is a proportion between 0 and 1 inclusive.

  @param {*} value - Value to check
  @param {String} path - Dotted field path for the message

  @return {void}
  *********************************************************************/
  assertUnitInterval: function (value, path) {

    // Values outside the interval would invert or overshoot the scaled duration
    if (!Lib.Utils.isNumber(value) || value < 0 || value > 1) {
      _Validators.fail(path, ERRORS.MUST_BE_UNIT_INTERVAL);
    }

  },


  /********************************************************************
  Assert that a value is a contrast ratio between 1 and 21 inclusive.

  @param {*} value - Value to check
  @param {String} path - Dotted field path for the message

  @return {void}
  *********************************************************************/
  assertContrastRatio: function (value, path) {

    // 21 is the maximum ratio any colour pair can reach, so above it never satisfies
    if (!Lib.Utils.isNumber(value) || value < 1 || value > 21) {
      _Validators.fail(path, ERRORS.MUST_BE_CONTRAST_RATIO);
    }

  },


  /********************************************************************
  Throw a programmer error naming a field and the rule it broke.
  Exposed so the engine raises failures in the same format the
  validators do.

  @param {String} path - Dotted field path that is wrong
  @param {String} rule - Expected-shape clause from the error catalog

  @return {void}
  *********************************************************************/
  fail: function (path, rule) {

    // Delegate so the message format lives in exactly one place
    _Validators.fail(path, rule);

  }

};/////////////////////////// Public Functions END //////////////////////////////



/////////////////////////// Private Functions START ////////////////////////////
const _Validators = {

  /********************************************************************
  Compose and throw a programmer-error message.

  The shape is the framework's programmer-error format: an alias
  prefix, the field path that is wrong, and the constraint it failed.

  @param {String} path - Dotted field path that is wrong
  @param {String} rule - Expected-shape clause from the error catalog

  @return {void}
  *********************************************************************/
  fail: function (path, rule) {

    // Compose once, so both modes report the identical wording
    const message = '[helper-themer] ' + path + ' ' + rule;

    // Collecting mode records and lets the remaining checks run
    if (collector) {
      collector.push(message);

      return;
    }

    // Throwing mode is the default, because a pure engine has no operational failures
    throw new TypeError(message);

  }

};/////////////////////////// Private Functions END /////////////////////////////
