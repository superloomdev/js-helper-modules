// Info: Font family registry and @font-face CSS construction.
//
// Class G pure parent. Owns the family registry, family-name resolution,
// and @font-face CSS string construction. Zero platform dependencies:
// no DOM, no React, no react-native, no Expo. Testable in pure Node.
//
// The adapter contract (see the API reference) defines the function set an
// -ext-* extension must implement. The core builds @font-face strings;
// extensions inject them into the platform (DOM, native, Expo).
//
// Provides: registerFamilies, resolveFamily, buildFontFaceString,
//           getManifest, getRegisteredFamilies, isRegistered,
//           markLoaded, isFamilyLoaded, registerPlatformName,
//           getPlatformName.
//
// Compatibility: Node.js 24+ and any JavaScript runtime. No platform
// dependencies.
//
// Loader pattern: FACTORY. Each call captures dependencies, configuration,
// validators, and mutable registry state in one independent Font instance.
import CONFIG_DEFAULTS from './font.config.js';
import ERRORS from './font.errors.js';
import createValidators from './font.validators.js';


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. Captures Lib and config, initializes Validators,
seeds the System family, and returns one independent Font object.

@param {Object} shared_libs - Lib container (uses shared_libs.Utils)
@param {Object} config - Overrides merged over module config defaults

@return {Object} - Public Font interface
*********************************************************************/
export default function loader (shared_libs, config) {

  // Capture injected deps and merge config over module defaults
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug
  };
  const CONFIG = Object.assign({}, CONFIG_DEFAULTS, config || {});

  // Build the validators subloader (fails fast on a malformed config)
  const Validators = createValidators(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Create isolated mutable state and seed the platform System family.
  // All three maps use Object.create(null) so family, role, and token names
  // cannot collide with inherited Object.prototype members.
  const state = {
    families: Object.create(null),
    tokenMap: Object.create(null),
    loaded: new Set(),
    roles: Object.create(null),
    platformNames: Object.create(null)
  };
  state.families.System = { styles: Object.create(null) };
  state.tokenMap.System = 'System';

  // Seed role mappings from config (if provided)
  if (CONFIG.ROLES && Lib.Utils.isObject(CONFIG.ROLES)) {
    const roleKeys = Object.keys(CONFIG.ROLES);
    for (let r = 0; r < roleKeys.length; r++) {
      state.roles[roleKeys[r]] = CONFIG.ROLES[roleKeys[r]];
    }
  }

  return createInterface(Lib, CONFIG, ERRORS, Validators, state);

};/////////////////////////// Module-Loader END ///////////////////////////////


/////////////////////////// createInterface START //////////////////////////////

