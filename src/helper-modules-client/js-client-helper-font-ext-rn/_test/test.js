import { test } from 'node:test';
import assert from 'node:assert/strict';
import fontExtRnLoader from 'helper-font-ext-rn';
import fontLoader from 'helper-font';

import {
  RNFontAdapter,
  Font,
  Utils,
  Debug
} from './loader.js';


// ~~~~~~~~~~~~~~~~~~~~ loadManifest ~~~~~~~~~~~~~~~~~~~~

test('loadManifest loads all fonts via the native loader', async function () {

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

  // Register a family with no path to trigger loadFontFile failure
  Font.registerFamilies({
    BadFont: {
      styles: {
        '400': { url: 'https://example.com/bad.woff2' }
      }
    }
  });

  const FailingAdapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  }, {
    FAIL_ON_ERROR: true
  });

  const result = await FailingAdapter.loadManifest(Font.getManifest().manifest);

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.type, 'helper-font-ext-rn/load-failed');

});

test('loadManifest without FAIL_ON_ERROR continues on failure', async function () {

  // The BadFont entry (url only, no path) will fail validation in loadFontFile
  const LenientAdapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  const result = await LenientAdapter.loadManifest(Font.getManifest().manifest);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  // At least the BadFont entry should have failed
  const failedResult = LenientAdapter.getFailedCount();
  assert.ok(failedResult.count > 0);

});

test('loadManifest rejects entry with url but no path', async function () {

  // Build a manifest with a url-only entry
  const manifest = {
    UrlOnlyFont: {
      styles: {
        '400': { url: 'https://example.com/font.woff2', path: null, asset: null, weight: null, style: 'normal' }
      }
    }
  };

  const StrictAdapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  }, {
    FAIL_ON_ERROR: true
  });

  const result = await StrictAdapter.loadManifest(manifest);

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.type, 'helper-font-ext-rn/load-failed');

  // The UrlOnlyFont entry should have failed
  const failedResult = StrictAdapter.getFailedCount();
  assert.strictEqual(failedResult.count, 1);

});

test('loadManifest accepts entry with path', async function () {

  // Build a manifest with a path-only entry
  const manifest = {
    PathOnlyFont: {
      styles: {
        '400': { path: '/app/fonts/path-only.ttf', url: null, asset: null, weight: null, style: 'normal' }
      }
    }
  };

  const result = await RNFontAdapter.loadManifest(manifest);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  const loadedResult = RNFontAdapter.getLoadedCount();
  assert.strictEqual(loadedResult.count, 1);

  const failedResult = RNFontAdapter.getFailedCount();
  assert.strictEqual(failedResult.count, 0);

});


// ~~~~~~~~~~~~~~~~~~~~ isReady ~~~~~~~~~~~~~~~~~~~~

test('isReady returns false before loadManifest', function () {

  const FreshAdapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  const result = FreshAdapter.isReady();

  assert.strictEqual(result, false);

});

