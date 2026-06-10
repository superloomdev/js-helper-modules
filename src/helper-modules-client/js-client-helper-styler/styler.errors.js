// Info: Error catalog for the js-client-helper-styler package. Stable codes + messages so callers
// (and validators) can branch on `code` rather than message text. Frozen so the
// catalog is tamper-proof at runtime.
//
// Compatibility: Node.js 18+ and React Native (Hermes).
'use strict';


const ERRORS = {

  TEMPLATE_INVALID: {
    code: 'THEME_TEMPLATE_INVALID',
    message: 'Template is missing a required section (color, dimension or font).'
  },

  TEMPLATE_COLOR_RULE_INVALID: {
    code: 'THEME_TEMPLATE_COLOR_RULE_INVALID',
    message: 'A color swatch rule must declare either "ref" or "operation".'
  },

  TEMPLATE_SCALE_INVALID: {
    code: 'THEME_TEMPLATE_SCALE_INVALID',
    message: 'A dimension scale must declare a known type ("modular" or "linear").'
  },

  THEME_VALUES_INVALID: {
    code: 'THEME_VALUES_INVALID',
    message: 'Theme values must be an object with optional color/dimension/font groups.'
  },

  FONT_FAMILY_UNREGISTERED: {
    code: 'THEME_FONT_FAMILY_UNREGISTERED',
    message: 'Theme references a font family the host has not registered.'
  },

  OPERATION_UNKNOWN: {
    code: 'THEME_OPERATION_UNKNOWN',
    message: 'A color swatch references an unknown operation.'
  },

  SCALE_TYPE_UNKNOWN: {
    code: 'THEME_SCALE_TYPE_UNKNOWN',
    message: 'A dimension scale declares an unknown type (expected "modular" or "linear").'
  }

};


// Freeze each entry and the catalog so codes/messages cannot be mutated.
Object.keys(ERRORS).forEach(function (key) {
  Object.freeze(ERRORS[key]);
});

module.exports = Object.freeze(ERRORS);
