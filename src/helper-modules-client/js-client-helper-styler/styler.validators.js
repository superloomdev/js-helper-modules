// Info: Validators for the js-client-helper-styler package. Two concerns:
//   1. Template validation     - is a template structurally sound? (authoring time)
//   2. Theme-values validation  - is a base/variant object well-formed?
// Plus an optional font-registration check the host can run to confirm every
// family a theme names has actually been loaded. Throws Error (with .code) on
// failure so misconfiguration fails loudly at startup, not on first render.
//
// Compatibility: Node.js 18+ and React Native (Hermes).
//
// Loader pattern: SINGLETON. Validators are pure — no Lib, no CONFIG, no
// per-instance state — and run at authoring/startup time, so the loader simply
// returns the shared module-scope Validators object. The shared_libs param is
// accepted for loader-signature uniformity but unused.
'use strict';

const ERRORS = require('./styler.errors');


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Returns the shared module-scope Validators object.
Accepts shared_libs only for loader-signature uniformity — validators
are pure and use no injected dependencies or config.

@param {Object} shared_libs - Lib container (unused)

@return {Object} - Public Validators interface
*********************************************************************/
module.exports = function loader (shared_libs) { // eslint-disable-line no-unused-vars

  return Validators;

};///////////////////////////// Module-Loader END ////////////////////////////////



////////////////////////////// Public Functions START ////////////////////////
const Validators = { // Public functions accessible by other modules

  /********************************************************************
  Validate a template's structure. Checks the three sections exist and
  that every color swatch rule + dimension scale is well-formed.

  @param {Object} template - the template to validate

  @throws {Error} with .code on the first problem found
  @return {Boolean} - true when valid
  *********************************************************************/
  validateTemplate: function (template) {

    if (!_Validators.isObject(template) || !template.color || !template.dimension || !template.font) {
      throw _Validators.fail(ERRORS.TEMPLATE_INVALID);
    }

    const swatches = template.color.swatches || {};
    Object.keys(swatches).forEach(function (name) {
      const rule = swatches[name];
      const hasRef = rule && rule.ref !== undefined;
      const hasOperation = rule && rule.operation !== undefined;
      if (!hasRef && !hasOperation) {
        throw _Validators.fail(ERRORS.TEMPLATE_COLOR_RULE_INVALID, '(swatch "' + name + '")');
      }
    });

    const scales = template.dimension.scales || {};
    Object.keys(scales).forEach(function (name) {
      const type = scales[name].type;
      if (type !== 'modular' && type !== 'linear') {
        throw _Validators.fail(ERRORS.TEMPLATE_SCALE_INVALID, '(scale "' + name + '")');
      }
    });

    return true;

  },

  /********************************************************************
  Validate a theme's values object (base or variant). Each group, if
  present, must be an object.

  @param {Object} values - { color?, dimension?, font? }

  @throws {Error} with .code when malformed
  @return {Boolean} - true when valid
  *********************************************************************/
  validateThemeValues: function (values) {

    if (!_Validators.isObject(values)) {
      throw _Validators.fail(ERRORS.THEME_VALUES_INVALID);
    }
    ['color', 'dimension', 'font'].forEach(function (group) {
      if (values[group] !== undefined && !_Validators.isObject(values[group])) {
        throw _Validators.fail(ERRORS.THEME_VALUES_INVALID, '(group "' + group + '")');
      }
    });

    return true;

  },

  /********************************************************************
  Confirm every font family named by an assembled theme is registered by
  the host. 'System' is always considered available. Returns the list of
  missing families (empty = all good) so the host can warn or throw.

  @param {Object} theme     - assembled theme ({ Font: { family } })
  @param {Array}  families  - family names the host has registered

  @return {Array} - missing family names (empty when all registered)
  *********************************************************************/
  findUnregisteredFamilies: function (theme, families) {

    const registered = {};
    (families || []).forEach(function (f) {
      registered[f] = true;
    });
    registered['System'] = true;

    const used = (theme && theme.Font && theme.Font.family) || {};
    const missing = [];
    Object.keys(used).forEach(function (role) {
      const fam = used[role];
      if (fam && !registered[fam] && missing.indexOf(fam) === -1) {
        missing.push(fam);
      }
    });

    return missing;

  }

};////////////////////////////// Public Functions END ////////////////////////



//////////////////////////Private Functions START/////////////////////////////
const _Validators = { // Private helpers accessible within this module only

  /********************************************************************
  Build an Error carrying a stable .code from the error catalog, so
  callers can branch on `code` rather than message text.

  @param {Object} err    - catalog entry { code, message }
  @param {String} detail - optional context appended to the message

  @return {Error} - Error instance with .code set
  *********************************************************************/
  fail: function (err, detail) {
    const e = new Error(detail ? err.message + ' ' + detail : err.message);
    e.code = err.code;
    return e;
  },

  /********************************************************************
  True for a plain object (not null, not an array).

  @param {*} v - value to test

  @return {Boolean} - true when v is a non-array object
  *********************************************************************/
  isObject: function (v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

};//////////////////////////Private Functions END/////////////////////////////
