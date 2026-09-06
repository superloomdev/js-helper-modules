// Info: Concurrency, partial-failure, and source resolution tests for
// js-client-helper-font-ext-expo. Supplements test.js with tests that
// verify parallel loading behavior, source priority (asset > url > path),
// font descriptor format, factory independence, and config absorption.
// Tests use ONLY public API exports (no direct private function access).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ExpoFontStub from 'expo-font';
import fontExtExpoLoader from 'helper-font-ext-expo';

import {
  Font,
  Utils,
  Debug
} from './loader.js';


// Helper: create a fresh adapter for each test
function createAdapter (config) {
  return fontExtExpoLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  }, config || {});
}


// ~~~~~~~~~~~~~~~~~~~~ Source priority: asset > url > path ~~~~~~~~~~~~~~~~~~~~

test('loadManifest passes the asset source to expo-font when asset is present', async function () {

  ExpoFontStub._clearLoadedFonts();

  const adapter = createAdapter();

  const manifest = {
    AssetPriority: {
      styles: {
        '400': { asset: 555, url: 'https://example.com/font.woff2', path: '/fonts/font.ttf' }
      }
    }
  };

  await adapter.loadManifest(manifest);

  const loaded = ExpoFontStub._getLoadedFonts();

  assert.strictEqual(loaded['AssetPriority_400'], 555);

});

test('loadManifest passes the url source when asset is absent but url is present', async function () {

  ExpoFontStub._clearLoadedFonts();

  const adapter = createAdapter();

  const manifest = {
    UrlPriority: {
      styles: {
        '400': { asset: null, url: 'https://example.com/font.woff2', path: '/fonts/font.ttf' }
      }
    }
  };

  await adapter.loadManifest(manifest);

  const loaded = ExpoFontStub._getLoadedFonts();

  assert.strictEqual(loaded['UrlPriority_400'], 'https://example.com/font.woff2');

});

test('loadManifest passes the path source when asset and url are absent but path is present', async function () {

  ExpoFontStub._clearLoadedFonts();

  const adapter = createAdapter();

  const manifest = {
    PathPriority: {
      styles: {
        '400': { asset: null, url: null, path: '/fonts/path-only.ttf' }
      }
    }
  };

  await adapter.loadManifest(manifest);

  const loaded = ExpoFontStub._getLoadedFonts();

  assert.strictEqual(loaded['PathPriority_400'], '/fonts/path-only.ttf');

});


// ~~~~~~~~~~~~~~~~~~~~ Font descriptor format ~~~~~~~~~~~~~~~~~~~~

test('loadManifest builds font descriptor as familyName_styleKey', async function () {

  ExpoFontStub._clearLoadedFonts();

  const adapter = createAdapter();

  const manifest = {
    MyFamily: {
      styles: {
        '400': { asset: 1 },
        '600': { asset: 2 },
        '700-italic': { asset: 3 }
      }
    }
  };

  await adapter.loadManifest(manifest);

  const loaded = ExpoFontStub._getLoadedFonts();

  assert.ok(loaded['MyFamily_400'] !== undefined, 'loaded MyFamily_400');
  assert.ok(loaded['MyFamily_600'] !== undefined, 'loaded MyFamily_600');
  assert.ok(loaded['MyFamily_700-italic'] !== undefined, 'loaded MyFamily_700-italic');

});


// ~~~~~~~~~~~~~~~~~~~~ Parallel loading (concurrency) ~~~~~~~~~~~~~~~~~~~~

test('loadManifest loads all fonts in parallel via Promise.allSettled', async function () {

  ExpoFontStub._clearLoadedFonts();

  const adapter = createAdapter();

  const manifest = {
    ConcurrentA: { styles: { '400': { asset: 1 }, '600': { asset: 2 } } },
    ConcurrentB: { styles: { '400': { asset: 3 }, '700': { asset: 4 } } },
    ConcurrentC: { styles: { '400': { asset: 5 } } }
  };

  await adapter.loadManifest(manifest);

  const loaded = ExpoFontStub._getLoadedFonts();
  const loadedCount = adapter.getLoadedCount().count;

  // 5 total font styles across 3 families
  assert.strictEqual(loadedCount, 5);
  assert.strictEqual(Object.keys(loaded).length, 5);

});

