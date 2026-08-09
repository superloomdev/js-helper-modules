// Info: Validators for helper-themer-ext-react.
//
// Validates the injected dependencies and the ThemeProvider props.
// Uses Lib.Utils type-check primitives, never raw typeof.
// All failures throw TypeError synchronously - this module has no
// operational errors because it performs no I/O.
'use strict';

let Lib;
let ERRORS;


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Validators singleton. Receives Lib and ERRORS by injection from the
main module loader.

@param {Object} shared_libs - Lib container with Utils
@param {Object} errors      - Frozen error catalog

@return {Object} - Validators object
*********************************************************************/
module.exports = function loader (shared_libs, errors) {

  Lib = shared_libs;
  ERRORS = errors;

  return Validators;

};///////////////////////////// Module-Loader END ////////////////////////////////


/////////////////////////// Public Functions START /////////////////////////////
const Validators = {


  // ~~~~~~~~~~~~~~~~~~~~ Config ~~~~~~~~~~~~~~~~~~~~

  /********************************************************************
  Validates the merged configuration. No keys are defined yet, so
  this is a no-op reserved for future extension-specific knobs.

  @param {Object} CONFIG - Merged configuration for this instance
  *********************************************************************/
  validateConfig: function (CONFIG) { // eslint-disable-line no-unused-vars

    // No config keys yet - reserved for future knobs

  },


  // ~~~~~~~~~~~~~~~~~~~~ Dependency Injection ~~~~~~~~~~~~~~~~~~~~

  /********************************************************************
  Validates that the injected shared_libs container carries React
  and a built Themer instance.

  @param {Object} shared_libs - Lib container from the host
  *********************************************************************/
  validateSharedLibs: function (shared_libs) {

    // React must be present and must be an object (React 18 exports an object, not a function)
    if (!Lib.Utils.isObject(shared_libs) || !Lib.Utils.isObject(shared_libs.React)) {

      _Validators.fail('shared_libs.React', ERRORS.MUST_HAVE_REACT);

    }

    // Themer must be present and must be an object (a built instance)
    if (!Lib.Utils.isObject(shared_libs) || !Lib.Utils.isObject(shared_libs.Themer)) {

      _Validators.fail('shared_libs.Themer', ERRORS.MUST_HAVE_THEMER);

    }

  },


  // ~~~~~~~~~~~~~~~~~~~~ Provider Props ~~~~~~~~~~~~~~~~~~~~

  /********************************************************************
  Validates the template prop received by ThemeProvider.

  @param {Object} template - The themer template to derive from
  *********************************************************************/
  validateTemplate: function (template) {

    if (!Lib.Utils.isObject(template)) {

      _Validators.fail('template', ERRORS.MUST_BE_PLAIN_OBJECT);

    }

  },


  /********************************************************************
  Validates the layers prop received by ThemeProvider.

  @param {Array} layers - Ordered sparse overlays
  *********************************************************************/
  validateLayers: function (layers) {

    if (!Array.isArray(layers)) {

      _Validators.fail('layers', ERRORS.MUST_BE_LAYER_ARRAY);

    }

  },


  /********************************************************************
  Validates the platform prop received by ThemeProvider.

  @param {String} platform - Target emit platform
  *********************************************************************/
  validatePlatform: function (platform) {

    if (!Lib.Utils.isString(platform) || (platform !== 'web' && platform !== 'native')) {

      _Validators.fail('platform', ERRORS.MUST_BE_PLATFORM);

    }

  },


  /********************************************************************
  Validates the optional transform prop received by ThemeProvider.
  A transform must be a function when provided.

  @param {*} transform - Optional transform function
  *********************************************************************/
  validateTransform: function (transform) {

    if (transform !== undefined && !Lib.Utils.isFunction(transform)) {

      _Validators.fail('transform', ERRORS.MUST_BE_FUNCTION);

    }

  }


};/////////////////////////// Public Functions END ///////////////////////////////


/////////////////////////// Private Functions START ////////////////////////////
const _Validators = {


  /********************************************************************
  Throws a TypeError with the module prefix and the field path.

  @param {String} path - Field path where the error was found
  @param {String} rule - Error rule from the catalog
  *********************************************************************/
  fail: function (path, rule) {

    throw new TypeError('[helper-themer-ext-react] ' + path + ' ' + rule);

  }


};//////////////////////////Private Functions END//////////////////////////////
