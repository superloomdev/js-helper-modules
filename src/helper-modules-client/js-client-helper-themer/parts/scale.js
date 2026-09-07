// Info: Scale generators for helper-themer.
//
// A generator turns a step or multiplier into a number, so a template declares
// the rule once and every step on the scale follows from it. This is what lets
// a spacing or type scale be described in one line instead of pinned per value.
//
// Loader pattern: FACTORY part. Lib, CONFIG, and ERRORS are captured per call
// from the uniform parts signature; each public object closes over its own values.


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory part loader. Captures the uniform part dependencies for
each instance and returns its isolated Scale object.

@param {Object} shared_libs - Lib container with Utils
@param {Object} config - Merged config from the parent module
@param {Object} errors - Frozen error catalog from the parent module

@return {Object} - Public Scale interface
*********************************************************************/
export default function loader (shared_libs, config, errors) {

  // Capture local bindings so this instance's public object can close over them
  const Lib = shared_libs;
  const CONFIG = config;
  const ERRORS = errors;

  return createInterface(Lib, CONFIG, ERRORS);

};/////////////////////////// Module-Loader END /////////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Build the scale interface for one engine instance.

@param {Object} Lib - Dependency container with Utils
@param {Object} CONFIG - Merged config for this instance
@param {Object} ERRORS - Frozen error catalog