test('isReady returns true after successful loadManifest', async function () {

  const FreshAdapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  const manifest = {
    TestFont: {
      styles: {
        '400': { path: '/app/fonts/test.ttf', url: null, asset: null, weight: null, style: 'normal' }
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

    fontExtRnLoader({
      Utils: Utils,
      Debug: Debug
    });

  }, /Font is required/);

});

test('constructor does not require NativeFontLoader injection', function () {

  // The extension now requires @vitrion/react-native-load-fonts directly.
  // No NativeFontLoader in shared_libs - should NOT throw.
  const Adapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  assert.ok(Adapter);
  assert.strictEqual(typeof Adapter.loadManifest, 'function');

});


// ~~~~~~~~~~~~~~~~~~~~ isFamilyLoaded ~~~~~~~~~~~~~~~~~~~~

test('isFamilyLoaded returns false before loadManifest', function () {

  const FreshAdapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  const result = FreshAdapter.isFamilyLoaded('TestFont');

  assert.strictEqual(result, false);

});

test('isFamilyLoaded returns true after loadManifest', async function () {

  const FreshAdapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  const manifest = {
    TestFontIsFam: {
      styles: {
        '400': { path: '/app/fonts/test-isfam.ttf', url: null, asset: null, weight: null, style: 'normal' }
      }
    }
  };

  await FreshAdapter.loadManifest(manifest);

  const result = FreshAdapter.isFamilyLoaded('TestFontIsFam');

  assert.strictEqual(result, true);

});


// ~~~~~~~~~~~~~~~~~~~~ Incremental loading ~~~~~~~~~~~~~~~~~~~~

test('loadManifest skips already-loaded families on second call', async function () {

  const FreshAdapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  const manifest = {
    IncFont1: {
      styles: {
        '400': { path: '/app/fonts/inc1.ttf', url: null, asset: null, weight: null, style: 'normal' }
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

  const FreshAdapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  // First load with one family
  await FreshAdapter.loadManifest({
    PartialFont1: {
      styles: {
        '400': { path: '/app/fonts/partial1.ttf', url: null, asset: null, weight: null, style: 'normal' }
      }
    }
  });

  assert.strictEqual(FreshAdapter.isFamilyLoaded('PartialFont1'), true);
  assert.strictEqual(FreshAdapter.isFamilyLoaded('PartialFont2'), false);

  // Second load with a new family
  await FreshAdapter.loadManifest({
    PartialFont2: {
      styles: {
        '400': { path: '/app/fonts/partial2.ttf', url: null, asset: null, weight: null, style: 'normal' }
      }
    }
  });

  assert.strictEqual(FreshAdapter.isFamilyLoaded('PartialFont2'), true);

  // Only the new family should have been loaded
  const loadedResult = FreshAdapter.getLoadedCount();
  assert.strictEqual(loadedResult.count, 1);

});


// ~~~~~~~~~~~~~~~~~~~~ Style-level incremental loading (FN2) ~~~~~~~~~~~~~~~~~~~~

test('loadManifest loads a new weight for an already-loaded family on second call', async function () {

  const FreshAdapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  const manifest1 = {
    StyleFont1: {
      styles: {
        '400': { path: '/app/fonts/style1-400.ttf' }
      }
    }
  };

  // First load - one style
  await FreshAdapter.loadManifest(manifest1);
  assert.strictEqual(FreshAdapter.isFamilyLoaded('StyleFont1'), true);

  // Second load - same family, add a new weight
  const manifest2 = {
    StyleFont1: {
      styles: {
        '600': { path: '/app/fonts/style1-600.ttf' }
      }
    }
  };

  await FreshAdapter.loadManifest(manifest2);

  // The new weight should have been loaded (style-level incremental, not family-level skip)
  const loadedResult = FreshAdapter.getLoadedCount();
  assert.strictEqual(loadedResult.count, 1, 'new weight should be loaded on second call');

});

test('loadManifest does not reload an already-loaded style', async function () {

  const FreshAdapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  const manifest = {
    StyleFont2: {
      styles: {
        '400': { path: '/app/fonts/style2-400.ttf' }
      }
    }
  };

  // First load
  await FreshAdapter.loadManifest(manifest);
  assert.strictEqual(FreshAdapter.getLoadedCount().count, 1);

  // Second load - same style
  await FreshAdapter.loadManifest(manifest);

  // The already-loaded style should not be reloaded
  const loadedResult = FreshAdapter.getLoadedCount();
  assert.strictEqual(loadedResult.count, 0, 'already-loaded style should not be reloaded');

});

test('loadManifest with a partially failing family stays isFamilyLoaded false and retry requests only the failed style', async function () {

  const FreshAdapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  }, {
    FAIL_ON_ERROR: false
  });

  // Load a family where one style has no path (will fail validation)
  const manifest = {
    StyleFont3: {
      styles: {
        '400': { path: '/app/fonts/style3-400.ttf' },
        '600': { path: null }
      }
    }
  };

  const result = await FreshAdapter.loadManifest(manifest);

  // The family should not be marked as loaded (one style failed)
  assert.strictEqual(FreshAdapter.isFamilyLoaded('StyleFont3'), false);

  // One style should have failed
  const failedResult = FreshAdapter.getFailedCount();
  assert.strictEqual(failedResult.count, 1);

  // Retry with only the failed style, now with a valid path
  const retryManifest = {
    StyleFont3: {
      styles: {
        '600': { path: '/app/fonts/style3-600.ttf' }
      }
    }
  };

  const retryResult = await FreshAdapter.loadManifest(retryManifest);

  // Now the family should be loaded (both styles succeeded)
  assert.strictEqual(FreshAdapter.isFamilyLoaded('StyleFont3'), true);

  // The retry should have loaded only the previously-failed style
  const loadedResult = FreshAdapter.getLoadedCount();
  assert.strictEqual(loadedResult.count, 1, 'retry should load only the failed style');

});

test('clearManifest resets all loaded state including loadedStyles and failedStyles', async function () {

  const FreshAdapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  const manifest = {
    StyleFont4: {
      styles: {
        '400': { path: '/app/fonts/style4-400.ttf' }
      }
    }
  };

  await FreshAdapter.loadManifest(manifest);
  assert.strictEqual(FreshAdapter.isFamilyLoaded('StyleFont4'), true);
  assert.strictEqual(FreshAdapter.isReady(), true);

  FreshAdapter.clearManifest();

  assert.strictEqual(FreshAdapter.isFamilyLoaded('StyleFont4'), false);
  assert.strictEqual(FreshAdapter.isReady(), false);

  // After clear, reloading should work from scratch
  const loadedResult = FreshAdapter.getLoadedCount();
  assert.strictEqual(loadedResult.count, 0);

});


// ~~~~~~~~~~~~~~~~~~~~ Resolved name capture (FN1) ~~~~~~~~~~~~~~~~~~~~

test('FN1: stub resolving IBM Plex Sans for family IBMPlexSans makes resolveFamily return IBM Plex Sans', async function () {

  // Use a fresh Font core so we can register IBMPlexSans independently
  const RNFont = fontLoader({ Utils: Utils, Debug: Debug });
  RNFont.registerFamilies({
    IBMPlexSans: {
      styles: {
        '400': { path: '/app/fonts/ibm-plex-sans-400.ttf' }
      }
    }
  });

  const FreshAdapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: RNFont
  });

  // Set the stub to resolve a different name
  const stub = await import('./stubs/native-loader.js');
  stub._clearLoadedFonts();
  stub._setResolvedName('IBM Plex Sans');

  await FreshAdapter.loadManifest({
    IBMPlexSans: {
      styles: {
        '400': { path: '/app/fonts/ibm-plex-sans-400.ttf' }
      }
    }
  });

  // After loading, resolveFamily should return the platform-resolved name
  const result = RNFont.resolveFamily('IBMPlexSans');
  assert.strictEqual(result.family, 'IBM Plex Sans');

  // Cleanup
  stub._clearResolvedName();
  stub._clearLoadedFonts();

});

