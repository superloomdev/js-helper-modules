// Info: Unit tests for js-client-helper-themer-ext-react
//
// Tests the provider, hooks, transform seam, loader validation, and
// factory isolation using react-test-renderer. Tests use ONLY public
// API exports.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import themerExtReactLoader from 'helper-themer-ext-react';

import {
  React,
  ReactTestRenderer,
  Extension,
  Themer,
  Utils,
  Debug,
  buildTemplate
} from './loader.js';

const { ThemeProvider, useThemeController, useTheme, useTokens, ThemeContext } = Extension;


// ============================================================================
// 1. LOADER AND EXPORTS
// ============================================================================

describe('loader', () => {

  it('should return the 5 expected exports when loaded', () => {

    assert.strictEqual(typeof ThemeProvider, 'function', 'has ThemeProvider');
    assert.strictEqual(typeof useThemeController, 'function', 'has useThemeController');
    assert.strictEqual(typeof useTheme, 'function', 'has useTheme');
    assert.strictEqual(typeof useTokens, 'function', 'has useTokens');
    assert.strictEqual(typeof ThemeContext, 'object', 'has ThemeContext');

  });

  it('should throw TypeError when React is missing', () => {

    assert.throws(
      function () {
        themerExtReactLoader({ Themer: Themer, Utils: Utils });
      },
      /^TypeError: \[helper-themer-ext-react\] shared_libs\.React is required/
    );

  });

  it('should throw TypeError when Themer is missing', () => {

    assert.throws(
      function () {
        themerExtReactLoader({ React: React, Utils: Utils });
      },
      /^TypeError: \[helper-themer-ext-react\] shared_libs\.Themer is required/
    );

  });

});


// ============================================================================
// 2. PROVIDER
// ============================================================================

describe('ThemeProvider', () => {

  it('should render children and provide the built tokens through useTheme', () => {

    const t = buildTemplate();
    let captured = null;

    function Consumer () {

      const theme = useTheme();
      captured = theme;
      return null;

    }

    ReactTestRenderer.create(
      React.createElement(ThemeProvider, {
        template: t,
        layers: [{ name: 'base' }],
        platform: 'native'
      }, React.createElement(Consumer))
    );

    // The theme is the emitted token map for native
    assert.strictEqual(captured.background, '#ffffff');
    assert.strictEqual(captured.spacing03, 16);

  });

  it('should provide the raw emitted tokens through useTokens', () => {

    const t = buildTemplate();
    let captured = null;

    function Consumer () {

      const tokens = useTokens();
      captured = tokens;
      return null;

    }

    ReactTestRenderer.create(
      React.createElement(ThemeProvider, {
        template: t,
        layers: [{ name: 'base' }],
        platform: 'web'
      }, React.createElement(Consumer))
    );

    // On web, spacing is emitted as rem
    assert.strictEqual(captured.spacing03, '1rem');
    assert.strictEqual(captured.background, '#ffffff');

  });

  it('should provide the full context value through useThemeController', () => {

    const t = buildTemplate();
    let captured = null;

    function Consumer () {

      const ctx = useThemeController();
      captured = ctx;
      return null;

    }

    ReactTestRenderer.create(
      React.createElement(ThemeProvider, {
        template: t,
        layers: [{ name: 'base' }],
        platform: 'native'
      }, React.createElement(Consumer))
    );

    assert.strictEqual(typeof captured.built, 'object');
    assert.strictEqual(typeof captured.built.tokens, 'object');
    assert.strictEqual(typeof captured.update_layers, 'function');
    assert.strictEqual(captured.theme, captured.built.tokens);

  });

});


// ============================================================================
// 3. LIVE UPDATE
// ============================================================================

describe('update_layers', () => {

  it('should re-derive when update_layers is called with a new array', () => {

    const t = buildTemplate();
    let capturedTheme = null;
    let updateFn = null;

    function Consumer () {

      const ctx = useThemeController();
      capturedTheme = ctx.theme;
      updateFn = ctx.update_layers;
      return null;

    }

    const renderer = ReactTestRenderer.create(
      React.createElement(ThemeProvider, {
        template: t,
        layers: [{ name: 'base' }],
        platform: 'native'
      }, React.createElement(Consumer))
    );

    // Before: background is the template literal
    assert.strictEqual(capturedTheme.background, '#ffffff');

    // Trigger a re-derive with a layer that overrides the background token
    ReactTestRenderer.act(function () {

      updateFn([{ name: 'dark', tokens: { background: '#161616' } }]);

    });

    // After: the layer override takes effect
    assert.strictEqual(capturedTheme.background, '#161616');

    renderer.unmount();

  });

});


// ============================================================================
// 4. TRANSFORM SEAM
// ============================================================================

