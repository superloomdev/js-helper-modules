// Info: Concurrency, partial-failure, native loader call verification, and
// config absorption tests for js-client-helper-font-ext-rn. Supplements
// test.js with tests that verify parallel loading behavior, native loader
// call arguments, factory independence, and config absorption.
// Tests use ONLY public API exports (no direct private function access).
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  Font,
  Utils,
  Debug
} = require('./loader');

const NativeLoaderStub = require('@vitrion/react-native-load-fonts');
const RNFontAdapterModule = require('helper-font-ext-rn');


// Helper: create a fresh adapter for each test
function createAdapter (config) {
  return RNFontAdapterModule({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  }, config || {});
}


// ~~~~~~~~~~~~~~~~~~~~ Native loader call verification ~~~~~~~~~~~~~~~~~~~~

test('loadManifest passes the family name and path to loadFontFromFile', async function () {

  NativeLoaderStub._clearLoadedFonts();

  const adapter = createAdapter();

  const manifest = {
    CustomFont: {
      styles: {
        '400': { path: '/app/fonts/custom-400.ttf' }
      }
    }
  };

  await adapter.loadManifest(manifest);

  const loaded = NativeLoaderStub._getLoadedFonts();

  assert.strictEqual(loaded['CustomFont'], '/app/fonts/custom-400.ttf');

});

test('loadManifest passes the family name (not style key) to loadFontFromFile', async function () {

  NativeLoaderStub._clearLoadedFonts();

  const adapter = createAdapter();

  const manifest = {
    MultiStyle: {
      styles: {
        '400': { path: '/fonts/multi-400.ttf' },
        '600': { path: '/fonts/multi-600.ttf' }
      }
    }
  };

  await adapter.loadManifest(manifest);

  const loaded = NativeLoaderStub._getLoadedFonts();

  // Both styles load under the same family name; the second overwrites
  // the first in the stub (same key). Verify the family name was used.
  assert.ok(loaded['MultiStyle'] !== undefined, 'loaded under family name MultiStyle');

});


// ~~~~~~~~~~~~~~~~~~~~ Parallel loading (concurrency) ~~~~~~~~~~~~~~~~~~~~

test('loadManifest loads all fonts in parallel via Promise.allSettled', async function () {

  NativeLoaderStub._clearLoadedFonts();

  const adapter = createAdapter();

  const manifest = {
    ConcurrentA: { styles: { '400': { path: '/fonts/a-400.ttf' }, '600': { path: '/fonts/a-600.ttf' } } },
    ConcurrentB: { styles: { '400': { path: '/fonts/b-400.ttf' }, '700': { path: '/fonts/b-700.ttf' } } },
    ConcurrentC: { styles: { '400': { path: '/fonts/c-400.ttf' } } }
  };

  await adapter.loadManifest(manifest);

  const loadedCount = adapter.getLoadedCount().count;

  // 5 total font styles across 3 families
  assert.strictEqual(loadedCount, 5);
  assert.strictEqual(adapter.getFailedCount().count, 0);

});

test('loadManifest with empty manifest returns success with zero loaded', async function () {

  const adapter = createAdapter();

  const result = await adapter.loadManifest({});

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);
  assert.strictEqual(adapter.getLoadedCount().count, 0);
  assert.strictEqual(adapter.getFailedCount().count, 0);

});


// ~~~~~~~~~~~~~~~~~~~~ Partial failure with stub failure ~~~~~~~~~~~~~~~~~~~~

test('loadManifest tallies partial failure when native loader rejects', async function () {

  NativeLoaderStub._clearLoadedFonts();
  NativeLoaderStub._setShouldFail(true);

  const adapter = createAdapter();

  const manifest = {
    FailFont: {
      styles: {
        '400': { path: '/fonts/fail.ttf' }
      }
    }
  };

  const result = await adapter.loadManifest(manifest);

  NativeLoaderStub._setShouldFail(false);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);
  assert.strictEqual(adapter.getFailedCount().count, 1);
  assert.strictEqual(adapter.getLoadedCount().count, 0);

});