@return {Object} - Public Scale interface
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS) {

  /////////////////////////// Public Functions START ////////////////////////////
  const Scale = {


    // ~~~~~~~~~~~~~~~~~~~~ Generators ~~~~~~~~~~~~~~~~~~~~
    // Each takes the token's own parameters plus the template's seed values for
    // that scale, and returns one number.

    /********************************************************************
    Produce a spacing value as a multiple of a base mini unit.

    @param {Object} params - Token parameters
    @param {Number} params.multiplier - How many mini units this step is
    @param {Object} seeds - Scale seeds from the template
    @param {Number} seeds.base - Size of one mini unit

    @return {Number} - The generated value
    *********************************************************************/
    miniUnit: function (params, seeds) {

      // A negative or missing base would invert or void the whole spacing scale
      if (!Lib.Utils.isNumber(seeds.base) || seeds.base < 0) {
        throw new TypeError('[helper-themer] template.scales.miniUnit.base ' + ERRORS.MUST_BE_NON_NEGATIVE_NUMBER);
      }

      // Every step on the scale is a whole multiple of the unit
      return seeds.base * params.multiplier;

    },


    /********************************************************************
    Produce a type size from a step-pair increment scale.

    The scale grows by a widening increment: each group of four steps
    adds two more pixels per step than the group before it, which is
    what keeps small sizes close together and large sizes far apart.

    Iterative rather than recursive so a large step cannot exhaust
    the stack.

    @param {Object} params - Token parameters
    @param {Number} params.step - Position on the scale, starting at 1
    @param {Object} seeds - Scale seeds from the template
    @param {Number} seeds.base - Size at step 1

    @return {Number} - The generated size
    *********************************************************************/
    stepPairIncrement: function (params, seeds) {

      // A missing base leaves every step on the scale undefined
      if (!Lib.Utils.isNumber(seeds.base) || seeds.base <= 0) {
        throw new TypeError('[helper-themer] template.scales.stepPairIncrement.base ' + ERRORS.MUST_BE_POSITIVE_NUMBER);
      }

      // Walk up from the base, widening the increment every four steps
      let value = seeds.base;

      for (let n = 2; n <= params.step; n++) {
        value += (Math.floor(((n - 2) / 4) + 1) * 2);
      }

      return value;

    },


    /********************************************************************
    Produce a value from a plain geometric scale.

    Included so a template is not obliged to adopt the step-pair
    curve; a ratio-based scale is the common alternative.

    @param {Object} params - Token parameters
    @param {Number} params.step - Position on the scale, starting at 1
    @param {Object} seeds - Scale seeds from the template
    @param {Number} seeds.base - Value at step 1
    @param {Number} seeds.ratio - Multiplier between consecutive steps

    @return {Number} - The generated value
    *********************************************************************/
    geometric: function (params, seeds) {

      // Both seeds are required, since either one missing collapses the curve
      if (!Lib.Utils.isNumber(seeds.base) || seeds.base <= 0) {
        throw new TypeError('[helper-themer] template.scales.geometric.base ' + ERRORS.MUST_BE_POSITIVE_NUMBER);
      }

      if (!Lib.Utils.isNumber(seeds.ratio) || seeds.ratio <= 0) {
        throw new TypeError('[helper-themer] template.scales.geometric.ratio ' + ERRORS.MUST_BE_POSITIVE_NUMBER);
      }

      // Step 1 is the base itself, so the exponent is one less than the step
      return seeds.base * Math.pow(seeds.ratio, params.step - 1);

    },


    // ~~~~~~~~~~~~~~~~~~~~ Lookup ~~~~~~~~~~~~~~~~~~~~
    // Resolving a generator by the name a template used.

    /********************************************************************
    Return the generator a template named, or throw when it does not
    exist.

    Built-in generators are looked up on a null-prototype map so a
    prototype name like constructor or toString cannot be mistaken
    for a scale. Custom generators from CONFIG.SCALE_GENERATORS are
    merged in after the built-ins.

    @param {String} name - Generator name from the token entry
    @param {String} token_name - Token being resolved, for the message

    @return {Function} - The generator function
    *********************************************************************/
    byName: function (name, token_name) {

      // A null-prototype lookup prevents prototype names from masquerading as generators
      const lookup = _Scale.generatorLookup();
      const generator = Object.prototype.hasOwnProperty.call(lookup, name)
        ? lookup[name]
        : undefined;

      // An unknown generator would otherwise resolve the token to undefined
      if (!Lib.Utils.isFunction(generator)) {
        throw new TypeError('[helper-themer] tokens.' + token_name + '.scale ' + ERRORS.MUST_BE_KNOWN_SCALE);
      }

      return generator;

    },


    /********************************************************************
    List the generator names this engine provides.

    @return {String[]} - Generator names
    *********************************************************************/
    names: function () {

      // Filter out the lookup helpers so only real generators are reported
      return Object.keys(Scale).filter(function (key) {
        return !_Scale.isReserved(key);
      });

    }

  };/////////////////////////// Public Functions END ////////////////////////////



  /////////////////////////// Private Functions START ///////////////////////////
  const _Scale = {

    /********************************************************************
    Build a null-prototype lookup of every available generator,
    built-ins first, then custom generators from CONFIG.SCALE_GENERATORS.

    @return {Object} - Null-prototype map of generator name to function
    *********************************************************************/
    generatorLookup: function () {

      // Start with a null-prototype object so hasOwnProperty is the only path
      const lookup = Object.create(null);

      // Built-in generators are every public key except the lookup helpers
      const keys = Object.keys(Scale);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (!_Scale.isReserved(key)) {
          lookup[key] = Scale[key];
        }
      }

      // Custom generators from config merge in after built-ins
      const custom = CONFIG.SCALE_GENERATORS || {};
      const customKeys = Object.keys(custom);
      for (let i = 0; i < customKeys.length; i++) {
        lookup[customKeys[i]] = custom[customKeys[i]];
      }

      return lookup;

    },


    /********************************************************************
    Report whether a key on the public object is a lookup helper
    rather than a generator.

    @param {String} name - Key to test

    @return {Boolean} - True when the key is not a generator
    *********************************************************************/
    isReserved: function (name) {

      // These two are the module's own surface, not scales a template can name
      return name === 'byName' || name === 'names';

    }

  };/////////////////////////// Private Functions END ///////////////////////////



  // Return the instance's isolated scale interface
  return Scale;

};/////////////////////////// createInterface END //////////////////////////////
