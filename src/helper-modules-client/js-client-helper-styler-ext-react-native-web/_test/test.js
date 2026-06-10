// Info: Unit tests for js-client-helper-styler-ext-react-native-web
// Tests the React extension using loader pattern with npm aliases.
// Tests use ONLY public API exports (no direct part imports).
//
// Extension pattern: these tests verify the extension CONSUMES the core correctly.
'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

// Loader injects all dependencies via npm aliases
const { React, ReactTestRenderer, Extension, Styler } = require('./loader.js');

// Fixtures
const base = require('./fixtures/base.json');
const teal = require('./fixtures/teal.json');

// ============================================================================
// 1. EXTENSION LOADER & EXPORTS
// ============================================================================

describe('Extension loader', { skip: !React }, function () {

  it('returns expected exports', function () {
    assert.ok(Extension.ThemeProvider, 'has ThemeProvider');
    assert.ok(Extension.useTheme, 'has useTheme');
    assert.ok(Extension.useStyles, 'has useStyles');
    assert.ok(Extension.useThemeController, 'has useThemeController');
    assert.ok(Extension.ThemeContext, 'has ThemeContext');
  });

  it('ThemeContext is a React context', function () {
    assert.ok(Extension.ThemeContext.$$typeof !== undefined, 'ThemeContext is React object');
  });

});


// ============================================================================
// 2. THEMEPROVIDER
// ============================================================================

describe('ThemeProvider', { skip: !React || !ReactTestRenderer }, function () {

  it('renders without error with base prop', function () {
    const { ThemeProvider } = Extension;
    const element = React.createElement(
      ThemeProvider,
      { base },
      React.createElement('div', null, 'Child')
    );
    const tree = ReactTestRenderer.create(element);
    assert.ok(tree, 'renders');
    tree.unmount();
  });

  it('renders with base and variant', function () {
    const { ThemeProvider } = Extension;
    const element = React.createElement(
      ThemeProvider,
      { base, variant: teal },
      React.createElement('div', null, 'Child')
    );
    const tree = ReactTestRenderer.create(element);
    assert.ok(tree, 'renders with variant');
    tree.unmount();
  });

});


// ============================================================================
// 3. USETHEME HOOK
// ============================================================================

describe('useTheme', { skip: !React || !ReactTestRenderer }, function () {

  it('returns current theme inside ThemeProvider', function () {
    const { ThemeProvider, useTheme } = Extension;

    let capturedTheme = null;
    function TestComponent() {
      capturedTheme = useTheme();
      return React.createElement('div', null, 'Test');
    }

    const element = React.createElement(
      ThemeProvider,
      { base },
      React.createElement(TestComponent)
    );

    const tree = ReactTestRenderer.create(element);
    assert.ok(capturedTheme, 'theme is returned');
    assert.ok(capturedTheme.Color, 'theme has Color');
    assert.ok(capturedTheme.Dimension, 'theme has Dimension');
    tree.unmount();
  });

});


// ============================================================================
// 4. USESTYLES HOOK
// ============================================================================

describe('useStyles', { skip: !React || !ReactTestRenderer }, function () {

  it('returns atomic style objects', function () {
    const { ThemeProvider, useStyles } = Extension;

    let capturedStyles = null;
    function TestComponent() {
      capturedStyles = useStyles();
      return React.createElement('div', null, 'Test');
    }

    const element = React.createElement(
      ThemeProvider,
      { base },
      React.createElement(TestComponent)
    );

    const tree = ReactTestRenderer.create(element);
    assert.ok(capturedStyles, 'styles are returned');
    assert.strictEqual(typeof capturedStyles, 'object', 'styles is object');
    tree.unmount();
  });

  it('styles contain expected keys', function () {
    const { ThemeProvider, useStyles } = Extension;

    let capturedStyles = null;
    function TestComponent() {
      capturedStyles = useStyles();
      return React.createElement('div', null, 'Test');
    }

    const element = React.createElement(
      ThemeProvider,
      { base },
      React.createElement(TestComponent)
    );

    const tree = ReactTestRenderer.create(element);
    assert.ok(Object.keys(capturedStyles).length > 0, 'has style keys');
    tree.unmount();
  });

});


// ============================================================================
// 5. USETHEMECONTROLLER HOOK
// ============================================================================

describe('useThemeController', { skip: !React || !ReactTestRenderer }, function () {

  it('returns theme, styles, and updateTheme', function () {
    const { ThemeProvider, useThemeController } = Extension;

    let controller = null;
    function TestComponent() {
      controller = useThemeController();
      return React.createElement('div', null, 'Test');
    }

    const element = React.createElement(
      ThemeProvider,
      { base },
      React.createElement(TestComponent)
    );

    const tree = ReactTestRenderer.create(element);
    assert.ok(controller.theme, 'has theme');
    assert.ok(controller.styles, 'has styles');
    assert.strictEqual(typeof controller.updateTheme, 'function', 'has updateTheme function');
    tree.unmount();
  });

});


// ============================================================================
// 6. EXTENSION + STYLER INTEGRATION
// ============================================================================

describe('Extension with Styler', { skip: !React || !ReactTestRenderer }, function () {

  it('derives theme using Styler core', function () {
    const { ThemeProvider, useTheme } = Extension;

    // Verify Styler is available and working
    assert.ok(Styler, 'Styler core is loaded');
    assert.ok(Styler.assemble, 'Styler has assemble function');

    let capturedTheme = null;
    function TestComponent() {
      capturedTheme = useTheme();
      return React.createElement('div', null, 'Test');
    }

    const element = React.createElement(
      ThemeProvider,
      { base },
      React.createElement(TestComponent)
    );

    const tree = ReactTestRenderer.create(element);
    assert.ok(capturedTheme, 'theme is derived');
    tree.unmount();
  });

});
