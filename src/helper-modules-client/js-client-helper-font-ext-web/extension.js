// Info: Web DOM font loader adapter for the font family system.
//
// Class H extension of js-client-helper-font. Implements the adapter
// contract: loadManifest and isReady. Gets @font-face CSS strings from
// the core (never rebuilds them), creates a <style> node, and appends it
// to document.head.
//
// The DOM arrives naturally (client tier). No React, no react-native.
// Tests run in Node with a minimal document stub injected.
//
// Compatibility: Browser DOM. Node.js for testing with a document stub.
//
// Factory pattern: each loader call returns an independent instance with
// its own loaded state.
import CONFIG_DEFAULTS from './extension.config.js';
import ERRORS from './extension.errors.js';
import createValidators from './extension.validators.js';


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
loaded state.

@param {Object} shared_libs - Lib container; requires Font (the core
                              font instance), Utils, Debug; optional
                              Document (the DOM document object)
@param {Object} config      - Overrides merged over defaults

@return {Object} - Public adapter interface
*********************************************************************/
export default function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    Font: shared_libs.Font,
    Document: shared_libs.Document
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
    throw new TypeError('[helper-font-ext-web] shared_libs.Font is required (the js-client-helper-font instance)');
  }

  // Mutable per-instance state
  const state = {
    loaded: false,
    styleNodes: [],
    loadedFamilies: new Set(),
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
  const WebFontAdapter = {


    // ~~~~~~~~~~~~~~~~~~~~ Adapter Contract ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Load all font families from the core's manifest. Builds @font-face
    CSS strings via the core, creates a <style> node, and appends it
    to the DOM.

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

      // Resolve the document object (injected or global)
      const doc = Lib.Document || (typeof document !== 'undefined' ? document : null);

      if (!doc) {

        return {
          success: false,
          error: ERRORS.DOCUMENT_UNAVAILABLE
        };

      }

      // Queue this cycle so overlapping calls cannot duplicate browser work
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

      try {

        // Build CSS and browser load checks without changing loaded state yet
        const cssStrings = [];
        const cssEntries = [];
        const loadEntries = [];
        const familyNames = Object.keys(manifest);

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

            // Skip entries without a url (native/Expo-only entries)
            const entryError = Validators.validateStyleEntry(entry);
            if (entryError) {
              continue;
            }

            // Build the @font-face string from the core
            const result = Lib.Font.buildFontFaceString(
              familyName,
              entry.url,
              entry.weight,
              entry.style
            );

            if (result.success) {
              cssStrings.push(result.css);
              cssEntries.push({ familyName: familyName, css: result.css });
              loadEntries.push({ familyName: familyName, entry: entry });
            }

          }

        }

        // Inject every valid face before asking the browser to load it
        let styleNode = null;
        if (!Lib.Utils.isEmptyArray(cssStrings)) {
          styleNode = doc.createElement('style');
          styleNode.setAttribute('data-font-loader', 'helper-font-ext-web');
          styleNode.textContent = cssStrings.join('\n');
          const parent = doc.querySelector(CONFIG.PARENT_SELECTOR) || doc.head || doc.documentElement;
          if (!parent) {
            throw new Error('font style parent unavailable');
          }
          parent.appendChild(styleNode);
          state.styleNodes.push(styleNode);
        }

        // Wait for every browser face check when the FontFaceSet API is available
        const checks = loadEntries.map(function (item) {
          if (!doc.fonts || !Lib.Utils.isFunction(doc.fonts.load)) {
            return Promise.reject(new Error('browser font checks unavailable'));
          }
          const style = item.entry.style || 'normal';
          const weight = item.entry.weight || '400';
          return doc.fonts.load(style + ' ' + weight + ' 1em "' + item.familyName + '"').then(function (faces) {
            if (!Array.isArray(faces) || Lib.Utils.isEmptyArray(faces)) {
              throw new Error('browser font check returned no matching faces');
            }
            return item;
          });
        });
        const results = await Promise.allSettled(checks);
        const failedFamilies = new Set();
        const successfulFamilies = new Set();
        for (let i = 0; i < results.length; i++) {
          const familyName = loadEntries[i].familyName;
          if (results[i].status === 'fulfilled') {
            successfulFamilies.add(familyName);
          } else {
            failedFamilies.add(familyName);
          }
        }

        // Mark only families whose loadable faces all completed successfully
        const completedFamilies = Array.from(successfulFamilies);
        for (let i = 0; i < completedFamilies.length; i++) {
          const familyName = completedFamilies[i];
          if (!failedFamilies.has(familyName)) {
            state.loadedFamilies.add(familyName);
            if (Lib.Font.isRegistered(familyName)) {
              Lib.Font.markLoaded(familyName);
            }
          }
        }
        state.loaded = failedFamilies.size === 0;

        // Retain only declarations whose whole family completed successfully
        if (styleNode) {
          const successfulCss = cssEntries
            .filter(function (item) {
              return successfulFamilies.has(item.familyName) && !failedFamilies.has(item.familyName);
            })
            .map(function (item) {
              return item.css;
            });
          if (!Lib.Utils.isEmptyArray(successfulCss)) {
            styleNode.textContent = successfulCss.join('\n');
          } else if (styleNode.parentNode) {
            styleNode.parentNode.removeChild(styleNode);
            state.styleNodes.splice(state.styleNodes.indexOf(styleNode), 1);
          }
        }

        // A browser load rejection is an operational failure, not readiness
        return completeLoad(state.loaded
          ? { success: true, error: null }
          : { success: false, error: ERRORS.DOCUMENT_UNAVAILABLE });

      } catch (domError) {

        // Log the DOM error and return a document-unavailable envelope
        if (Lib.Debug) {
          Lib.Debug.debug('helper-font-ext-web loadManifest failed', {
            message: domError.message
          });
        }

        return completeLoad({
          success: false,
          error: ERRORS.DOCUMENT_UNAVAILABLE
        });

      }

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


    // ~~~~~~~~~~~~~~~~~~~~ Cleanup ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Remove the injected style node from the DOM and reset loaded state.
    Useful for hot reload or test cleanup.

    @return {void}
    *********************************************************************/
    clearManifest: function () {

      // Remove every style node retained across incremental load cycles
      for (let i = 0; i < state.styleNodes.length; i++) {
        if (state.styleNodes[i].parentNode) {
          state.styleNodes[i].parentNode.removeChild(state.styleNodes[i]);
        }
      }

      // Reset all loaded state
      state.styleNodes = [];
      state.loaded = false;
      state.loadedFamilies.clear();

    }

  };///////////////////////////Public Functions END//////////////////////////////

  return WebFontAdapter;

};/////////////////////////// createInterface END //////////////////////////////
