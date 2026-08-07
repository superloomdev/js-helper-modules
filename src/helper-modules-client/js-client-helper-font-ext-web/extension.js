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
'use strict';


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
module.exports = function loader (shared_libs, config) {

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
    throw new TypeError('[helper-font-ext-web] shared_libs.Font is required (the js-client-helper-font instance)');
  }

  // Mutable per-instance state
  const state = {
    loaded: false,
    styleNode: null,
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

      try {

        // Build all @font-face CSS strings from the manifest
        const cssStrings = [];
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
            }

          }

          // Track this family as loaded
          state.loadedFamilies.add(familyName);

        }

        // Only inject when there are new CSS strings to add
        if (cssStrings.length > 0) {

          // Create a <style> element and inject the CSS
          const styleNode = doc.createElement('style');
          styleNode.setAttribute('data-font-loader', 'helper-font-ext-web');
          styleNode.textContent = cssStrings.join('\n');

          // Append to the configured parent element
          const parent = doc.querySelector(CONFIG.PARENT_SELECTOR) || doc.head || doc.documentElement;

          if (parent) {
            parent.appendChild(styleNode);
          }

          // Record the style node and mark as loaded
          state.styleNode = styleNode;
          state.loaded = true;

        }

        return {
          success: true,
          error: null
        };

      } catch (domError) {

        // Log the DOM error and return a document-unavailable envelope
        if (Lib.Debug) {
          Lib.Debug.debug('helper-font-ext-web loadManifest failed', {
            message: domError.message
          });
        }

        return {
          success: false,
          error: ERRORS.DOCUMENT_UNAVAILABLE
        };

      }

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


    /********************************************************************
    Check whether a specific font family has been loaded by this adapter.

    @param {String} familyName - The family name to check

    @return {Object} - { success, loaded, error }
    *********************************************************************/
    isFamilyLoaded: function (familyName) {

      return {
        success: true,
        loaded: state.loadedFamilies.has(familyName),
        error: null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Cleanup ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Remove the injected style node from the DOM. Useful for hot
    reload or test cleanup.

    @return {Object} - { success, error }
    *********************************************************************/
    unload: function () {

      // Remove the style node from the DOM if present
      if (state.styleNode && state.styleNode.parentNode) {
        state.styleNode.parentNode.removeChild(state.styleNode);
      }

      // Reset all loaded state
      state.styleNode = null;
      state.loaded = false;
      state.loadedFamilies.clear();

      return {
        success: true,
        error: null
      };

    }

  };///////////////////////////Public Functions END//////////////////////////////

  return WebFontAdapter;

};/////////////////////////// createInterface END //////////////////////////////
