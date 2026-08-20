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
//           getManifest, getRegisteredFamilies, isRegistered.
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
// families: { [familyName]: { styles: { [styleKey]: { url, path, asset, weight, style } } } }
// tokenMap: { [token]: familyName }  (direct family-name lookups)
// roles: { [role]: familyName }     (role-to-family mapping for resolveFamily)
const registry = {
  families: {},
  tokenMap: {},
  roles: {}
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

  // Seed role mappings from config (if provided)
  if (CONFIG.roles && Lib.Utils.isObject(CONFIG.roles)) {
    const roleKeys = Object.keys(CONFIG.roles);
    for (let r = 0; r < roleKeys.length; r++) {
      registry.roles[roleKeys[r]] = CONFIG.roles[roleKeys[r]];
    }
  }

  return Font;

};/////////////////////////// Module-Loader END ///////////////////////////////


/////////////////////////// Public Functions START /////////////////////////////
const Font = {


  // ~~~~~~~~~~~~~~~~~~~~ Registry ~~~~~~~~~~~~~~~~~~~~

  /********************************************************************
  Register font families from a manifest object. Each key in the
  manifest is a family name; each value is an object with a `styles`
  map or a flat entry for a single weight.

  Each style entry must have at least one source field:
  - url:   remote URL (used by web extension for @font-face)
  - path:  local file path (used by native extensions)
  - asset: requireable module ID (used by Expo extension)

  Example manifest:
  {
  Poppins: {
  styles: {
        '400': { url: 'https://fonts.gstatic.com/.../poppins-400.woff2', path: '/app/fonts/poppins-400.ttf' },
        '600': { url: 'https://fonts.gstatic.com/.../poppins-600.woff2', path: '/app/fonts/poppins-600.ttf' }
  }
  },
  Lora: {
  url: 'https://example.com/lora-regular.ttf',
  path: '/app/fonts/lora-regular.ttf',
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
  Register role-to-family mappings. Merges into the existing role
  map, overwriting any existing role mappings. Roles allow
  resolveFamily to accept theme tokens like 'primary' and resolve
  them to concrete family names like 'Poppins_400Regular'.

  Example:
  Font.registerRoles({ primary: 'Poppins_400Regular', secondary: 'Poppins_600SemiBold' });

  @param {Object} roles - Mapping of role names to family names

  @return {Object} - { success, error }
  *********************************************************************/
  registerRoles: function (roles) {

    // Validate the roles mapping
    const rolesError = Validators.validateRoles(roles);
    if (rolesError) {

      return {
        success: false,
        error: rolesError
      };

    }

    // Merge role mappings into the registry
    const roleKeys = Object.keys(roles);
    for (let i = 0; i < roleKeys.length; i++) {
      registry.roles[roleKeys[i]] = roles[roleKeys[i]];
    }

    return {
      success: true,
      error: null
    };

  },


  /********************************************************************
  Resolve a theme token to a concrete font-family string. Returns
  the DEFAULT_FAMILY when the token is not registered.

  Lookup order:
  1. Role mapping (e.g. 'primary' -> 'Poppins_400Regular')
  2. Direct family name (e.g. 'Poppins' -> 'Poppins')
  3. DEFAULT_FAMILY fallback (e.g. 'System')

  @param {String} token - Theme token (role name or family name)

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

    // 1. Check role mapping first (e.g. 'primary' -> 'Poppins_400Regular')
    if (registry.roles[token]) {

      return {
        success: true,
        family: registry.roles[token],
        error: null
      };

    }

    // 2. Check direct family-name lookup (e.g. 'Poppins' -> 'Poppins')
    const family = registry.tokenMap[token];

    if (family) {

      return {
        success: true,
        family: family,
        error: null
      };

    }

    // 3. Fall back to the default family
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
    const css = _Font.buildFontFaceCss(name, url, weight, style);

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

        // Copy each style entry into the manifest
        for (let j = 0; j < styleKeys.length; j++) {

          const styleKey = styleKeys[j];
          const entry = family.styles[styleKey];

          manifest[familyName].styles[styleKey] = {
            url: entry.url || null,
            path: entry.path || null,
            asset: entry.asset !== undefined ? entry.asset : null,
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

  },


  /********************************************************************
  Check whether a family name is registered in the font registry.
  Returns true for any family added via registerFamilies plus the
  seeded 'System' family.

  @param {String} familyName - The family name to check

  @return {Boolean} - true if the family is registered, false otherwise
  *********************************************************************/
  isRegistered: function (familyName) {

    // Validate the family name (throws TypeError on programmer error)
    Validators.assertFamilyName(familyName, 'isRegistered');

    // Check the registry for the family name
    return Object.prototype.hasOwnProperty.call(registry.families, familyName);

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

    // Check for a styles map and register each style entry
    if (entry.styles && Lib.Utils.isObject(entry.styles)) {

      const styleKeys = Object.keys(entry.styles);

      for (let i = 0; i < styleKeys.length; i++) {

        const styleKey = styleKeys[i];
        const styleEntry = entry.styles[styleKey];

        _Font.registerStyle(familyName, styleKey, styleEntry);

      }

    } else {

      // Handle flat entry as a single style with optional weight
      const weight = entry.weight || '400';
      const styleKey = weight;

      _Font.registerStyle(familyName, styleKey, {
        url: entry.url,
        path: entry.path,
        asset: entry.asset,
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

    // Validate that at least one source is present
    const sourceError = Validators.validateStyleEntry(styleEntry);
    if (sourceError) {
      throw new TypeError('[helper-font] registerStyle: styleEntry must have at least one source field');
    }

    registry.families[familyName].styles[styleKey] = {
      url: styleEntry.url || null,
      path: styleEntry.path || null,
      asset: styleEntry.asset !== undefined ? styleEntry.asset : null,
      weight: styleEntry.weight || null,
      style: styleEntry.style || 'normal'
    };

  },


  /********************************************************************
  Build a @font-face CSS string from parts.

  @param {String} name   - Font family name
  @param {String} url    - Font file URL
  @param {String} weight - Font weight (optional)
  @param {String} style  - Font style (optional)

  @return {String} - The @font-face CSS string
  *********************************************************************/
  buildFontFaceCss: function (name, url, weight, style) {

    // Build the font-family and src declarations
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
