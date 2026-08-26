// Info: React Native font loader adapter for the font family system.
//
// Class H extension of js-client-helper-font. Implements the adapter
// contract: loadManifest and isReady. Uses @vitrion/react-native-load-fonts
// to load font files natively on iOS and Android via loadFontFromFile.
//
// The native loader is a direct dependency (not injected by the app).
// Tests stub it via _test/package.json alias.
//
// No React import, no hooks, no components.
//
// Compatibility: React Native (iOS, Android). Node.js for testing with
// a stubbed native loader.
//
// Factory pattern: each loader call returns an independent instance with
// its own loaded state.
import { createRequire } from 'node:module';
import CONFIG_DEFAULTS from './extension.config.js';
import ERRORS from './extension.errors.js';
import createValidators from './extension.validators.js';
const require = createRequire(import.meta.url);


// Direct dependency — the native font loader. Required at module scope.
// In tests, _test/package.json aliases this to a stub.
const NativeFonts = require('@vitrion/react-native-load-fonts');


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
loaded state.

@param {Object} shared_libs - Lib container; requires Font (the core
                              font instance); optional Utils, Debug
@param {Object} config      - Overrides merged over defaults

@return {Object} - Public adapter interface
*********************************************************************/
export default function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    Font: shared_libs.Font
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    CONFIG_DEFAULTS,
    config || {}
  );

  // Error catalog (frozen, owned by the main module)
  // ERRORS imported at top level

  // Validators singleton
  const Validators = createValidators(Lib, ERRORS);

  // Validate config immediately
  Validators.validateConfig(CONFIG);

  // Validate Font core injection
  if (Lib.Utils.isNullOrUndefined(Lib.Font)) {
    throw new TypeError('[helper-font-ext-rn] shared_libs.Font is required (the js-client-helper-font instance)');
  }

  // Mutable per-instance state
  const state = {
    loaded: false,
    loadedCount: 0,
    failedCount: 0,
    loadedFamilies: new Set()
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

      // Reset counters for this load cycle (loaded state stays true for incremental loading)
      state.loadedCount = 0;
      state.failedCount = 0;

      const familyNames = Object.keys(manifest);
      const loadPromises = [];

      for (let i = 0; i < familyNames.length; i++) {

        const familyName = familyNames[i];

        // Skip families already loaded (incremental loading)
        if (state.loadedFamilies.has(familyName)) {
          continue;
        }

        const family = manifest[familyName];
        const styleKeys = Object.keys(family.styles);

        for (let j = 0; j < styleKeys.length; j++) {

          const styleKey = styleKeys[j];
          const entry = family.styles[styleKey];

          // Build the load promise for this font file
          const loadPromise = _RN.loadFontFile(
            Lib, CONFIG, ERRORS, Validators, state,
            familyName, entry
          );

          loadPromises.push(loadPromise);

        }

        // Track this family as loaded
        state.loadedFamilies.add(familyName);

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

    @return {Boolean} - true if all fonts have loaded, false otherwise
    *********************************************************************/
    isReady: function () {

      return state.loaded;

    },


    /********************************************************************
    Check whether a specific font family has been loaded by this adapter.

    @param {String} familyName - The family name to check

    @return {Boolean} - true if the family has been loaded, false otherwise
    *********************************************************************/
    isFamilyLoaded: function (familyName) {

      return state.loadedFamilies.has(familyName);

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
  @param {Object} Validators - Validators singleton
  @param {Object} state     - Mutable state holder
  @param {String} familyName - Font family name
  @param {Object} entry      - Manifest style entry { url, weight, style }

  @return {Promise<void>}
  *********************************************************************/
  loadFontFile: async function (Lib, CONFIG, ERRORS, Validators, state, familyName, entry) {

    // Validate that the entry has a path (native extensions require local files)
    const pathError = Validators.validateStyleEntry(entry);
    if (pathError) {
      throw new Error(pathError.message);
    }

    // Call the native loader with the family name and local file path
    // @vitrion/react-native-load-fonts exposes loadFontFromFile(name, filePath)
    await NativeFonts.loadFontFromFile(familyName, entry.path);

  }


};////////////////////////// Private Functions END ////////////////////////////
