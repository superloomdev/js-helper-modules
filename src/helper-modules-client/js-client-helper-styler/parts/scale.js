// Info: Scale builders for js-client-helper-styler — turn a small numeric seed into a
// full named scale. Modular (geometric) scales drive typography; linear
// (arithmetic) scales drive spacing and radius. Singleton part; no state.
'use strict';


// Shared dependencies injected by loader (uniform parts signature)
let Lib;     // eslint-disable-line no-unused-vars -- accepted for signature uniformity
let CONFIG;  // eslint-disable-line no-unused-vars -- accepted for signature uniformity
let ERRORS;  // eslint-disable-line no-unused-vars -- accepted for signature uniformity


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib, CONFIG, and ERRORS and returns the
module-scope Scale object directly. All three are accepted for
signature uniformity with other parts — none are consumed today.

@param {Object} shared_libs - Lib container (unused; pure scale math)
@param {Object} config      - Merged module configuration (unused)
@param {Object} errors      - Module error catalog (unused)

@return {Object} - Public Scale interface
*********************************************************************/
module.exports = function loader (shared_libs, config, errors) {

  // Capture injected references so they are available if a future builder needs them
  Lib = shared_libs;
  CONFIG = config;
  ERRORS = errors;

  return Scale;

};/////////////////////////// Module-Loader END ////////////////////////////////



/////////////////////////// Public Functions START /////////////////////////////
const Scale = { // Named scale builders accessible by the orchestrator


  /********************************************************************
  Build a geometric (modular) scale: each named step is
  round(base * ratio^step). Used for typography.

  @param {Number} base  - base value (the step at exponent 0)
  @param {Number} ratio - geometric ratio between steps
  @param {Object} steps - map of { step_name: exponent }

  @return {Object} - map of { step_name: rounded value }
  *********************************************************************/
  modular: function (base, ratio, steps) {

    // Raise base by the ratio to each step's exponent, rounded to a whole number
    const out = {};
    Object.keys(steps).forEach(function (step_name) {
      out[step_name] = _Scale.round(base * Math.pow(ratio, steps[step_name]), 0);
    });

    return out;

  },


  /********************************************************************
  Build an arithmetic (linear) scale: each named step is
  unit * multiplier. Used for spacing / radius.

  @param {Number} unit  - base unit multiplied by each step
  @param {Object} steps - map of { step_name: multiplier }

  @return {Object} - map of { step_name: value }
  *********************************************************************/
  linear: function (unit, steps) {

    // Multiply the unit by each step's multiplier
    const out = {};
    Object.keys(steps).forEach(function (step_name) {
      out[step_name] = unit * steps[step_name];
    });

    return out;

  }


};/////////////////////////// Public Functions END //////////////////////////////



/////////////////////////// Private Functions START ////////////////////////////
const _Scale = { // Numeric helpers, module-only


  /********************************************************************
  Round a number to `decimals` places (default whole numbers).

  @param {Number}  value      - value to round
  @param {Integer} [decimals] - decimal places (default 0)

  @return {Number} - rounded value
  *********************************************************************/
  round: function (value, decimals) {

    // Scale up, round, then scale back down by the requested precision
    const factor = Math.pow(10, decimals || 0);
    return Math.round(value * factor) / factor;

  }


};/////////////////////////// Private Functions END ////////////////////////////