test('FN1: same resolved name as family name leaves it unchanged', async function () {

  const RNFont = fontLoader({ Utils: Utils, Debug: Debug });
  RNFont.registerFamilies({
    SameNameFont: {
      styles: {
        '400': { path: '/app/fonts/samename-400.ttf' }
      }
    }
  });

  const FreshAdapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: RNFont
  });

  // Set the stub to resolve the same name
  const stub = await import('./stubs/native-loader.js');
  stub._clearLoadedFonts();
  stub._setResolvedName('SameNameFont');

  await FreshAdapter.loadManifest({
    SameNameFont: {
      styles: {
        '400': { path: '/app/fonts/samename-400.ttf' }
      }
    }
  });

  // resolveFamily should return the family name unchanged
  const result = RNFont.resolveFamily('SameNameFont');
  assert.strictEqual(result.family, 'SameNameFont');

  // Cleanup
  stub._clearResolvedName();
  stub._clearLoadedFonts();

});

test('FN1: a failed load records no platform name', async function () {

  const RNFont = fontLoader({ Utils: Utils, Debug: Debug });
  RNFont.registerFamilies({
    FailFont: {
      styles: {
        '400': { path: '/app/fonts/fail-400.ttf' }
      }
    }
  });

  const FreshAdapter = fontExtRnLoader({
    Utils: Utils,
    Debug: Debug,
    Font: RNFont
  }, {
    FAIL_ON_ERROR: false
  });

  // Set the stub to fail
  const stub = await import('./stubs/native-loader.js');
  stub._clearLoadedFonts();
  stub._setShouldFail(true);
  stub._setResolvedName('Should Not Be Recorded');

  await FreshAdapter.loadManifest({
    FailFont: {
      styles: {
        '400': { path: '/app/fonts/fail-400.ttf' }
      }
    }
  });

  // resolveFamily should NOT return the platform name (load failed)
  const result = RNFont.resolveFamily('FailFont');
  assert.strictEqual(result.family, 'FailFont');

  // Cleanup
  stub._setShouldFail(false);
  stub._clearResolvedName();
  stub._clearLoadedFonts();

});