const createInterface = function (Lib, CONFIG, ERRORS, Validators, state) {

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

      // Validate manifest shape
      const manifestError = Validators.validateManifest(manifest);
      if (manifestError) {

        return {
          success: false,
          error: manifestError
        };

      }

      // Prevalidate every family and style entry before any mutation.
      // Returns an error envelope for a malformed manifest or family name;
      // throws the same TypeError registerStyle throws for a missing source.
      // Either way, nothing in state has been mutated yet.
      Validators.validateManifestEntries(manifest);

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
        state.tokenMap[familyName] = familyName;

      }

      // Return success with all families registered
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
        state.roles[roleKeys[i]] = roles[roleKeys[i]];
      }

      // Return success with all roles merged
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

      // 1. Check role mapping first (e.g. 'primary' -> 'Poppins_400Regular').
      //    Use hasOwnProperty so inherited names like 'toString' do not match.
      if (Object.prototype.hasOwnProperty.call(state.roles, token)) {

        return {
          success: true,
          family: _Font.resolvePlatformName(state.roles[token]),
          error: null
        };

      }

      // 2. Check direct family-name lookup (e.g. 'Poppins' -> 'Poppins').
      //    Use hasOwnProperty so inherited names do not match.
      if (Object.prototype.hasOwnProperty.call(state.tokenMap, token)) {

        const family = state.tokenMap[token];

        return {
          success: true,
          family: _Font.resolvePlatformName(family),
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

      // Build a serializable manifest from the registry.
      // Use Object.create(null) for the manifest and nested styles objects
      // so a family named __proto__ or constructor survives JSON.stringify
      // and Object.keys. The internal null-prototype maps are not
      // returned directly; values are copied key by key.
      const manifest = Object.create(null);

      const familyNames = Object.keys(state.families);

      for (let i = 0; i < familyNames.length; i++) {

        const familyName = familyNames[i];
        const family = state.families[familyName];
        const styleKeys = Object.keys(family.styles);

        // Only include families with actual style entries
        if (!Lib.Utils.isEmptyArray(styleKeys)) {

          manifest[familyName] = { styles: Object.create(null) };

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

      // Return the manifest envelope
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

      // Return the list of registered family names
      return {
        success: true,
        families: Object.keys(state.families),
        error: null
      };

    },


    /********************************************************************
    Check whether a family name is registered in the font state.
    Returns true for any family added via registerFamilies plus the
    seeded 'System' family.

    @param {String} familyName - The family name to check

    @return {Boolean} - true if the family is registered, false otherwise
    *********************************************************************/
    isRegistered: function (familyName) {

      // Validate the family name (throws TypeError on programmer error)
      Validators.assertFamilyName(familyName, 'isRegistered');

      // Check the registry for the family name
      return Object.prototype.hasOwnProperty.call(state.families, familyName);

    },


    /********************************************************************
    Mark a family as loaded by the platform adapter.

    Registration is a data declaration; loading is a platform I/O
    operation. This function is called by the adapter after it confirms
    the font face is available for rendering. A family can be registered
    but not loaded, which means text renders in a fallback.

    @param {String} familyName - The family name to mark as loaded

    @return {Boolean} - true if the family was not previously marked loaded
    *********************************************************************/
    markLoaded: function (familyName) {

      // Validate the family name (throws TypeError on programmer error)
      Validators.assertFamilyName(familyName, 'markLoaded');

      // Reject a loaded-state claim for a family this registry does not own
      if (!Object.prototype.hasOwnProperty.call(state.families, familyName)) {
        throw new TypeError('[helper-font] markLoaded: family must be registered');
      }

      // Record the loaded state
      const wasLoaded = state.loaded.has(familyName);
      state.loaded.add(familyName);

      // Return whether this is a new load
      return !wasLoaded;

    },


    /********************************************************************
    Check whether a family name has been confirmed loaded by the adapter.

    A family that is registered but not loaded has a name in the registry
    but no confirmed platform font face. Text using such a family renders
    in a fallback with no signal unless this check is called.

    @param {String} familyName - The family name to check

    @return {Boolean} - true if the family is loaded, false otherwise
    *********************************************************************/
    isFamilyLoaded: function (familyName) {

      // Validate the family name (throws TypeError on programmer error)
      Validators.assertFamilyName(familyName, 'isFamilyLoaded');

      // Check the loaded set for the family name
      return state.loaded.has(familyName);

    },


    /********************************************************************
    Record the name a platform adapter actually registered a font under.
    A platform may register a font under a name that differs from the
    family name the core knows (e.g. iOS uses the PostScript name embedded
    in the font file). After recording, resolveFamily returns the
    platform name for that family so text renders in the correct face.

    @param {String} family_name   - The core family name (must be registered)
    @param {String} platform_name - The platform-resolved name

    @return {Object} - { success, error }
    *********************************************************************/
    registerPlatformName: function (family_name, platform_name) {

      // Validate both arguments as non-empty strings (programmer error)
      Validators.assertFamilyName(family_name, 'registerPlatformName');
      if (!Lib.Utils.isString(platform_name) || Lib.Utils.isEmptyString(platform_name)) {
        throw new TypeError(
          '[helper-font] registerPlatformName: platform_name must be a non-empty string'
        );
      }

      // Reject a platform name for a family this registry does not own
      if (!Object.prototype.hasOwnProperty.call(state.families, family_name)) {
        throw new TypeError('[helper-font] registerPlatformName: family must be registered');
      }

      // Record the platform-name mapping
      state.platformNames[family_name] = platform_name;

      // Return the success envelope
      return {
        success: true,
        error: null
      };

    },


    /********************************************************************
    Get the platform-resolved name recorded for a family, if any.

    @param {String} family_name - The core family name

    @return {Object} - { success, platform_name, error }
    *********************************************************************/
    getPlatformName: function (family_name) {

      // Validate the family name (throws TypeError on programmer error)
      Validators.assertFamilyName(family_name, 'getPlatformName');

      // Return the recorded platform name or null when none was recorded.
      // Use hasOwnProperty so an inherited name does not match.
      const platform_name = Object.prototype.hasOwnProperty.call(state.platformNames, family_name)
        ? state.platformNames[family_name]
        : null;

      // Return the envelope
      return {
        success: true,
        platform_name: platform_name,
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

      // Ensure the family exists in the registry.
      // Use hasOwnProperty so an inherited name does not mask a missing family.
      if (!Object.prototype.hasOwnProperty.call(state.families, familyName)) {
        state.families[familyName] = { styles: Object.create(null) };
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

      // Store the style entry in the family registry
      state.families[familyName].styles[styleKey] = {
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

      // Build the font-family and src declarations.
      // Escape the family name and URL for a single-quoted CSS string.
      const declarations = [
        'font-family: \'' + _Font.escapeCssString(name) + '\';',
        'src: url(\'' + _Font.escapeCssString(url) + '\');'
      ];

      // Add weight declaration when provided
      if (weight) {
        declarations.push('font-weight: ' + weight + ';');
      }

      // Add style declaration when provided (default 'normal')
      declarations.push('font-style: ' + (style || 'normal') + ';');

      // Assemble the @font-face rule
      return '@font-face { ' + declarations.join(' ') + ' }';

    },


    /********************************************************************
    Escape a value for interpolation inside a single-quoted CSS string.
    Backslash is escaped to backslash-backslash, single quote to
    backslash-quote, and any character below U+0020 is removed.

    @param {String} value - The value to escape

    @return {String} - The escaped value
    *********************************************************************/
    escapeCssString: function (value) {

      // Escape backslash first so it does not double-escape later replacements,
      // then escape the single quote, then drop control characters below U+0020
      let escaped = value.replace(/\\/g, '\\\\');
      escaped = escaped.replace(/'/g, '\\\'');

      // Drop control characters below U+0020 (cannot appear in a CSS string).
      // Use charCodeAt instead of a control-character regex to satisfy lint.
      let filtered = '';
      for (let c = 0; c < escaped.length; c++) {
        if (escaped.charCodeAt(c) >= 0x20) {
          filtered += escaped.charAt(c);
        }
      }

      // Return the escaped and filtered value
      return filtered;

    },


    /********************************************************************
    Resolve the platform name for a family, if one was recorded. When
    no platform name exists, the family name is returned unchanged so
    resolveFamily behavior is backward-compatible.

    @param {String} family_name - The core family name

    @return {String} - The platform name or the family name unchanged
    *********************************************************************/
    resolvePlatformName: function (family_name) {

      // Return the recorded platform name, or the family name when none exists.
      // Use hasOwnProperty so an inherited name does not match.
      if (Object.prototype.hasOwnProperty.call(state.platformNames, family_name)) {

        return state.platformNames[family_name];

      }

      // Return the family name unchanged when no platform name was recorded
      return family_name;

    }


  };////////////////////////// Private Functions END ////////////////////////////

  return Font;

};/////////////////////////// createInterface END //////////////////////////////
