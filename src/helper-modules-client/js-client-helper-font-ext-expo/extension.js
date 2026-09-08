// Info: Expo font loader adapter for the font family system.
//
// Class H extension of js-client-helper-font. Implements the adapter
// contract: loadManifest and isReady. Uses expo-font's loadAsync to
// load fonts on native (asset/path) and web (url).
//
// The expo-font package is a direct dependency (not injected by the app).
// Tests stub it via _test/package.json alias.
//
// No React import, no hooks, no components.
//
// Compatibility: Expo (iOS, Android, Web). Node.js for testing with
// a stubbed expo-font module.
//
// Factory pattern: each loader call returns an independent instance with
// its own loaded state.
import * as ExpoFont from 'expo-font';
import CONFIG_DEFAULTS from './extension.config.js';
import ERRORS from './extension.errors.js';
import createValidators from './extension.validators.js';


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
    throw new TypeError('[helper-font-ext-expo] shared_libs.Font is required (the js-client-helper-font instance)');
  }

  // Mutable per-instance state
  const state = {
    loaded: false,
    loadedCount: 0,
    failedCount: 0,
    loadedFamilies: new Set(),
    loadedStyles: new Set(),
    failedStyles: new Set(),
    loadQueue: null,
    pendingLoads: 0
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
  const ExpoFontAdapter = {


    // ~~~~~~~~~~~~~~~~~~~~ Adapter Contract ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Load all font families from the core's manifest. Iterates the
    manifest, resolves the best source for each entry (asset on native,
    url on web, path as fallback), calls expo-font's loadAsync, and
    tracks success/failure counts.

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

      // Queue this cycle so overlapping calls cannot duplicate Expo work
      const previousLoad = state.loadQueue;
      let releaseLoad;
      const currentLoad = new Promise(function (resolve) {
        releaseLoad = resolve;
      });
      state.pendingLoads++;
      state.loaded = false;
      state.loadQueue = currentLoad;
      if (previousLoad) {
        await previousLoad;
      }
      const completeLoad = function (result) {
        state.pendingLoads--;
        if (state.pendingLoads > 0) {
          state.loaded = false;
        }
        releaseLoad();
        if (state.loadQueue === currentLoad) {
          state.loadQueue = null;
        }
        return result;
      };

      // Reset counters for this load cycle
      state.loadedCount = 0;
      state.failedCount = 0;
      state.loaded = false;

      const SEPARATOR = '\u001F';
      const familyNames = Object.keys(manifest);
      const loadEntries = [];

      for (let i = 0; i < familyNames.length; i++) {

        const familyName = familyNames[i];
        const family = manifest[familyName];
        const styleKeys = Object.keys(family.styles);

        for (let j = 0; j < styleKeys.length; j++) {

          const styleKey = styleKeys[j];
          const entry = family.styles[styleKey];

          // Skip styles already loaded (style-level incremental loading).
          // The composite key uses \u001F (ASCII Unit Separator) so it cannot
          // collide with any human-readable identifier.
          const compositeKey = familyName + SEPARATOR + styleKey;
          if (state.loadedStyles.has(compositeKey)) {
            continue;
          }

          // Build the load promise for this font
          const loadPromise = _Expo.loadFont(
            Lib, CONFIG, ERRORS, Validators, state,
            familyName, styleKey, entry
          );

          loadEntries.push({ familyName: familyName, styleKey: styleKey, promise: loadPromise });

        }

      }

      // Wait for all font loads to settle
      const results = await Promise.allSettled(loadEntries.map(function (item) {
        return item.promise;
      }));

      // Track success and failure at the style level (not family level)
      // so a successful style from a partially failing call is retained.
      const successfulStyleKeys = new Set();
      const failedStyleKeys = new Set();
      for (let k = 0; k < results.length; k++) {
        const compositeKey = loadEntries[k].familyName + SEPARATOR + loadEntries[k].styleKey;
        if (results[k].status === 'fulfilled') {
          state.loadedCount++;
          successfulStyleKeys.add(compositeKey);
        } else {
          state.failedCount++;
          failedStyleKeys.add(compositeKey);
        }
      }

      // Record every successful style independently of family completion.
      // Remove it from failedStyles in case a prior call had marked it failed.
      for (let i = 0; i < loadEntries.length; i++) {
        const compositeKey = loadEntries[i].familyName + SEPARATOR + loadEntries[i].styleKey;
        if (successfulStyleKeys.has(compositeKey)) {
          state.loadedStyles.add(compositeKey);
          state.failedStyles.delete(compositeKey);
        } else {
          state.failedStyles.add(compositeKey);
        }
      }

      // Determine family-level loaded status. A family is loaded only when
      // every style in this call succeeded and no prior failure remains.
      const familyOutcomes = {};
      for (let i = 0; i < loadEntries.length; i++) {
        const fn = loadEntries[i].familyName;
        if (!(fn in familyOutcomes)) {
          familyOutcomes[fn] = { allSuccess: true };
        }
        const key = fn + SEPARATOR + loadEntries[i].styleKey;
        if (failedStyleKeys.has(key)) {
          familyOutcomes[fn].allSuccess = false;
        }
      }

      const outcomeFamilyNames = Object.keys(familyOutcomes);
      for (let i = 0; i < outcomeFamilyNames.length; i++) {
        const fn = outcomeFamilyNames[i];
        if (familyOutcomes[fn].allSuccess) {
          state.loadedFamilies.add(fn);
          if (Lib.Utils.isFunction(Lib.Font.markLoaded) && Lib.Font.isRegistered(fn)) {
            Lib.Font.markLoaded(fn);
          }
        } else {
          state.loadedFamilies.delete(fn);
        }
      }

      // Set readiness before either strict failure or lenient success returns
      state.loaded = failedStyleKeys.size === 0;

      // Determine overall success
      if (state.failedCount > 0 && CONFIG.FAIL_ON_ERROR) {

        return completeLoad({
          success: false,
          error: ERRORS.LOAD_FAILED
        });

      }

      return completeLoad({
        success: true,
        error: null
      });

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

    },


    // ~~~~~~~~~~~~~~~~~~~~ Cleanup ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Reset all loaded state. Useful for hot reload or test cleanup.
    Clears loadedFamilies, loadedStyles, and failedStyles so a
    subsequent loadManifest call reloads every style from scratch.

    @return {void}
    *********************************************************************/
    clearManifest: function () {

      state.loaded = false;
      state.loadedCount = 0;
      state.failedCount = 0;
      state.loadedFamilies.clear();
      state.loadedStyles.clear();
      state.failedStyles.clear();

    }

  };///////////////////////////Public Functions END//////////////////////////////

  return ExpoFontAdapter;

};/////////////////////////// createInterface END //////////////////////////////


