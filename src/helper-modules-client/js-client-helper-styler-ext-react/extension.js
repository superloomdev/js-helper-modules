// Info: React extension for js-client-helper-styler.
//
// Extension Pattern: This module CONSUMES the core styler engine. Unlike the
// Adapter pattern where core calls adapter, here the extension imports the core
// and wraps it for React-specific usage.
//
// Provides: ThemeProvider, useTheme, useStyles, useThemeController, ThemeContext
//
// The extension receives React via dependency injection and creates a React
// context that provides assembled theme + utility styles to the subtree.
// Calling updateTheme(nextVariant) re-derives everything live.
//
// Compatibility: React 18+, React Native, React Native Web.
//
// Dependency direction: Extension → Core (extension is boss, core is library)
//
// Singleton loader pattern: Context created once per process via Node require cache.
//
'use strict';


// Injected dependencies, set by the loader (module-scope).
let Lib;             // shared_libs container (requires Lib.React)
let CONFIG; // eslint-disable-line no-unused-vars -- reserved for future knobs
let React;           // injected React (required)
let ThemeContext;    // React context object, created once in loader


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects React (required) and optional pre-built Styler
instance via Lib container, imports core styler if not injected, creates
the React context once, and returns extension bindings.

Extension pattern: This loader CONSUMES the core (via require or injection).
The core styler is a pure engine; this extension adds React semantics.

@param {Object} shared_libs - Lib container; requires shared_libs.React,
                              optional shared_libs.Styler
@param {Object} config      - Overrides merged over defaults

@return {Object} - { ThemeProvider, useTheme, useStyles, useThemeController, ThemeContext }
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  Lib = shared_libs || {};
  CONFIG = Object.assign({}, config || {});

  // React is required — injected via Lib to maintain centralized dependency pattern
  React = Lib.React;
  if (!React) {
    throw new Error('styler-ext-react: shared_libs.React is required (inject React via the loader).');
  }

  // Create context once and expose on bindings
  ThemeContext = React.createContext(null);
  Extension.ThemeContext = ThemeContext;

  return Extension;

};///////////////////////////// Module-Loader END ////////////////////////////////



/////////////////////////// Public Functions START /////////////////////////////
const Extension = { // Public React bindings accessible by the host


  // ~~~~~~~~~~~~~~~~~~~~ Context ~~~~~~~~~~~~~~~~~~~~

  // React context object (advanced use / custom consumers). Assigned by loader.
  ThemeContext: null,


  // ~~~~~~~~~~~~~~~~~~~~ Provider ~~~~~~~~~~~~~~~~~~~~

  /********************************************************************
  ThemeProvider — assembles a theme from base + variant using the core
  styler engine, generates utility styles, and provides them via React context.
  Calling updateTheme(nextVariant) re-derives everything live (theme swap).

  @param {Object} props          - React props
  @param {Object} props.template - template to fill (defaults to Lib.Styler.defaultTemplate)
  @param {Object} props.base     - complete base theme values (required)
  @param {Object} props.variant  - initial partial variant values (optional)
  @param {Node}   props.children - subtree to provide theme to

  @return {Object} - React element
  *********************************************************************/
  ThemeProvider: function (props) {

    // Template: prop wins, else fall back to core's default template
    const template = props.template || Lib.Styler.defaultTemplate;

    // Base is required — empty object default for safety
    const base = props.base || {};

    // Variant is optional state
    const [variant, setVariant] = React.useState(props.variant || {});

    // Memoized assembly — only recompute when inputs change
    const value = React.useMemo(function () {
      const theme = Lib.Styler.assemble(template, base, variant);
      const styles = Lib.Styler.generateUtilities(theme);
      return {
        theme: theme,
        styles: styles,
        updateTheme: setVariant
      };
    }, [template, base, variant]);

    return React.createElement(ThemeContext.Provider, { value: value }, props.children);

  },


  // ~~~~~~~~~~~~~~~~~~~~ Hooks ~~~~~~~~~~~~~~~~~~~~

  /********************************************************************
  Hook: the full controller — { theme, styles, template, base, updateTheme }.

  @return {Object|null} - context value, or null when outside a provider
  *********************************************************************/
  useThemeController: function () {
    return React.useContext(ThemeContext);
  },


  /********************************************************************
  Hook: the assembled theme — { Color, Dimension, Font }.

  @return {Object|null} - the theme, or null when outside a provider
  *********************************************************************/
  useTheme: function () {
    const ctx = React.useContext(ThemeContext);
    return ctx ? ctx.theme : null;
  },


  /********************************************************************
  Hook: the generated atomic utility styles (flat style objects).

  @return {Object|null} - the styles, or null when outside a provider
  *********************************************************************/
  useStyles: function () {
    const ctx = React.useContext(ThemeContext);
    return ctx ? ctx.styles : null;
  }


};/////////////////////////// Public Functions END ///////////////////////////////