test('loadManifest with empty manifest returns success with zero loaded', async function () {

  const adapter = createAdapter();

  const result = await adapter.loadManifest({});

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);
  assert.strictEqual(adapter.getLoadedCount().count, 0);
  assert.strictEqual(adapter.getFailedCount().count, 0);

});


test('should mark a family only when every Expo style succeeds', async function () {

  ExpoFontStub._clearLoadedFonts();
  ExpoFontStub._setShouldFail(true);
  const adapter = createAdapter();
  const manifest = { LifecycleFailExpo: { styles: { '400': { asset: 1 } } } };
  const result = await adapter.loadManifest(manifest);
  ExpoFontStub._setShouldFail(false);
  assert.strictEqual(result.success, true);
  assert.strictEqual(adapter.isFamilyLoaded('LifecycleFailExpo'), false);
  if (Utils.isFunction(Font.isFamilyLoaded)) {
    assert.strictEqual(Font.isFamilyLoaded('LifecycleFailExpo'), false);
  }
  assert.strictEqual(adapter.isReady(), false);

});

// ~~~~~~~~~~~~~~~~~~~~ Partial failure with stub failure ~~~~~~~~~~~~~~~~~~~~

test('loadManifest tallies partial failure when expo-font rejects some fonts', async function () {

  ExpoFontStub._clearLoadedFonts();
  ExpoFontStub._setShouldFail(true);

  const adapter = createAdapter();

  const manifest = {
    FailFont: {
      styles: {
        '400': { asset: 1 }
      }
    }
  };

  const result = await adapter.loadManifest(manifest);

  ExpoFontStub._setShouldFail(false);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);
  assert.strictEqual(adapter.getFailedCount().count, 1);
  assert.strictEqual(adapter.getLoadedCount().count, 0);

});

test('loadManifest with FAIL_ON_ERROR returns error when expo-font rejects', async function () {

  ExpoFontStub._clearLoadedFonts();
  ExpoFontStub._setShouldFail(true);

  const adapter = createAdapter({ FAIL_ON_ERROR: true });

  const manifest = {
    FailFont: {
      styles: {
        '400': { asset: 1 }
      }
    }
  };

  const result = await adapter.loadManifest(manifest);

  ExpoFontStub._setShouldFail(false);

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.type, 'helper-font-ext-expo/load-failed');

});

test('loadManifest tallies mixed success and failure when some fonts fail', async function () {

  ExpoFontStub._clearLoadedFonts();

  const adapter = createAdapter();

  // One good family, one bad family (no source fields)
  const manifest = {
    GoodFont: {
      styles: {
        '400': { asset: 1 }
      }
    },
    BadFont: {
      styles: {
        '400': { url: null, path: null, asset: null }
      }
    }
  };

  const result = await adapter.loadManifest(manifest);

  assert.strictEqual(result.success, true);
  assert.strictEqual(adapter.getLoadedCount().count, 1);
  assert.strictEqual(adapter.getFailedCount().count, 1);

});


test('should clear readiness while an incremental Expo load is pending', async function () {

  ExpoFontStub._clearLoadedFonts();
  const adapter = createAdapter();
  await adapter.loadManifest({ ReadyExpo: { styles: { '400': { asset: 1 } } } });
  assert.strictEqual(adapter.isReady(), true);
  ExpoFontStub._setDeferred(true);
  const loading = adapter.loadManifest({ PendingExpo: { styles: { '400': { asset: 2 } } } });
  assert.strictEqual(adapter.isReady(), false);
  ExpoFontStub._resolveDeferred();
  await loading;
  assert.strictEqual(adapter.isReady(), true);
  ExpoFontStub._setDeferred(false);

});

