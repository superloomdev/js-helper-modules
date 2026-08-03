// Info: React Native font loader adapter for the font family system.
//
// Class H extension of js-client-helper-font. Implements the adapter
// contract: loadManifest and isReady. Uses @vitrion/react-native-load-fonts
// to load font files natively on iOS and Android.
//
// No React import, no hooks, no components. The native loader package is
// the only RN-bound dependency, injected via shared_libs so tests can stub
// it in pure Node (same discipline as js-rn-helper-kv-mmkv).
//
// Compatibility: React Native (iOS, Android). Node.js for testing with
// a stubbed native loader.
//
// Factory pattern: each loader call returns an independent instance with
// its own loaded state.
'use strict';


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
loaded state.

@param {Object} shared_libs - Lib container; requires Font (the core
                              font instance), NativeFontLoader (the
                              @vitrion/react-native-load-fonts module);
                              optional Utils, Debug
@param {Object} config      - Overrides merged over defaults

@return {Object} - Public adapter interface
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    Font: shared_libs.Font,
    NativeFontLoader: shared_libs.NativeFontLoader
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    require('./extension.config'),
    config || {}
  );

  // Error catalog (frozen, owned by the main module)
  const ERRORS = require('./extension.errors');

  // Validators singleton
  const Validators = require('./extension.validators')(Lib, ERRORS);

  // Validate config immediately
  Validators.validateConfig(CONFIG);

  // Validate Font core injection
  if (Lib.Utils.isNullOrUndefined(Lib.Font)) {
    throw new TypeError('helper-font-ext-rn: shared_libs.Font is required (the js-client-helper-font instance)');
  }

  // Validate native loader injection
  if (Lib.Utils.isNullOrUndefined(Lib.NativeFontLoader)) {
    throw new TypeError('helper-font-ext-rn: shared_libs.NativeFontLoader is required (the @vitrion/react-native-load-fonts module)');
  }

  // Mutable per-instance state
  const state = {
    loaded: false,
    loadedCount: 0,
    failedCount: 0
  };

  return createInterface(Lib, CONFIG, ERRORS, Validators, state);

};///////////////////////////// Module-Loader END ///////////////////////////////


/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public interface for one instance.

@param {Object} Lib       - Dependency container
@param {Object} CONFIG    - Merged configuration
@param {Object} ERRORS    - Frozen error catalog
@param {Object} Validators - Validators singleton
@param {Object} state     - Mutable state holder

@return {Object} - Public adapter interface
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, state) {

  ///////////////////////////Public Functions START//////////////////////////////
  const RNFontAdapter = {


    // ~~~~~~~~~~~~~~~~~~~~ Adapter Contract ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Load all font families from the core's manifest. Iterates the
    manifest, calls the native loader for each font file, and tracks
    success/failure counts.

    @param {Object} manifest - The manifest from Font.getManifest()

    @return {Promise<Object>} - { success, error }
    *********************************************************************/
    loadManifest: async function (manifest) {

      // Validate manifest
      const manifestError = Validators.validateManifest(manifest);
      if (manifestError) {

        return {
          success: false,
          error: manifestError
        };

      }

      // Reset state for this load cycle
      state.loaded = false;
      state.loadedCount = 0;
      state.failedCount = 0;

      const familyNames = Object.keys(manifest);
      const loadPromises = [];

      for (let i = 0; i < familyNames.length; i++) {

        const familyName = familyNames[i];
        const family = manifest[familyName];
        const styleKeys = Object.keys(family.styles);

        for (let j = 0; j < styleKeys.length; j++) {

          const styleKey = styleKeys[j];
          const entry = family.styles[styleKey];

          // Build the load promise for this font file
          const loadPromise = _RN.loadFontFile(
            Lib, CONFIG, ERRORS, state,
            familyName, entry
          );

          loadPromises.push(loadPromise);

        }

      }

      // Wait for all font loads to settle
      const results = await Promise.allSettled(loadPromises);

      // Tally results
      for (let k = 0; k < results.length; k++) {

        if (results[k].status === 'fulfilled') {
          state.loadedCount++;
        } else {
          state.failedCount++;
        }

      }

      // Determine overall success
      if (state.failedCount > 0 && CONFIG.FAIL_ON_ERROR) {

        return {
          success: false,
          error: ERRORS.LOAD_FAILED
        };

      }

      state.loaded = true;

      return {
        success: true,
        error: null
      };

    },


    /********************************************************************
    Check whether all registered fonts have finished loading.

    @return {Object} - { success, ready, error }
    *********************************************************************/
    isReady: function () {

      return {
        success: true,
        ready: state.loaded,
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Introspection ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Get the count of successfully loaded fonts.

    @return {Object} - { success, count, error }
    *********************************************************************/
    getLoadedCount: function () {

      return {
        success: true,
        count: state.loadedCount,
        error: null
      };

    },


    /********************************************************************
    Get the count of fonts that failed to load.

    @return {Object} - { success, count, error }
    *********************************************************************/
    getFailedCount: function () {

      return {
        success: true,
        count: state.failedCount,
        error: null
      };

    }

  };///////////////////////////Public Functions END//////////////////////////////

  return RNFontAdapter;

};/////////////////////////// createInterface END //////////////////////////////


/////////////////////////// Private Functions START ////////////////////////////
const _RN = {


  /********************************************************************
    Load a single font file via the native loader. The native loader
    expects (name, url) or (name, file path). We pass the family name
    and the URL from the manifest entry.

    @param {Object} Lib       - Dependency container
    @param {Object} CONFIG    - Merged configuration
    @param {Object} ERRORS    - Error catalog
    @param {Object} state     - Mutable state holder
    @param {String} familyName - Font family name
    @param {Object} entry      - Manifest style entry { url, weight, style }

    @return {Promise<void>}
    *********************************************************************/
  loadFontFile: async function (Lib, CONFIG, ERRORS, state, familyName, entry) {

    // Call the native loader with the family name and URL
    // The @vitrion/react-native-load-fonts API accepts (name, url)
    const nativeLoader = Lib.NativeFontLoader;

    // The loader may expose loadFont or loadFonts; we support both
    if (Lib.Utils.isFunction(nativeLoader.loadFont)) {

      await nativeLoader.loadFont(familyName, entry.url);

    } else if (Lib.Utils.isFunction(nativeLoader.loadFonts)) {

      // loadFonts accepts a map of { name: url }
      const fontMap = {};
      fontMap[familyName] = entry.url;
      await nativeLoader.loadFonts(fontMap);

    } else {

      throw new Error('helper-font-ext-rn: native loader does not expose loadFont or loadFonts');

    }

  }


};////////////////////////// Private Functions END ////////////////////////////