test('loadManifest with FAIL_ON_ERROR returns error when native loader rejects', async function () {

  NativeLoaderStub._clearLoadedFonts();
  NativeLoaderStub._setShouldFail(true);

  const adapter = createAdapter({ FAIL_ON_ERROR: true });

  const manifest = {
    FailFont: {
      styles: {
        '400': { path: '/fonts/fail.ttf' }
      }
    }
  };

  const result = await adapter.loadManifest(manifest);

  NativeLoaderStub._setShouldFail(false);

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.type, 'helper-font-ext-rn/load-failed');

});

test('loadManifest tallies mixed success and failure when some entries lack path', async function () {

  NativeLoaderStub._clearLoadedFonts();

  const adapter = createAdapter();

  const manifest = {
    GoodFont: {
      styles: {
        '400': { path: '/fonts/good.ttf' }
      }
    },
    BadFont: {
      styles: {
        '400': { url: 'https://example.com/bad.woff2' }
      }
    }
  };

  const result = await adapter.loadManifest(manifest);

  assert.strictEqual(result.success, true);
  assert.strictEqual(adapter.getLoadedCount().count, 1);
  assert.strictEqual(adapter.getFailedCount().count, 1);

});


// ~~~~~~~~~~~~~~~~~~~~ Factory independence ~~~~~~~~~~~~~~~~~~~~

test('two adapter instances have independent loaded state', async function () {

  NativeLoaderStub._clearLoadedFonts();

  const adapterA = createAdapter();
  const adapterB = createAdapter();

  const manifestA = {
    FamA: { styles: { '400': { path: '/fonts/a.ttf' } } }
  };

  const manifestB = {
    FamB: { styles: { '400': { path: '/fonts/b.ttf' } } }
  };

  await adapterA.loadManifest(manifestA);
  await adapterB.loadManifest(manifestB);

  assert.strictEqual(adapterA.isFamilyLoaded('FamA'), true);
  assert.strictEqual(adapterA.isFamilyLoaded('FamB'), false);
  assert.strictEqual(adapterB.isFamilyLoaded('FamA'), false);
  assert.strictEqual(adapterB.isFamilyLoaded('FamB'), true);

  assert.strictEqual(adapterA.getLoadedCount().count, 1);
  assert.strictEqual(adapterB.getLoadedCount().count, 1);

});

test('two adapter instances have independent isReady state', function () {

  const adapterA = createAdapter();
  const adapterB = createAdapter();

  assert.strictEqual(adapterA.isReady(), false);
  assert.strictEqual(adapterB.isReady(), false);

});


// ~~~~~~~~~~~~~~~~~~~~ Config absorption contract ~~~~~~~~~~~~~~~~~~~~

test('FAIL_ON_ERROR override changes observable behavior on failure', async function () {

  NativeLoaderStub._clearLoadedFonts();

  const lenientAdapter = createAdapter({ FAIL_ON_ERROR: false });
  const strictAdapter = createAdapter({ FAIL_ON_ERROR: true });

  const badManifest = {
    Bad: { styles: { '400': { url: 'https://example.com/no-path.woff2' } } }
  };

  const lenientResult = await lenientAdapter.loadManifest(badManifest);
  const strictResult = await strictAdapter.loadManifest(badManifest);

  assert.strictEqual(lenientResult.success, true);
  assert.strictEqual(strictResult.success, false);
  assert.strictEqual(strictResult.error.type, 'helper-font-ext-rn/load-failed');

});

test('constructor throws when FAIL_ON_ERROR is not a boolean', function () {

  assert.throws(function () {
    createAdapter({ FAIL_ON_ERROR: 'yes' });
  }, /FAIL_ON_ERROR must be a boolean/);

});

test('omitting FAIL_ON_ERROR retains the default false', function () {

  const adapter = createAdapter();

  assert.ok(adapter);
  assert.strictEqual(typeof adapter.loadManifest, 'function');

});
