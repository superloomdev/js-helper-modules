// Info: Font family registry and @font-face CSS construction.
//
// Class G pure parent. Owns the family registry, family-name resolution,
// and @font-face CSS string construction. Zero platform dependencies:
// no DOM, no React, no react-native, no Expo. Testable in pure Node.
//
// The adapter contract (see docs/api.md) defines the function set an
// -ext-* extension must implement. The core builds @font-face strings;
// extensions inject them into the platform (DOM, native, Expo).
//
// Provides: registerFamilies, resolveFamily, buildFontFaceString,
//           getManifest, getRegisteredFamilies.
//
// Compatibility: Node.js 18+ and any JavaScript runtime. No platform
// dependencies.
//
// Loader pattern: SINGLETON. The public (Font) and private (_Font)
// objects live at module scope; the loader injects Lib + config and
// initializes ERRORS + Validators. Node's require cache guarantees one
// Font per process.
'use strict';


// Injected dependencies + sibling modules, set by the loader (module-scope).
let Lib;        // shared_libs container (Lib.Utils used for type checks)
let CONFIG;     // merged config; DEFAULT_FAMILY fallback
let ERRORS;     // frozen error catalog
let Validators; // validators module, initialized with Lib


// Mutable registry state (module-scope).
// families: { [familyName]: { styles: { [styleKey]: { url, weight, style } } } }
// tokenMap: { [token]: familyName }
const registry = {
  families: {},
  tokenMap: {}
};


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib, merges config, initializes ERRORS +
Validators, seeds the 'System' family, and returns the module-scope
Font object.

@param {Object} shared_libs - Lib container (uses shared_libs.Utils)
@param {Object} config - Overrides merged over module config defaults

@return {Object} - Public Font interface
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Capture injected deps and merge config over module defaults
  Lib = shared_libs || {};
  CONFIG = Object.assign({}, require('./font.config'), config || {});
  ERRORS = require('./font.errors');

  // Build the validators subloader (fails fast on a malformed config)
  Validators = require('./font.validators')(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Seed the System family - always present on every platform
  registry.families['System'] = { styles: {} };
  registry.tokenMap['System'] = 'System';

  return Font;

};/////////////////////////// Module-Loader END ///////////////////////////////


/////////////////////////// Public Functions START /////////////////////////////
const Font = {


  // ~~~~~~~~~~~~~~~~~~~~ Registry ~~~~~~~~~~~~~~~~~~~~

  /********************************************************************
  Register font families from a manifest object. Each key in the
  manifest is a family name; each value is an object with a `styles`
  map or a flat `url`/`weight`/`style` for a single weight.

  Example manifest:
  {
    Poppins: {
      styles: {
        '400': { url: 'https://fonts.gstatic.com/.../poppins-400.woff2' },
        '600': { url: 'https://fonts.gstatic.com/.../poppins-600.woff2' }
      }
    },
    Lora: {
      url: 'https://example.com/lora-regular.ttf',
      weight: '400'
    }
  }

  @param {Object} manifest - Family manifest object

  @return {Object} - { success, error }
  *********************************************************************/
  registerFamilies: function (manifest) {

    // Validate manifest
    const manifestError = Validators.validateManifest(manifest);
    if (manifestError) {

      return {
        success: false,
        error: manifestError
      };

    }

    // Process each family in the manifest
    const familyNames = Object.keys(manifest);

    for (let i = 0; i < familyNames.length; i++) {

      // Validate the family name
      const familyName = familyNames[i];
      const nameError = Validators.validateFamilyName(familyName);
      if (nameError) {

        return {
          success: false,
          error: nameError
        };

      }

      // Register the family with its styles
      _Font.registerFamily(familyName, manifest[familyName]);

      // Create a token mapping (token = family name by default)
      registry.tokenMap[familyName] = familyName;

    }

    return {
      success: true,
      error: null
    };

  },


  /********************************************************************
  Resolve a theme token to a concrete font-family string. Returns
  the DEFAULT_FAMILY when the token is not registered.

  @param {String} token - Theme token (family name)

  @return {Object} - { success, family, error }
  *********************************************************************/
  resolveFamily: function (token) {

    // Validate token
    const tokenError = Validators.validateToken(token);
    if (tokenError) {

      return {
        success: false,
        family: null,
        error: tokenError
      };

    }

    // Look up the token in the registry
    const family = registry.tokenMap[token];

    if (family) {

      return {
        success: true,
        family: family,
        error: null
      };

    }

    // Fall back to the default family
    return {
      success: true,
      family: CONFIG.DEFAULT_FAMILY,
      error: null
    };

  },


  // ~~~~~~~~~~~~~~~~~~~~ @font-face Construction ~~~~~~~~~~~~~~~~~~~~

  /********************************************************************
  Build a @font-face CSS string from a family name and URL. The
  weight and style are optional. The string is pure computation;
  the web extension injects it into the DOM.

  @param {String} name   - Font family name
  @param {String} url    - Font file URL
  @param {String} weight - Font weight (e.g. '400', '600') (optional)
  @param {String} style  - Font style ('normal' or 'italic') (optional)

  @return {Object} - { success, css, error }
  *********************************************************************/
  buildFontFaceString: function (name, url, weight, style) {

    // Validate family name
    const nameError = Validators.validateFamilyName(name);
    if (nameError) {

      return {
        success: false,
        css: null,
        error: nameError
      };

    }

    // Validate URL
    const urlError = Validators.validateUrl(url);
    if (urlError) {

      return {
        success: false,
        css: null,
        error: urlError
      };

    }

    // Validate weight
    const weightError = Validators.validateWeight(weight);
    if (weightError) {

      return {
        success: false,
        css: null,
        error: weightError
      };

    }

    // Validate style
    const styleError = Validators.validateStyle(style);
    if (styleError) {

      return {
        success: false,
        css: null,
        error: styleError
      };

    }

    // Build the @font-face CSS string
    const css = _Font.constructFontFace(name, url, weight, style);

    return {
      success: true,
      css: css,
      error: null
    };

  },


  // ~~~~~~~~~~~~~~~~~~~~ Introspection ~~~~~~~~~~~~~~~~~~~~

  /********************************************************************
  Get the current manifest of registered families and their styles.

  @return {Object} - { success, manifest, error }
  *********************************************************************/
  getManifest: function () {

    // Build a serializable manifest from the registry
    const manifest = {};

    const familyNames = Object.keys(registry.families);

    for (let i = 0; i < familyNames.length; i++) {

      const familyName = familyNames[i];
      const family = registry.families[familyName];
      const styleKeys = Object.keys(family.styles);

      // Only include families with actual style entries
      if (styleKeys.length > 0) {

        manifest[familyName] = { styles: {} };

        for (let j = 0; j < styleKeys.length; j++) {

          const styleKey = styleKeys[j];
          const entry = family.styles[styleKey];

          manifest[familyName].styles[styleKey] = {
            url: entry.url,
            weight: entry.weight || null,
            style: entry.style || 'normal'
          };

        }

      }

    }

    return {
      success: true,
      manifest: manifest,
      error: null
    };

  },


  /********************************************************************
  Get the list of registered family names, including 'System'.

  @return {Object} - { success, families, error }
  *********************************************************************/
  getRegisteredFamilies: function () {

    return {
      success: true,
      families: Object.keys(registry.families),
      error: null
    };

  }


};/////////////////////////// Public Functions END /////////////////////////////