/////////////////////////// Private Functions START ////////////////////////////
const _Expo = {


  /********************************************************************
  Load a single font via expo-font's loadAsync. Resolves the best
  source based on what's available in the entry:
  1. asset (Expo requireable module ID) - native
  2. url (remote URL) - web
  3. path (local file path) - native fallback

  expo-font's loadAsync accepts (familyName, source) where source
  can be a requireable module, a URI string, or an object with
  { uri, displayNames, ... }.

  @param {Object} Lib       - Dependency container
  @param {Object} CONFIG    - Merged configuration
  @param {Object} ERRORS    - Error catalog
  @param {Object} Validators - Validators singleton
  @param {Object} state     - Mutable state holder
  @param {String} familyName - Font family name (with style suffix)
  @param {String} styleKey   - Weight/style key
  @param {Object} entry      - Manifest style entry

  @return {Promise<void>}
  *********************************************************************/
  loadFont: async function (Lib, CONFIG, ERRORS, Validators, state, familyName, styleKey, entry) {

    // Validate that the entry has at least one source
    const sourceError = Validators.validateStyleEntry(entry);
    if (sourceError) {
      throw new TypeError('[helper-font-ext-expo] loadFont: styleEntry must have at least one source field');
    }

    // Resolve the source for expo-font
    const source = _Expo.resolveSource(Lib, entry);

    // expo-font uses the family name as the key. For multiple weights,
    // we append the style key to create a unique font descriptor.
    const fontDescriptor = familyName + '_' + styleKey;

    // Load the font via expo-font's loadAsync
    await ExpoFont.loadAsync(fontDescriptor, source);

  },


  /********************************************************************
  Resolve the best source from a manifest entry.

  Priority: asset > url > path

  @param {Object} Lib   - Dependency container (uses Lib.Utils)
  @param {Object} entry - Manifest style entry

  @return {*} - Source value for expo-font's loadAsync
  *********************************************************************/
  resolveSource: function (Lib, entry) {

    // Check for asset source (highest priority on native)
    if (!Lib.Utils.isNullOrUndefined(entry.asset)) {
      return entry.asset;
    }

    // Check for URL source (web, also works on native with remote fonts)
    if (Lib.Utils.isString(entry.url) && !Lib.Utils.isEmptyString(entry.url)) {
      return entry.url;
    }

    // Check for path source (local file, fallback on native)
    if (Lib.Utils.isString(entry.path) && !Lib.Utils.isEmptyString(entry.path)) {
      return entry.path;
    }

    return null;

  }


};////////////////////////// Private Functions END ////////////////////////////
