// Info: React extension for js-client-helper-themer.
//
// Provides ThemeProvider, useThemeController, useTheme, useTokens, and
// ThemeContext. The provider holds the layer stack as React state,
// derives through the pure themer engine on change, and exposes the
// result via context. A transform seam lets the app inject
// engine-agnostic logic (token bridging, font validation, component
// building) without coupling the module to any vocabulary.
//
// Compatibility: React 18+, React Native, React Native Web.
//
// Factory pattern: each loader call returns an independent instance
// with its own React context. The provider calls Lib.React.useState,
// so the singleton pattern is forbidden by the constitution.
//
// Dependency direction: Extension -> Core (extension is boss, core is library)
'use strict';


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
React context and state.

@param {Object} shared_libs - Lib container; requires React (function),
                              Themer (built instance), optional Utils,
                              optional Debug
@param {Object} config      - Overrides merged over defaults

@return {Object} - { ThemeProvider, useThemeController, useTheme,
                     useTokens, ThemeContext }
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    React: shared_libs ? shared_libs.React : undefined,
    Themer: shared_libs ? shared_libs.Themer : undefined,
    Utils: shared_libs ? shared_libs.Utils : undefined,
    Debug: shared_libs ? shared_libs.Debug : undefined
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    require('./extension.config'),
    config || {}
  );

  // Error catalog (frozen, owned by the main module)
  const ERRORS = require('./extension.errors');

  // Validators singleton - Lib and ERRORS injected here
  const Validators = require('./extension.validators')(Lib, ERRORS);

  // Validate injected dependencies so a missing React or Themer fails at startup
  Validators.validateSharedLibs(shared_libs);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Per-instance state: the React context is created once per factory call
  const state = {
    context: Lib.React.createContext(null)
  };

  return createInterface(Lib, CONFIG, ERRORS, Validators, state);

};/////////////////////////// Module-Loader END /////////////////////////////////


/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public interface for one instance. Public functions close
over the provided Lib, CONFIG, ERRORS, Validators, and state.

@param {Object} Lib       - Dependency container (React, Themer, Utils, Debug)
@param {Object} CONFIG    - Merged configuration for this instance
@param {Object} ERRORS    - Frozen error catalog
@param {Object} Validators - Validators singleton
@param {Object} state     - Per-instance state (holds the React context)

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, state) {

  ///////////////////////////Public Functions START//////////////////////////////
  const Extension = {


    // ~~~~~~~~~~~~~~~~~~~~ Context ~~~~~~~~~~~~~~~~~~~~

    // React context object (advanced use / custom consumers). Created once
    // per factory instance, so two loader calls produce isolated contexts.
    ThemeContext: state.context,


    // ~~~~~~~~~~~~~~~~~~~~ Provider ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    ThemeProvider - holds the layer stack as React state, derives a
    theme through the pure themer engine, and provides it via context.
    Calling update_layers with a new array re-derives and re-renders.

@param {Object}   props           - React props
@param {Object}   props.template  - Themer template (required)
@param {Array}    props.layers    - Ordered sparse overlays (required)
@param {String}   props.platform  - Target platform, web or native (required)
@param {Object}   props.options   - Per-call themer options (optional)
@param {Function} props.transform - Transform seam (optional)
@param {Node}     props.children  - Subtree to provide theme to

@return {Object} - React element
    *********************************************************************/
    ThemeProvider: function (props) {

      // Validate props - programmer errors throw TypeError here
      Validators.validateTemplate(props.template);
      Validators.validateLayers(props.layers);
      Validators.validatePlatform(props.platform);
      Validators.validateTransform(props.transform);

      // Hold layers in state so update_layers can trigger a re-derive
      const [currentLayers, setLayers] = Lib.React.useState(props.layers);

      // Derive the theme and build the context value, recomputed only on input change
      const value = Lib.React.useMemo(function () {

        // Build the theme through the pure engine
        const built = Lib.Themer.buildTheme(
          props.template,
          currentLayers,
          props.platform,
          props.options
        );

        // Base context: built result, tokens as theme, and the state setter
        const result = {
          built: built,
          theme: built.tokens,
          update_layers: setLayers
        };

        // Apply the transform seam when provided - the app owns vocabulary bridging
        if (props.transform) {

          const transformed = props.transform(built, currentLayers);

          if (transformed) {

            Object.assign(result, transformed);

          }

        }

        return result;

      }, [props.template, currentLayers, props.platform, props.options, props.transform]);

      // Provide the value to the subtree
      return Lib.React.createElement(state.context.Provider, { value: value }, props.children);

    },


    // ~~~~~~~~~~~~~~~~~~~~ Hooks ~~~~~~~~~~~~~~~~~~~~

    /********************************************************************
    Hook: the full controller - { built, theme, update_layers, ...transformed }.

@return {Object|null} - context value, or null when outside a provider
    *********************************************************************/
    useThemeController: function () {

      return Lib.React.useContext(state.context);

    },


    /********************************************************************
    Hook: the theme - the transform's theme field when a transform is
    set, else the raw emitted tokens. Returns null outside a provider.

@return {Object|null} - the theme, or null when outside a provider
    *********************************************************************/
    useTheme: function () {

      const ctx = Lib.React.useContext(state.context);

      return ctx ? ctx.theme : null;

    },


    /********************************************************************
    Hook: the raw emitted token map from the pure engine, before any
    transform. Returns null outside a provider.

@return {Object|null} - the token map, or null when outside a provider
    *********************************************************************/
    useTokens: function () {

      const ctx = Lib.React.useContext(state.context);

      return ctx ? ctx.built.tokens : null;

    }


  };///////////////////////////Public Functions END//////////////////////////////


  return Extension;

};/////////////////////////// createInterface END //////////////////////////////