/////////////////////////// Private Functions START ////////////////////////////
const _Font = {


  /********************************************************************
  Register a single family with its styles.

  @param {String} familyName - The family name
  @param {Object} entry       - The manifest entry for this family

  @return {void}
  *********************************************************************/
  registerFamily: function (familyName, entry) {

    // Ensure the family exists in the registry
    if (!registry.families[familyName]) {
      registry.families[familyName] = { styles: {} };
    }

    // If entry has a `styles` map, register each style
    if (entry.styles && Lib.Utils.isObject(entry.styles)) {

      const styleKeys = Object.keys(entry.styles);

      for (let i = 0; i < styleKeys.length; i++) {

        const styleKey = styleKeys[i];
        const styleEntry = entry.styles[styleKey];

        _Font.registerStyle(familyName, styleKey, styleEntry);

      }

    } else {

      // Flat entry: single style with optional weight and style
      const weight = entry.weight || '400';
      const styleKey = weight;

      _Font.registerStyle(familyName, styleKey, {
        url: entry.url,
        weight: weight,
        style: entry.style || 'normal'
      });

    }

  },


  /********************************************************************
  Register a single style entry for a family.

  @param {String} familyName - The family name
  @param {String} styleKey   - The style key (weight or weight-style)
  @param {Object} styleEntry  - { url, weight, style }

  @return {void}
  *********************************************************************/
  registerStyle: function (familyName, styleKey, styleEntry) {

    registry.families[familyName].styles[styleKey] = {
      url: styleEntry.url,
      weight: styleEntry.weight || null,
      style: styleEntry.style || 'normal'
    };

  },


  /********************************************************************
  Construct a @font-face CSS string from parts.

  @param {String} name   - Font family name
  @param {String} url    - Font file URL
  @param {String} weight - Font weight (optional)
  @param {String} style  - Font style (optional)

  @return {String} - The @font-face CSS string
  *********************************************************************/
  constructFontFace: function (name, url, weight, style) {

    // Build the declarations array
    const declarations = [
      'font-family: \'' + name + '\';',
      'src: url(\'' + url + '\');'
    ];

    // Add weight declaration when provided
    if (weight) {
      declarations.push('font-weight: ' + weight + ';');
    }

    // Add style declaration when provided (default 'normal')
    declarations.push('font-style: ' + (style || 'normal') + ';');

    return '@font-face { ' + declarations.join(' ') + ' }';

  }


};////////////////////////// Private Functions END ////////////////////////////