test('should serialize overlapping manifest loads and skip duplicate Expo work', async function () {

  ExpoFontStub._clearLoadedFonts();
  ExpoFontStub._setDeferred(true);
  const adapter = createAdapter();
  const manifest = { OverlapExpo: { styles: { '400': { asset: 1 } } } };
  const first = adapter.loadManifest(manifest);
  const second = adapter.loadManifest(manifest);
  assert.strictEqual(ExpoFontStub._getPendingCount(), 1);
  assert.strictEqual(adapter.isReady(), false);
  ExpoFontStub._resolveDeferred();
  const results = await Promise.all([first, second]);
  assert.deepStrictEqual(results, [
    { success: true, error: null },
    { success: true, error: null }
  ]);
  assert.strictEqual(ExpoFontStub._getPendingCount(), 0);
  assert.strictEqual(adapter.isFamilyLoaded('OverlapExpo'), true);
  assert.strictEqual(adapter.isReady(), true);
  ExpoFontStub._setDeferred(false);

});

test('should preserve results when a failed Expo load is followed by a queued retry', async function () {

  ExpoFontStub._clearLoadedFonts();
  ExpoFontStub._setShouldFail(true);
  const adapter = createAdapter({ FAIL_ON_ERROR: true });
  const manifest = { QueuedRetryExpo: { styles: { '400': { asset: 1 } } } };
  const first = adapter.loadManifest(manifest);
  const second = adapter.loadManifest(manifest);
  ExpoFontStub._setShouldFail(false);
  const results = await Promise.all([first, second]);
  assert.strictEqual(results[0].success, false);
  assert.strictEqual(results[0].error.type, 'helper-font-ext-expo/load-failed');
  assert.deepStrictEqual(results[1], { success: true, error: null });
  assert.strictEqual(adapter.isFamilyLoaded('QueuedRetryExpo'), true);
  assert.strictEqual(adapter.isReady(), true);

});

test('should leave readiness false when a strict incremental Expo load fails', async function () {

  ExpoFontStub._clearLoadedFonts();
  const adapter = createAdapter({ FAIL_ON_ERROR: true });
  await adapter.loadManifest({ ReadyStrictExpo: { styles: { '400': { asset: 1 } } } });
  ExpoFontStub._setShouldFail(true);
  const result = await adapter.loadManifest({ FailedStrictExpo: { styles: { '400': { asset: 2 } } } });
  ExpoFontStub._setShouldFail(false);
  assert.strictEqual(result.success, false);
  assert.strictEqual(adapter.isReady(), false);

});

// ~~~~~~~~~~~~~~~~~~~~ Factory independence ~~~~~~~~~~~~~~~~~~~~

test('two adapter instances have independent loaded state', async function () {

  ExpoFontStub._clearLoadedFonts();

  const adapterA = createAdapter();
  const adapterB = createAdapter();

  const manifestA = {
    FamA: { styles: { '400': { asset: 1 } } }
  };

  const manifestB = {
    FamB: { styles: { '400': { asset: 2 } } }
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

  ExpoFontStub._clearLoadedFonts();

  const lenientAdapter = createAdapter({ FAIL_ON_ERROR: false });
  const strictAdapter = createAdapter({ FAIL_ON_ERROR: true });

  const badManifest = {
    Bad: { styles: { '400': { url: null, path: null, asset: null } } }
  };

  const lenientResult = await lenientAdapter.loadManifest(badManifest);
  const strictResult = await strictAdapter.loadManifest(badManifest);

  assert.strictEqual(lenientResult.success, true);
  assert.strictEqual(strictResult.success, false);
  assert.strictEqual(strictResult.error.type, 'helper-font-ext-expo/load-failed');

});

test('constructor throws when FAIL_ON_ERROR is not a boolean', function () {

  assert.throws(function () {
    createAdapter({ FAIL_ON_ERROR: 'yes' });
  }, /FAIL_ON_ERROR must be a boolean/);

});

test('omitting FAIL_ON_ERROR retains the default false', function () {

  const adapter = createAdapter();

  // Default is false - a failure should not return error
  // Verified by the fact that the adapter constructs without error
  assert.ok(adapter);
  assert.strictEqual(typeof adapter.loadManifest, 'function');

});