describe('transform', () => {

  it('should spread the transform return value into the context', () => {

    const t = buildTemplate();
    let captured = null;

    function transform (built, layers) {

      return {
        customField: 'bridged:' + built.tokens.spacing03,
        theme: { customTheme: true }
      };

    }

    function Consumer () {

      const ctx = useThemeController();
      captured = ctx;
      return null;

    }

    ReactTestRenderer.create(
      React.createElement(ThemeProvider, {
        template: t,
        layers: [{ name: 'base' }],
        platform: 'native',
        transform: transform
      }, React.createElement(Consumer))
    );

    // The transform's custom field is readable
    assert.strictEqual(captured.customField, 'bridged:16');

    // The transform's theme overrides the default
    assert.deepStrictEqual(captured.theme, { customTheme: true });

  });

  it('should return the transform theme through useTheme', () => {

    const t = buildTemplate();
    let capturedTheme = null;

    function transform (built) {

      return { theme: { background: 'transformed:' + built.tokens.background } };

    }

    function Consumer () {

      capturedTheme = useTheme();
      return null;

    }

    ReactTestRenderer.create(
      React.createElement(ThemeProvider, {
        template: t,
        layers: [{ name: 'base' }],
        platform: 'native',
        transform: transform
      }, React.createElement(Consumer))
    );

    assert.strictEqual(capturedTheme.background, 'transformed:#ffffff');

  });

  it('should still provide raw tokens through useTokens when a transform is set', () => {

    const t = buildTemplate();
    let capturedTokens = null;

    function transform () {

      return { theme: { custom: true } };

    }

    function Consumer () {

      capturedTokens = useTokens();
      return null;

    }

    ReactTestRenderer.create(
      React.createElement(ThemeProvider, {
        template: t,
        layers: [{ name: 'base' }],
        platform: 'native',
        transform: transform
      }, React.createElement(Consumer))
    );

    // useTokens always returns the raw emitted map
    assert.strictEqual(capturedTokens.spacing03, 16);

  });

});


// ============================================================================
// 5. HOOKS OUTSIDE A PROVIDER
// ============================================================================

describe('hooks outside a provider', () => {

  it('should return null from useThemeController outside a provider', () => {

    let captured = 'not-null';

    function Outside () {

      captured = useThemeController();
      return null;

    }

    ReactTestRenderer.create(React.createElement(Outside));

    assert.strictEqual(captured, null);

  });

  it('should return null from useTheme outside a provider', () => {

    let captured = 'not-null';

    function Outside () {

      captured = useTheme();
      return null;

    }

    ReactTestRenderer.create(React.createElement(Outside));

    assert.strictEqual(captured, null);

  });

  it('should return null from useTokens outside a provider', () => {

    let captured = 'not-null';

    function Outside () {

      captured = useTokens();
      return null;

    }

    ReactTestRenderer.create(React.createElement(Outside));

    assert.strictEqual(captured, null);

  });

});


// ============================================================================
// 6. FACTORY ISOLATION
// ============================================================================

describe('factory isolation', () => {

  it('should not share context between two factory instances', () => {

    const t = buildTemplate();

    // Create a second factory instance
    const Extension2 = themerExtReactLoader({
      React: React,
      Themer: Themer,
      Utils: Utils,
      Debug: Debug
    });

    let captured1 = null;
    let captured2 = null;

    function Consumer1 () {

      captured1 = useThemeController();
      return null;

    }

    function Consumer2 () {

      captured2 = Extension2.useThemeController();
      return null;

    }

    // Render both providers in the same tree
    ReactTestRenderer.create(
      React.createElement(React.Fragment, null, [
        React.createElement(ThemeProvider, {
          key: 'a',
          template: t,
          layers: [{ name: 'base' }],
          platform: 'native'
        }, React.createElement(Consumer1, { key: 'c1' })),
        React.createElement(Extension2.ThemeProvider, {
          key: 'b',
          template: t,
          layers: [{ name: 'base' }],
          platform: 'web'
        }, React.createElement(Consumer2, { key: 'c2' }))
      ])
    );

    // Instance 1 sees native tokens (numbers), instance 2 sees web tokens (rem strings)
    assert.strictEqual(captured1.theme.spacing03, 16);
    assert.strictEqual(captured2.theme.spacing03, '1rem');

  });

});


// ============================================================================
// 7. PROVIDER PROP VALIDATION
// ============================================================================

describe('provider prop validation', () => {

  it('should throw TypeError when template is not an object', () => {

    assert.throws(
      function () {

        ReactTestRenderer.create(
          React.createElement(ThemeProvider, {
            template: 'oops',
            layers: [{ name: 'base' }],
            platform: 'native'
          }, null)
        );

      },
      /^TypeError: \[helper-themer-ext-react\] template must be a plain object$/
    );

  });

  it('should throw TypeError when layers is not an array', () => {

    assert.throws(
      function () {

        ReactTestRenderer.create(
          React.createElement(ThemeProvider, {
            template: buildTemplate(),
            layers: { name: 'base' },
            platform: 'native'
          }, null)
        );

      },
      /^TypeError: \[helper-themer-ext-react\] layers must be an array of layer objects$/
    );

  });

  it('should throw TypeError when platform is not web or native', () => {

    assert.throws(
      function () {

        ReactTestRenderer.create(
          React.createElement(ThemeProvider, {
            template: buildTemplate(),
            layers: [{ name: 'base' }],
            platform: 'android'
          }, null)
        );

      },
      /^TypeError: \[helper-themer-ext-react\] platform must be one of: web, native$/
    );

  });

  it('should throw TypeError when transform is not a function', () => {

    assert.throws(
      function () {

        ReactTestRenderer.create(
          React.createElement(ThemeProvider, {
            template: buildTemplate(),
            layers: [{ name: 'base' }],
            platform: 'native',
            transform: 'not-a-function'
          }, null)
        );

      },
      /^TypeError: \[helper-themer-ext-react\] transform must be a function$/
    );

  });

});
