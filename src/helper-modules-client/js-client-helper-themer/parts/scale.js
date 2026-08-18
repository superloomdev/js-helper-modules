// Info: Scale generators for helper-themer.
//
// A generator turns a step or multiplier into a number, so a template declares
// the rule once and every step on the scale follows from it. This is what lets
// a spacing or type scale be described in one line instead of pinned per value.
//
// Loader pattern: SINGLETON part. Lib, CONFIG, and ERRORS are assigned once
// from the uniform parts signature; the public object closes over them.
'use strict';


// Shared dependencies injected by loader (uniform parts signature)
let Lib;
let CONFIG;            // eslint-disable-line no-unused-vars
let ERRORS;


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
    Singleton part loader. Assigns the uniform part dependencies to
    module scope and returns the shared Scale object.

@param {Object} shared_libs - Lib container with Utils
@param {Object} config - Merged config from the parent module
@param {Object} errors - Frozen error catalog from the parent module

@return {Object} - Public Scale interface
*********************************************************************/
module.exports = function loader (shared_libs, config, errors) {

  // Assign to module-scope vars so the public object can close over them
  Lib = shared_libs;
  CONFIG = config;
  ERRORS = errors;

  return Scale;

};/////////////////////////// Module-Loader END /////////////////////////////////



/////////////////////////// Public Functions START /////////////////////////////
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
      Produce a type size from the Carbon type scale.

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
  carbonType: function (params, seeds) {

    // A missing base leaves every step on the scale undefined
    if (!Lib.Utils.isNumber(seeds.base) || seeds.base <= 0) {
      throw new TypeError('[helper-themer] template.scales.carbonType.base ' + ERRORS.MUST_BE_POSITIVE_NUMBER);
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

      Included so a template is not obliged to adopt the Carbon type
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

      @param {String} name - Generator name from the token entry
      @param {String} token_name - Token being resolved, for the message

      @return {Function} - The generator function
  *********************************************************************/
  byName: function (name, token_name) {

    // An unknown generator would otherwise resolve the token to undefined
    if (!Lib.Utils.isFunction(Scale[name]) || _Scale.isReserved(name)) {
      throw new TypeError('[helper-themer] tokens.' + token_name + '.scale ' + ERRORS.MUST_BE_KNOWN_SCALE);
    }

    return Scale[name];

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

};/////////////////////////// Public Functions END //////////////////////////////



/////////////////////////// Private Functions START ////////////////////////////
const _Scale = {

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

};/////////////////////////// Private Functions END /////////////////////////////
