// Info: Validators for helper-themer.
//
// Receives Lib and ERRORS by injection from the loader.
// Never self-requires the error catalog or data files.
//
// This module is a pure engine, so every validator throws rather than
// returning an error object: a malformed template or a bad argument can only
// reach the engine through a caller bug. A host that accepts a theme document
// from a network response validates it before handing it here.


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Module-root factory loader. Captures the injected Lib and error
catalog per instance and returns an isolated Validators object.

@param {Object} shared_libs - Lib container with Utils
@param {Object} errors - Frozen error catalog owned by the main module
@param {Object} color - Color part, used to parse ramp entries

@return {Object} - Public Validators interface
*********************************************************************/
export default function loader (shared_libs, errors, color) {

  // Assign injected dependencies so the public object can close over them
  const Lib = shared_libs;
  const ERRORS = errors;
  const Color = color;

  return createInterface(Lib, ERRORS, Color);

};/////////////////////////// Module-Loader END /////////////////////////////////



// Shared dependency injected by loader
// Error catalog injected by loader (never self-required)
// Color part injected by loader for ramp color parsing
const createInterface = function (Lib, ERRORS, Color) {

  // Findings accumulator. Null means throwing mode, which is what resolution
  // uses: the first bad field is the one worth naming. An array means collecting
  // mode, which is what a build tool checking a theme package wants, because a
  // list of every problem beats one problem discovered five times in a row.
  let collector = null;

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
      if (!Lib.Utils.isNumber(CONFIG.BASE_FONT_SIZE) || !Number.isFinite(CONFIG.BASE_FONT_SIZE) || CONFIG.BASE_FONT_SIZE <= 0) {
        _Validators.fail('CONFIG.BASE_FONT_SIZE', ERRORS.MUST_BE_POSITIVE_NUMBER);
      }

      // A capacity below one would evict the entry it just stored
      if (!Lib.Utils.isNumber(CONFIG.CACHE_CAPACITY) || !Number.isFinite(CONFIG.CACHE_CAPACITY) || CONFIG.CACHE_CAPACITY < 1 || Math.floor(CONFIG.CACHE_CAPACITY) !== CONFIG.CACHE_CAPACITY) {
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

      // DEFAULT_TYPE_SCALE must be a string naming a known generator after merge
      if (!Lib.Utils.isString(CONFIG.DEFAULT_TYPE_SCALE)) {
        _Validators.fail('CONFIG.DEFAULT_TYPE_SCALE', ERRORS.MUST_BE_KNOWN_SCALE);
      }

      // SCALE_GENERATORS must be a plain object of functions
      if (!Lib.Utils.isObject(CONFIG.SCALE_GENERATORS) || Array.isArray(CONFIG.SCALE_GENERATORS)) {
        _Validators.fail('CONFIG.SCALE_GENERATORS', ERRORS.MUST_BE_PLAIN_OBJECT);
      }
      const generatorKeys = Object.keys(CONFIG.SCALE_GENERATORS);
      for (let i = 0; i < generatorKeys.length; i++) {
        if (!Lib.Utils.isFunction(CONFIG.SCALE_GENERATORS[generatorKeys[i]])) {
          _Validators.fail('CONFIG.SCALE_GENERATORS.' + generatorKeys[i], ERRORS.MUST_BE_KNOWN_SCALE);
        }
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
        success: Lib.Utils.isEmptyArray(found),
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
      if (!Lib.Utils.isObject(template) || Array.isArray(template)) {
        _Validators.fail('template', ERRORS.MUST_BE_PLAIN_OBJECT);
      }

      // The token map is the one section the engine cannot derive without
      if (!Lib.Utils.isObject(template.tokens) || Array.isArray(template.tokens)) {
        _Validators.fail('template.tokens', ERRORS.MUST_BE_PLAIN_OBJECT);
      }

      // Metadata drives platform availability and emitter selection
      if (!Lib.Utils.isNullOrUndefined(template.meta) && (!Lib.Utils.isObject(template.meta) || Array.isArray(template.meta))) {
        _Validators.fail('template.meta', ERRORS.MUST_BE_PLAIN_OBJECT);
      }

      // Scale seeds feed every generator entry
      if (!Lib.Utils.isNullOrUndefined(template.scales) && (!Lib.Utils.isObject(template.scales) || Array.isArray(template.scales))) {
        _Validators.fail('template.scales', ERRORS.MUST_BE_PLAIN_OBJECT);
      }

      // The palette is the operand pool for hue and contrast rules
      if (!Lib.Utils.isNullOrUndefined(template.palette) && (!Lib.Utils.isObject(template.palette) || Array.isArray(template.palette))) {
        _Validators.fail('template.palette', ERRORS.MUST_BE_PLAIN_OBJECT);
      }

      // The ramp is the ordered neutral scale for ramp-relative rules
      if (!Lib.Utils.isNullOrUndefined(template.ramp)) {
        if (!Array.isArray(template.ramp) || Lib.Utils.isEmptyArray(template.ramp)) {
          _Validators.fail('template.ramp', ERRORS.MUST_BE_NON_EMPTY_ARRAY);
        }
        for (let i = 0; i < template.ramp.length; i++) {
          if (!Lib.Utils.isString(template.ramp[i]) || !_Validators.isParsableColor(template.ramp[i])) {
            _Validators.fail('template.ramp[' + i + ']', ERRORS.MUST_BE_COLOR);
          }
        }
      }

      // Polarity must be exactly light or dark when present
      if (!Lib.Utils.isNullOrUndefined(template.polarity)) {
        if (template.polarity !== 'light' && template.polarity !== 'dark') {
          _Validators.fail('template.polarity', ERRORS.MUST_BE_KNOWN_POLARITY);
        }
      }

      // Contrast rules must be an array of [String, String, Number?]
      if (!Lib.Utils.isNullOrUndefined(template.contrast_rules)) {
        if (!Array.isArray(template.contrast_rules)) {
          _Validators.fail('template.contrast_rules', ERRORS.MUST_BE_VALID_CONTRAST_RULE);
        }
        for (let i = 0; i < template.contrast_rules.length; i++) {
          const rule = template.contrast_rules[i];
          if (!Array.isArray(rule) || rule.length < 2 || rule.length > 3
            || !Lib.Utils.isString(rule[0]) || !Lib.Utils.isString(rule[1])
            || (rule.length === 3 && !Lib.Utils.isNumber(rule[2]))
            || !Object.prototype.hasOwnProperty.call(template.tokens, rule[0])
            || !Object.prototype.hasOwnProperty.call(template.tokens, rule[1])) {
            _Validators.fail('template.contrast_rules[' + i + ']', ERRORS.MUST_BE_VALID_CONTRAST_RULE);
          }
        }
      }

      // Validate the nested base size here so a bad seed fails before resolution
      if (Lib.Utils.isObject(template.scales) && !Array.isArray(template.scales) && !Lib.Utils.isNullOrUndefined(template.scales.base_font_size)) {
        Validators.assertPositiveNumber(template.scales.base_font_size, 'template.scales.base_font_size');
      }

    },


    /********************************************************************
    Validate that every token metadata entry names a known emitter group.
    Collects the whole offending set before throwing so one boot reports
    every gap rather than one per run.

    @param {Object} meta - Template metadata map (token name to entry)
    @param {String[]} knownGroups - Emitter group names the engine provides

    @return {void}
    *********************************************************************/
    validateGroups: function (meta, knownGroups) {

      // No metadata means every token defaults to raw, which is always valid
      if (Lib.Utils.isNullOrUndefined(meta)) {
        return;
      }

      // Collect every token whose group is not recognized, naming them all at once
      const unknown = [];

      const names = Object.keys(meta);

      for (let i = 0; i < names.length; i++) {

        const entry = meta[names[i]];

        // An entry without a group defaults to raw, which is always valid
        if (Lib.Utils.isNullOrUndefined(entry) || Lib.Utils.isNullOrUndefined(entry.group)) {
          continue;
        }

        // A non-string group is a defect the resolution would also catch,
        // but naming it here gives the field path before resolution begins
        if (!Lib.Utils.isString(entry.group)) {
          unknown.push(names[i] + ' (group: ' + String(entry.group) + ')');
          continue;
        }

        if (knownGroups.indexOf(entry.group) === -1) {
          unknown.push(names[i] + ' (group: ' + entry.group + ')');
        }

      }

      // Report the complete unknown set in one throw
      if (!Lib.Utils.isEmptyArray(unknown)) {
        throw new TypeError(
          '[helper-themer] tokens ' + unknown.join(', ') + ' ' + ERRORS.MUST_BE_KNOWN_GROUP
        );
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

        if (!Lib.Utils.isObject(layers[i]) || Array.isArray(layers[i])) {
          _Validators.fail('layers[' + i + ']', ERRORS.MUST_BE_PLAIN_OBJECT);
        }

        // Polarity in a layer must be exactly light or dark when present
        if (!Lib.Utils.isNullOrUndefined(layers[i].polarity)) {
          if (layers[i].polarity !== 'light' && layers[i].polarity !== 'dark') {
            _Validators.fail('layers[' + i + '].polarity', ERRORS.MUST_BE_KNOWN_POLARITY);
          }
        }

        // Token pins must be a plain object, never an array
        if (!Lib.Utils.isNullOrUndefined(layers[i].tokens) && (!Lib.Utils.isObject(layers[i].tokens) || Array.isArray(layers[i].tokens))) {
          _Validators.fail('layers[' + i + '].tokens', ERRORS.MUST_BE_PLAIN_OBJECT);
        }

        const scales = layers[i].scales;
        if (Lib.Utils.isNullOrUndefined(scales)) {
          continue;
        }
        if (!Lib.Utils.isObject(scales) || Array.isArray(scales)) {
          _Validators.fail('layers[' + i + '].scales', ERRORS.MUST_BE_PLAIN_OBJECT);
        }
        for (const name of Object.keys(scales)) {
          const path = 'layers[' + i + '].scales.' + name;
          if (name === 'base_font_size') {
            Validators.assertPositiveNumber(scales[name], path);
          } else if (!Lib.Utils.isObject(scales[name]) || Array.isArray(scales[name])) {
            _Validators.fail(path, ERRORS.MUST_BE_PLAIN_OBJECT);
          }
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
      if (!Lib.Utils.isObject(options) || Array.isArray(options)) {
        _Validators.fail('options', ERRORS.MUST_BE_PLAIN_OBJECT);
      }

      // Every option key is one of three; anything else is a caller bug and fails by name
      for (const key of Object.keys(options)) {
        if (key !== 'contrast' && key !== 'min_contrast_ratio' && key !== 'motion_factor') {
          _Validators.fail('options.' + key, ERRORS.MUST_BE_KNOWN_OPTION);
        }
      }

      // An unsatisfiable ratio would loop the correction pass to no purpose
      if (!Lib.Utils.isNullOrUndefined(options.min_contrast_ratio)) {
        Validators.assertContrastRatio(options.min_contrast_ratio, 'options.min_contrast_ratio');
      }

      // The motion factor scales durations, so it is a proportion by definition
      if (!Lib.Utils.isNullOrUndefined(options.motion_factor)) {
        Validators.assertUnitInterval(options.motion_factor, 'options.motion_factor');
      }

      // Contrast mode must be correct or report when present
      if (options.contrast !== undefined && options.contrast !== 'correct' && options.contrast !== 'report') {
        _Validators.fail('options.contrast', ERRORS.MUST_BE_KNOWN_CONTRAST_MODE);
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


    // ~~~~~~~~~~~~~~~~~~~~ Contract Validation ~~~~~~~~~~~~~~~~~~~~
    // Checking a theme against the Superloom token contract.

    /********************************************************************
    Validate a resolved theme against the token contract.

    Returns { success, errors, warnings }. Throws TypeError when
    theme, theme.tokens, options.required, or options.supported is malformed; reports
    every content finding.

    - Missing required tokens produce CONTRACT_MISSING_TOKEN errors.
    - Unknown tokens produce CONTRACT_UNKNOWN_TOKEN errors.
    - Invalid literal values produce CONTRACT_INVALID_VALUE errors.
    - Unsupported tokens produce CONTRACT_UNSUPPORTED_TOKEN warnings
      when options.supported is supplied. Warnings do not affect success.
    - Alias strings are accepted for any type without type checking.
    - Rule and generator objects are accepted for color, number, and
      typeSet types without checking generated output.

    @param {Object} theme - A theme object with a tokens map
    @param {Object} [options] - Validation options
    @param {String[]} [options.required] - Token names that must be present
    @param {String[]} [options.supported] - Token names this consumer supports
    @param {Object} contract - The contract registry from themer.contract.js

    @return {Object} - Validation result
    @return {Boolean} .success - True when errors is empty
    @return {Object[]} .errors - One entry per contract error
    @return {Object[]} .warnings - One entry per unsupported token warning
    *********************************************************************/
    validateContract: function (theme, options, contract) {

      // Argument shape is a caller bug, so it throws; content findings are reported
      if (!Lib.Utils.isObject(theme) || Array.isArray(theme)) {
        _Validators.fail('theme', ERRORS.MUST_BE_PLAIN_OBJECT);
      }
      if (!Lib.Utils.isObject(theme.tokens) || Array.isArray(theme.tokens)) {
        _Validators.fail('theme.tokens', ERRORS.MUST_BE_PLAIN_OBJECT);
      }
      const opts = options || {};
      if (!Lib.Utils.isObject(opts) || Array.isArray(opts)) {
        _Validators.fail('options', ERRORS.MUST_BE_PLAIN_OBJECT);
      }
      if (opts.required !== undefined && !_Validators.isStringArray(opts.required)) {
        _Validators.fail('options.required', ERRORS.MUST_BE_STRING_ARRAY);
      }
      if (opts.supported !== undefined && !_Validators.isStringArray(opts.supported)) {
        _Validators.fail('options.supported', ERRORS.MUST_BE_STRING_ARRAY);
      }

      const errors = [];
      const warnings = [];
      const tokens = theme.tokens;
      const contractTokens = contract.tokens;
      const contractGroups = contract.groups;

      // Check required tokens: each must be present in the theme
      const required = opts.required || [];
      for (let i = 0; i < required.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(tokens, required[i])) {
          errors.push(_Validators.contractEntry('CONTRACT_MISSING_TOKEN', required[i]));
        }
      }

      // Check every token in the theme against the contract
      const themeKeys = Object.keys(tokens);
      for (let i = 0; i < themeKeys.length; i++) {
        const name = themeKeys[i];
        const value = tokens[name];

        // Unknown tokens are contract errors
        if (!Object.prototype.hasOwnProperty.call(contractTokens, name)) {
          errors.push(_Validators.contractEntry('CONTRACT_UNKNOWN_TOKEN', name));
          continue;
        }

        // Unsupported tokens are warnings when supported is supplied
        if (opts.supported && opts.supported.indexOf(name) === -1) {
          warnings.push(_Validators.contractEntry('CONTRACT_UNSUPPORTED_TOKEN', name));
        }

        // Skip value type checking for aliases and rule/generator objects
        if (_Validators.isAlias(value)) {
          continue;
        }
        if (_Validators.isRuleOrGenerator(value)) {
          const tokenDef = contractTokens[name];
          const groupDef = contractGroups[tokenDef.group];
          if (groupDef.type === 'color' || groupDef.type === 'number' || groupDef.type === 'typeSet') {
            continue;
          }
        }

        // Type-check the literal value
        const tokenDef = contractTokens[name];
        const groupDef = contractGroups[tokenDef.group];
        const typeError = _Validators.checkContractValue(name, value, tokenDef, groupDef);
        if (typeError) {
          errors.push(typeError);
        }
      }

      return {
        success: Lib.Utils.isEmptyArray(errors),
        errors: errors,
        warnings: warnings
      };

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
      if (!Lib.Utils.isNumber(value) || !Number.isFinite(value) || value <= 0) {
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
      if (!Lib.Utils.isNumber(value) || !Number.isFinite(value) || value < 0) {
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
      if (!Lib.Utils.isNumber(value) || !Number.isFinite(value) || value < 0 || value > 1) {
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

      // 21 is the maximum ratio any color pair can reach, so above it never satisfies
      if (!Lib.Utils.isNumber(value) || !Number.isFinite(value) || value < 1 || value > 21) {
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

    },


    /********************************************************************
    Build one contract finding.

    @param {String} code - Catalog key, one of the four CONTRACT_* names
    @param {String} token - Token name the finding is about

    @return {Object} - { code, token, message }
    *********************************************************************/
    contractEntry: function (code, token) {

      // The catalog owns the wording; the entry carries the key so callers branch on it
      return {
        code: code,
        token: token,
        message: '[helper-themer] ' + token + ' ' + ERRORS[code].message
      };

    },


    /********************************************************************
    Report whether a value is an array of strings.

    @param {*} value - Value to test

    @return {Boolean} - True for an array whose every element is a string
    *********************************************************************/
    isStringArray: function (value) {

      // Every list option is a set of token names, so any non-string element is a bug
      return Array.isArray(value) && value.every(function (item) {
        return Lib.Utils.isString(item);
      });

    },


    /********************************************************************
    Report whether the color part can parse a value.

    @param {*} value - Candidate color string

    @return {Boolean} - True when parseHex accepts it
    *********************************************************************/
    isParsableColor: function (value) {

      // The parser throws on a malformed color, so its verdict is the test
      try {
        Color.parseHex(value);
        return true;
      } catch {
        return false;
      }

    },


    /********************************************************************
    Report whether a value is an alias string in braces.

    @param {*} value - Value to test

    @return {Boolean} - True when the value is an alias string
    *********************************************************************/
    isAlias: function (value) {

      // An alias is a string wrapped in braces, such as '{color.background}'
      return Lib.Utils.isString(value) && value.length >= 2
        && value[0] === '{' && value[value.length - 1] === '}';

    },


    /********************************************************************
    Report whether a value is a rule or generator object.

    Rule objects carry an `op` field; generator objects carry a
    `scale` field. Both are accepted for color, number, and typeSet
    types without checking their output.

    @param {*} value - Value to test

    @return {Boolean} - True when the value is a rule or generator
    *********************************************************************/
    isRuleOrGenerator: function (value) {

      // Must be a plain object, not an array
      if (!Lib.Utils.isObject(value) || Array.isArray(value)) {
        return false;
      }

      // A rule object carries an op field
      if (Object.prototype.hasOwnProperty.call(value, 'op')) {
        return true;
      }

      // A generator object carries a scale field
      if (Object.prototype.hasOwnProperty.call(value, 'scale')) {
        return true;
      }

      return false;

    },


    /********************************************************************
    Check a literal value against its contract type.

    @param {String} name - Token name
    @param {*} value - Literal value from the theme
    @param {Object} tokenDef - Contract token definition
    @param {Object} groupDef - Contract group definition

    @return {Object|undefined} - Error entry, or undefined when valid
    *********************************************************************/
    checkContractValue: function (name, value, tokenDef, groupDef) {

      const type = groupDef.type;

      // color: lowercase #rrggbb or #rrggbbaa, or rgba(...)
      if (type === 'color') {
        if (!Lib.Utils.isString(value) || !_Validators.isValidColor(value)) {
          return _Validators.contractEntry('CONTRACT_INVALID_VALUE', name);
        }
        return undefined;
      }

      // viewport: object with viewport: true and vw >= 0 (v2 C3)
      if (tokenDef.emit === 'viewport') {
        if (!_Validators.isValidViewport(value)) {
          return _Validators.contractEntry('CONTRACT_INVALID_VALUE', name);
        }
        return undefined;
      }

      // number: finite number; groups with range: [min, max] enforce it
      if (type === 'number') {
        if (!Lib.Utils.isNumber(value) || !Number.isFinite(value)) {
          return _Validators.contractEntry('CONTRACT_INVALID_VALUE', name);
        }
        if (Array.isArray(groupDef.range)) {
          if (value < groupDef.range[0] || value > groupDef.range[1]) {
            return _Validators.contractEntry('CONTRACT_INVALID_VALUE', name);
          }
        }
        return undefined;
      }

      // typeSet: object with type_set, font_size, line_height_px, etc.
      if (type === 'typeSet') {
        if (!_Validators.isValidTypeSet(value)) {
          return _Validators.contractEntry('CONTRACT_INVALID_VALUE', name);
        }
        return undefined;
      }

      // font: family strings or weight integers
      if (type === 'font') {
        if (!_Validators.isValidFont(name, value)) {
          return _Validators.contractEntry('CONTRACT_INVALID_VALUE', name);
        }
        return undefined;
      }

      // motion: duration (number >= 0), easing (array of 4 or segments object), or spring object
      if (type === 'motion') {
        if (tokenDef.emit === 'spring') {
          if (!_Validators.isValidSpring(value)) {
            return _Validators.contractEntry('CONTRACT_INVALID_VALUE', name);
          }
        } else if (tokenDef.emit === 'easing') {
          if (Lib.Utils.isObject(value) && !Array.isArray(value) && value.segments === true) {
            if (!_Validators.isValidSegments(value)) {
              return _Validators.contractEntry('CONTRACT_INVALID_VALUE', name);
            }
          } else if (!Array.isArray(value) || value.length !== 4
            || !value.every(function (n) {
              return Lib.Utils.isNumber(n) && Number.isFinite(n);
            })) {
            return _Validators.contractEntry('CONTRACT_INVALID_VALUE', name);
          }
        } else {
          if (!Lib.Utils.isNumber(value) || !Number.isFinite(value) || value < 0) {
            return _Validators.contractEntry('CONTRACT_INVALID_VALUE', name);
          }
        }
        return undefined;
      }

      // enum: string in the token's values list
      if (type === 'enum') {
        const allowed = tokenDef.values || [];
        if (!Lib.Utils.isString(value) || allowed.indexOf(value) === -1) {
          return _Validators.contractEntry('CONTRACT_INVALID_VALUE', name);
        }
        return undefined;
      }

      // shadow: object with shadow: true and layers array
      if (type === 'shadow') {
        if (!_Validators.isValidShadow(value)) {
          return _Validators.contractEntry('CONTRACT_INVALID_VALUE', name);
        }
        return undefined;
      }

      // Unknown type: no check
      return undefined;

    },


    /********************************************************************
    Test whether a string is a valid color literal.

    Accepts lowercase #rrggbb, #rrggbbaa, and rgba(...) with numeric
    channels. Rejects uppercase hex, named colors, hsl, and transparent.

    @param {String} value - Color string to test

    @return {Boolean} - True when valid
    *********************************************************************/
    isValidColor: function (value) {

      // Lowercase six or eight digit hex
      if (/^#[0-9a-f]{6}$/.test(value) || /^#[0-9a-f]{8}$/.test(value)) {
        return true;
      }

      // Numeric rgba with optional alpha
      if (/^rgba\(\d{1,3}, \d{1,3}, \d{1,3}, (0|1|0?\.\d+)\)$/.test(value)) {
        return true;
      }

      return false;

    },


    /********************************************************************
    Test whether a value is a valid type set.

    @param {*} value - Value to test

    @return {Boolean} - True when valid
    *********************************************************************/
    isValidTypeSet: function (value) {

      // Must be a plain object with type_set: true
      if (!Lib.Utils.isObject(value) || Array.isArray(value)) {
        return false;
      }
      if (value.type_set !== true) {
        return false;
      }

      // A ratio line height is not a contract value; the contract uses exact pixels
      if (value.line_height !== undefined) {
        return false;
      }

      // font_size: finite number greater than zero
      if (!Lib.Utils.isNumber(value.font_size) || !Number.isFinite(value.font_size) || value.font_size <= 0) {
        return false;
      }

      // line_height_px: finite number of zero or greater
      if (!Lib.Utils.isNumber(value.line_height_px) || !Number.isFinite(value.line_height_px) || value.line_height_px < 0) {
        return false;
      }

      // letter_spacing: finite number
      if (!Lib.Utils.isNumber(value.letter_spacing) || !Number.isFinite(value.letter_spacing)) {
        return false;
      }

      // weight: integer 100..900 step 100
      if (!Number.isInteger(value.weight) || value.weight < 100 || value.weight > 900 || value.weight % 100 !== 0) {
        return false;
      }

      // font_family: a role name, never a family or a CSS stack
      if (value.font_family !== 'sans' && value.font_family !== 'serif' && value.font_family !== 'mono') {
        return false;
      }

      // v2 C4: optional per-breakpoint overrides
      if (value.breakpoints !== undefined) {
        if (!Lib.Utils.isObject(value.breakpoints) || Array.isArray(value.breakpoints)) {
          return false;
        }
        const bpKeys = Object.keys(value.breakpoints);
        for (let i = 0; i < bpKeys.length; i++) {
          const bp = value.breakpoints[bpKeys[i]];
          if (!Lib.Utils.isObject(bp) || Array.isArray(bp)) {
            return false;
          }
          if (bp.type_set !== undefined && bp.type_set !== true) {
            return false;
          }
          if (bp.line_height !== undefined) {
            return false;
          }
          if (!Lib.Utils.isNumber(bp.font_size) || !Number.isFinite(bp.font_size) || bp.font_size <= 0) {
            return false;
          }
          if (bp.line_height_px !== undefined && (!Lib.Utils.isNumber(bp.line_height_px) || !Number.isFinite(bp.line_height_px) || bp.line_height_px < 0)) {
            return false;
          }
          if (bp.letter_spacing !== undefined && (!Lib.Utils.isNumber(bp.letter_spacing) || !Number.isFinite(bp.letter_spacing))) {
            return false;
          }
          if (bp.weight !== undefined && (!Number.isInteger(bp.weight) || bp.weight < 100 || bp.weight > 900 || bp.weight % 100 !== 0)) {
            return false;
          }
          if (bp.font_family !== undefined && bp.font_family !== 'sans' && bp.font_family !== 'serif' && bp.font_family !== 'mono') {
            return false;
          }
          if (bp.breakpoints !== undefined) {
            return false;
          }
        }
      }

      return true;

    },


    /********************************************************************
    Test whether a font token value is valid.

    @param {String} name - Token name (font.family.* or font.weight.*)
    @param {*} value - Value to test

    @return {Boolean} - True when valid
    *********************************************************************/
    isValidFont: function (name, value) {

      // font.family.*: non-empty string (a family name the host will register)
      if (name.indexOf('font.family.') === 0) {
        return Lib.Utils.isString(value) && Boolean(value);
      }

      // font.weight.*: integer 100..900 step 100
      if (name.indexOf('font.weight.') === 0) {
        return Number.isInteger(value) && value >= 100 && value <= 900 && value % 100 === 0;
      }

      return false;

    },


    /********************************************************************
    Test whether a value is a valid shadow object.

    @param {*} value - Value to test

    @return {Boolean} - True when valid
    *********************************************************************/
    isValidShadow: function (value) {

      // Must be a plain object with shadow: true
      if (!Lib.Utils.isObject(value) || Array.isArray(value)) {
        return false;
      }
      if (value.shadow !== true) {
        return false;
      }

      // Must have a layers array
      if (!Array.isArray(value.layers) || Lib.Utils.isEmptyArray(value.layers)) {
        return false;
      }

      // Each layer must have finite x, y, blur, spread and a color string or alias
      for (let i = 0; i < value.layers.length; i++) {
        const layer = value.layers[i];
        if (!Lib.Utils.isObject(layer) || Array.isArray(layer)) {
          return false;
        }
        for (const field of ['x', 'y', 'blur', 'spread']) {
          if (!Lib.Utils.isNumber(layer[field]) || !Number.isFinite(layer[field])) {
            return false;
          }
        }
        if (layer.blur < 0) {
          return false;
        }
        if (!_Validators.isAlias(layer.color) && !(Lib.Utils.isString(layer.color) && _Validators.isValidColor(layer.color))) {
          return false;
        }
        // inset is optional; when present it must be a boolean
        if (layer.inset !== undefined && !Lib.Utils.isBoolean(layer.inset)) {
          return false;
        }
      }

      // level and elevation keys are forbidden
      if (value.level !== undefined || value.elevation !== undefined) {
        return false;
      }

      return true;

    },


    /********************************************************************
    Test whether a value is a valid viewport literal (v2 C3).

    Accepts { viewport: true, vw: Number } with vw finite and >= 0.
    No other keys are allowed.

    @param {*} value - Value to test

    @return {Boolean} - True when valid
    *********************************************************************/
    isValidViewport: function (value) {

      if (!Lib.Utils.isObject(value) || Array.isArray(value)) {
        return false;
      }
      if (value.viewport !== true) {
        return false;
      }
      if (!Lib.Utils.isNumber(value.vw) || !Number.isFinite(value.vw) || value.vw < 0) {
        return false;
      }
      const keys = Object.keys(value);
      if (keys.length !== 2) {
        return false;
      }

      return true;

    },


    /********************************************************************
    Test whether a value is a valid spring literal (v2 M10).

    Accepts { spring: true, stiffness, damping, mass } with all three
    finite numbers greater than zero. No other keys are allowed.
    damping is a coefficient in React Native Animated.spring terms,
    not a damping ratio.

    @param {*} value - Value to test

    @return {Boolean} - True when valid
    *********************************************************************/
    isValidSpring: function (value) {

      if (!Lib.Utils.isObject(value) || Array.isArray(value)) {
        return false;
      }
      if (value.spring !== true) {
        return false;
      }
      if (!Lib.Utils.isNumber(value.stiffness) || !Number.isFinite(value.stiffness) || value.stiffness <= 0) {
        return false;
      }
      if (!Lib.Utils.isNumber(value.damping) || !Number.isFinite(value.damping) || value.damping <= 0) {
        return false;
      }
      if (!Lib.Utils.isNumber(value.mass) || !Number.isFinite(value.mass) || value.mass <= 0) {
        return false;
      }
      const keys = Object.keys(value);
      if (keys.length !== 4) {
        return false;
      }

      return true;

    },


    /********************************************************************
    Test whether a value is a valid segments literal (v2 M11).

    Accepts { segments: true, curves: Array } where curves has at least
    one entry and every entry is [t, [x1, y1, x2, y2]] with t finite in
    0..1, strictly increasing across entries, and the inner array exactly
    4 finite numbers. No other keys are allowed.

    @param {*} value - Value to test

    @return {Boolean} - True when valid
    *********************************************************************/
    isValidSegments: function (value) {

      if (!Lib.Utils.isObject(value) || Array.isArray(value)) {
        return false;
      }
      if (value.segments !== true) {
        return false;
      }
      if (!Array.isArray(value.curves) || value.curves.length < 1) {
        return false;
      }
      let prevT = -Infinity;
      for (let i = 0; i < value.curves.length; i++) {
        const entry = value.curves[i];
        if (!Array.isArray(entry) || entry.length !== 2) {
          return false;
        }
        const t = entry[0];
        if (!Lib.Utils.isNumber(t) || !Number.isFinite(t) || t < 0 || t > 1 || t <= prevT) {
          return false;
        }
        const curve = entry[1];
        if (!Array.isArray(curve) || curve.length !== 4 ||
          !curve.every(function (n) {
            return Lib.Utils.isNumber(n) && Number.isFinite(n);
          })) {
          return false;
        }
        prevT = t;
      }
      const keys = Object.keys(value);
      if (keys.length !== 2) {
        return false;
      }

      return true;

    }

  };/////////////////////////// Private Functions END /////////////////////////////

  return Validators;

};
