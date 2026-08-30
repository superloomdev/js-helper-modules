import { test } from 'node:test';
import assert from 'node:assert/strict';
import fontExtExpoLoader from 'helper-font-ext-expo';

import {
  ExpoFontAdapter,
  Font,
  Utils,
  Debug
} from './loader.js';


// ~~~~~~~~~~~~~~~~~~~~ loadManifest ~~~~~~~~~~~~~~~~~~~~

test('loadManifest loads all fonts via expo-font', async function () {

  const manifest = Font.getManifest().manifest;

  const result = await ExpoFontAdapter.loadManifest(manifest);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  // Poppins has 2 styles, Lora has 1 = 3 total
  const loadedResult = ExpoFontAdapter.getLoadedCount();
  assert.strictEqual(loadedResult.count, 3);

  const failedResult = ExpoFontAdapter.getFailedCount();
  assert.strictEqual(failedResult.count, 0);

});

test('loadManifest rejects invalid manifest', async function () {

  const result = await ExpoFontAdapter.loadManifest('not an object');

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.type, 'helper-font-ext-expo/invalid-manifest');

});

test('loadManifest with FAIL_ON_ERROR returns error on failure', async function () {

  // Build a manifest with an entry that has no source
  const manifest = {
    BadFont: {
      styles: {
        '400': { url: null, path: null, asset: null, weight: null, style: 'normal' }
      }
    }
  };

  const FailingAdapter = fontExtExpoLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  }, {
    FAIL_ON_ERROR: true
  });

  const result = await FailingAdapter.loadManifest(manifest);

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.type, 'helper-font-ext-expo/load-failed');

});

test('loadManifest without FAIL_ON_ERROR continues on failure', async function () {

  const manifest = {
    BadFont: {
      styles: {
        '400': { url: null, path: null, asset: null, weight: null, style: 'normal' }
      }
    }
  };

  const LenientAdapter = fontExtExpoLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  const result = await LenientAdapter.loadManifest(manifest);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  const failedResult = LenientAdapter.getFailedCount();
  assert.strictEqual(failedResult.count, 1);

  const loadedResult = LenientAdapter.getLoadedCount();
  assert.strictEqual(loadedResult.count, 0);

});

test('loadManifest accepts entry with asset only', async function () {

  const manifest = {
    AssetFont: {
      styles: {
        '400': { asset: 999, url: null, path: null, weight: null, style: 'normal' }
      }
    }
  };

  const result = await ExpoFontAdapter.loadManifest(manifest);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  const loadedResult = ExpoFontAdapter.getLoadedCount();
  assert.strictEqual(loadedResult.count, 1);

});

test('loadManifest accepts entry with url only (web)', async function () {

  const manifest = {
    WebFont: {
      styles: {
        '400': { url: 'https://example.com/web.woff2', path: null, asset: null, weight: null, style: 'normal' }
      }
    }
  };

  const result = await ExpoFontAdapter.loadManifest(manifest);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  const loadedResult = ExpoFontAdapter.getLoadedCount();
  assert.strictEqual(loadedResult.count, 1);

});

test('loadManifest accepts entry with path only (native)', async function () {

  const manifest = {
    PathFont: {
      styles: {
        '400': { path: '/app/fonts/path-only.ttf', url: null, asset: null, weight: null, style: 'normal' }
      }
    }
  };

  const result = await ExpoFontAdapter.loadManifest(manifest);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  const loadedResult = ExpoFontAdapter.getLoadedCount();
  assert.strictEqual(loadedResult.count, 1);

});


// ~~~~~~~~~~~~~~~~~~~~ isReady ~~~~~~~~~~~~~~~~~~~~

test('isReady returns false before loadManifest', function () {

  const FreshAdapter = fontExtExpoLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  const result = FreshAdapter.isReady();

  assert.strictEqual(result, false);

});

test('isReady returns true after successful loadManifest', async function () {

  const FreshAdapter = fontExtExpoLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  const manifest = {
    TestFont: {
      styles: {
        '400': { asset: 1, url: null, path: null, weight: null, style: 'normal' }
      }
    }
  };

  await FreshAdapter.loadManifest(manifest);

  const result = FreshAdapter.isReady();

  assert.strictEqual(result, true);

});


// ~~~~~~~~~~~~~~~~~~~~ Constructor validation ~~~~~~~~~~~~~~~~~~~~

test('constructor throws when Font core is not injected', function () {

  assert.throws(function () {

    fontExtExpoLoader({
      Utils: Utils,
      Debug: Debug
    });

  }, /Font is required/);

});

test('constructor does not require expo-font injection', function () {

  // The extension requires expo-font directly at module scope.
  // No injection needed - should NOT throw.
  const Adapter = fontExtExpoLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  assert.ok(Adapter);
  assert.strictEqual(typeof Adapter.loadManifest, 'function');

});


// ~~~~~~~~~~~~~~~~~~~~ isFamilyLoaded ~~~~~~~~~~~~~~~~~~~~

test('isFamilyLoaded returns false before loadManifest', function () {

  const FreshAdapter = fontExtExpoLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  const result = FreshAdapter.isFamilyLoaded('TestFont');

  assert.strictEqual(result, false);

});

test('isFamilyLoaded returns true after loadManifest', async function () {

  const FreshAdapter = fontExtExpoLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  const manifest = {
    TestFontIsFam: {
      styles: {
        '400': { asset: 1, url: null, path: null, weight: null, style: 'normal' }
      }
    }
  };

  await FreshAdapter.loadManifest(manifest);

  const result = FreshAdapter.isFamilyLoaded('TestFontIsFam');

  assert.strictEqual(result, true);

});


// ~~~~~~~~~~~~~~~~~~~~ Incremental loading ~~~~~~~~~~~~~~~~~~~~

test('loadManifest skips already-loaded families on second call', async function () {

  const FreshAdapter = fontExtExpoLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  const manifest = {
    IncFont1: {
      styles: {
        '400': { asset: 1, url: null, path: null, weight: null, style: 'normal' }
      }
    }
  };

  // First load
  await FreshAdapter.loadManifest(manifest);

  assert.strictEqual(FreshAdapter.isReady(), true);
  assert.strictEqual(FreshAdapter.isFamilyLoaded('IncFont1'), true);

  // Second load with same manifest - should skip
  await FreshAdapter.loadManifest(manifest);

  // isReady should still be true
  assert.strictEqual(FreshAdapter.isReady(), true);

  // loadedCount should be 0 (nothing new loaded in second call)
  const loadedResult = FreshAdapter.getLoadedCount();
  assert.strictEqual(loadedResult.count, 0);

});

test('loadManifest with partial manifest loads only new families', async function () {

  const FreshAdapter = fontExtExpoLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  // First load with one family
  await FreshAdapter.loadManifest({
    PartialFont1: {
      styles: {
        '400': { asset: 1, url: null, path: null, weight: null, style: 'normal' }
      }
    }
  });

  assert.strictEqual(FreshAdapter.isFamilyLoaded('PartialFont1'), true);
  assert.strictEqual(FreshAdapter.isFamilyLoaded('PartialFont2'), false);

  // Second load with a new family
  await FreshAdapter.loadManifest({
    PartialFont2: {
      styles: {
        '400': { asset: 2, url: null, path: null, weight: null, style: 'normal' }
      }
    }
  });

  assert.strictEqual(FreshAdapter.isFamilyLoaded('PartialFont2'), true);

  // Only the new family should have been loaded
  const loadedResult = FreshAdapter.getLoadedCount();
  assert.strictEqual(loadedResult.count, 1);

});
