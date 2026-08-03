'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  RNFontAdapter,
  Font,
  Utils,
  Debug,
  loadedFonts,
  createNativeLoaderStub
} = require('./loader');


// ~~~~~~~~~~~~~~~~~~~~ loadManifest ~~~~~~~~~~~~~~~~~~~~

test('loadManifest loads all fonts via the native loader', async function () {

  // Clear any previously loaded fonts
  Object.keys(loadedFonts).forEach(function (key) { delete loadedFonts[key]; });

  const manifest = Font.getManifest().manifest;

  const result = await RNFontAdapter.loadManifest(manifest);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  // Verify fonts were loaded (Poppins has 2 styles, Lora has 1 = 3 total)
  const loadedResult = RNFontAdapter.getLoadedCount();
  assert.strictEqual(loadedResult.count, 3);

  const failedResult = RNFontAdapter.getFailedCount();
  assert.strictEqual(failedResult.count, 0);

});

test('loadManifest rejects invalid manifest', async function () {

  const result = await RNFontAdapter.loadManifest('not an object');

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.type, 'helper-font-ext-rn/invalid-manifest');

});

test('loadManifest with FAIL_ON_ERROR returns error on failure', async function () {

  const failingLoader = createNativeLoaderStub(true);

  const FailingAdapter = require('helper-font-ext-rn')({
    Utils: Utils,
    Debug: Debug,
    Font: Font,
    NativeFontLoader: failingLoader
  }, {
    FAIL_ON_ERROR: true
  });

  const result = await FailingAdapter.loadManifest(Font.getManifest().manifest);

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.type, 'helper-font-ext-rn/load-failed');

});

test('loadManifest without FAIL_ON_ERROR continues on failure', async function () {

  const failingLoader = createNativeLoaderStub(true);

  const LenientAdapter = require('helper-font-ext-rn')({
    Utils: Utils,
    Debug: Debug,
    Font: Font,
    NativeFontLoader: failingLoader
  });

  const result = await LenientAdapter.loadManifest(Font.getManifest().manifest);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  // All should have failed
  const failedResult = LenientAdapter.getFailedCount();
  assert.strictEqual(failedResult.count, 3);

  const loadedResult = LenientAdapter.getLoadedCount();
  assert.strictEqual(loadedResult.count, 0);

});


// ~~~~~~~~~~~~~~~~~~~~ isReady ~~~~~~~~~~~~~~~~~~~~

test('isReady returns false before loadManifest', function () {

  const FreshAdapter = require('helper-font-ext-rn')({
    Utils: Utils,
    Debug: Debug,
    Font: Font,
    NativeFontLoader: createNativeLoaderStub(false)
  });

  const result = FreshAdapter.isReady();

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.ready, false);
  assert.strictEqual(result.error, null);

});

test('isReady returns true after successful loadManifest', async function () {

  const FreshAdapter = require('helper-font-ext-rn')({
    Utils: Utils,
    Debug: Debug,
    Font: Font,
    NativeFontLoader: createNativeLoaderStub(false)
  });

  await FreshAdapter.loadManifest(Font.getManifest().manifest);

  const result = FreshAdapter.isReady();

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.ready, true);

});


// ~~~~~~~~~~~~~~~~~~~~ Constructor validation ~~~~~~~~~~~~~~~~~~~~

test('constructor throws when Font core is not injected', function () {

  assert.throws(function () {

    require('helper-font-ext-rn')({
      Utils: Utils,
      Debug: Debug,
      NativeFontLoader: createNativeLoaderStub(false)
    });

  }, /Font is required/);

});

test('constructor throws when NativeFontLoader is not injected', function () {

  assert.throws(function () {

    require('helper-font-ext-rn')({
      Utils: Utils,
      Debug: Debug,
      Font: Font
    });

  }, /NativeFontLoader is required/);

});
