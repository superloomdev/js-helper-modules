import { test } from 'node:test';
import assert from 'node:assert/strict';
import webFontExtWebLoader from 'helper-font-ext-web';
import fontLoader from 'helper-font';

import {
  WebFontAdapter,
  Font,
  Utils,
  Debug,
  docStub,
  createDocumentStub
} from './loader.js';


test('should not mark a family loaded before browser font loading completes', async function () {

  const Core = fontLoader({ Utils, Debug });
  Core.registerFamilies({ Pending: { url: '/pending.woff2', weight: '400' } });
  const Document = createDocumentStub();
  let finish;
  const pending = new Promise(function (resolve) { finish = resolve; });
  Document.fonts = { load: function () { return pending; } };
  const Adapter = webFontExtWebLoader({ Utils, Debug, Font: Core, Document });
  const loading = Adapter.loadManifest(Core.getManifest().manifest);
  try {
    assert.equal(Core.isFamilyLoaded('Pending'), false);
    assert.equal(Adapter.isFamilyLoaded('Pending'), false);
    assert.equal(Adapter.isReady(), false);
  } finally {
    finish([{}]);
    await loading;
    Adapter.clearManifest();
  }

});

test('should clear readiness while an incremental browser face check is pending', async function () {

  const Core = fontLoader({ Utils, Debug });
  Core.registerFamilies({ ReadyWeb: { url: '/ready.woff2' }, PendingWeb: { url: '/pending.woff2' } });
  const Document = createDocumentStub();
  const Adapter = webFontExtWebLoader({ Utils, Debug, Font: Core, Document });
  await Adapter.loadManifest({ ReadyWeb: Core.getManifest().manifest.ReadyWeb });
  assert.equal(Adapter.isReady(), true);
  let finish;
  Document.fonts.load = function () {
    return new Promise(function (resolve) { finish = resolve; });
  };
  const loading = Adapter.loadManifest({ PendingWeb: Core.getManifest().manifest.PendingWeb });
  assert.equal(Adapter.isReady(), false);
  finish([{}]);
  await loading;
  assert.equal(Adapter.isReady(), true);
  Adapter.clearManifest();

});

test('should serialize overlapping manifest loads and skip duplicate browser work', async function () {

  const Core = fontLoader({ Utils, Debug });
  Core.registerFamilies({ OverlapWeb: { url: '/overlap.woff2', weight: '400' } });
  const Document = createDocumentStub();
  const finishes = [];
  let loadCount = 0;
  Document.fonts.load = function () {
    loadCount++;
    return new Promise(function (resolve) { finishes.push(resolve); });
  };
  const Adapter = webFontExtWebLoader({ Utils, Debug, Font: Core, Document });
  const manifest = Core.getManifest().manifest;
  const first = Adapter.loadManifest(manifest);
  const firstLoadCount = loadCount;
  const second = Adapter.loadManifest(manifest);
  assert.ok(firstLoadCount > 0);
  assert.equal(loadCount, firstLoadCount);
  assert.equal(Adapter.isReady(), false);
  for (let i = 0; i < finishes.length; i++) {
    finishes[i]([{}]);
  }
  const results = await Promise.all([first, second]);
  assert.deepEqual(results, [
    { success: true, error: null },
    { success: true, error: null }
  ]);
  assert.equal(loadCount, firstLoadCount);
  assert.equal(Document._head.children.length, 1);
  assert.equal(Adapter.isFamilyLoaded('OverlapWeb'), true);
  assert.equal(Adapter.isReady(), true);
  Adapter.clearManifest();

});

test('should preserve results when a failed browser load is followed by a queued retry', async function () {

  const Core = fontLoader({ Utils, Debug });
  Core.registerFamilies({ QueuedRetryWeb: { url: '/retry-queued.woff2', weight: '400' } });
  const Document = createDocumentStub();
  let shouldFail = true;
  Document.fonts.load = function () {
    return shouldFail ? Promise.reject(new Error('font failed')) : Promise.resolve([{}]);
  };
  const Adapter = webFontExtWebLoader({ Utils, Debug, Font: Core, Document });
  const manifest = Core.getManifest().manifest;
  const first = Adapter.loadManifest(manifest);
  const second = Adapter.loadManifest(manifest);
  shouldFail = false;
  const results = await Promise.all([first, second]);
  assert.equal(results[0].success, false);
  assert.equal(results[0].error.type, 'helper-font-ext-web/document-unavailable');
  assert.deepEqual(results[1], { success: true, error: null });
  assert.equal(Adapter.isFamilyLoaded('QueuedRetryWeb'), true);
  assert.equal(Adapter.isReady(), true);
  assert.equal(Document._head.children.length, 1);
  Adapter.clearManifest();

});

test('should clean failed CSS and allow retry when browser face loading rejects', async function () {

  const Core = fontLoader({ Utils, Debug });
  Core.registerFamilies({ RetryWeb: { url: '/retry.woff2', weight: '400' } });
  const Document = createDocumentStub();
  let shouldFail = true;
  Document.fonts = { load: function () {
    return shouldFail ? Promise.reject(new Error('font failed')) : Promise.resolve([{}]);
  } };
  const Adapter = webFontExtWebLoader({ Utils, Debug, Font: Core, Document });
  const failed = await Adapter.loadManifest(Core.getManifest().manifest);
  assert.equal(failed.success, false);
  assert.equal(Document._head.children.length, 0);
  assert.equal(Adapter.isReady(), false);
  shouldFail = false;
  const retried = await Adapter.loadManifest(Core.getManifest().manifest);
  assert.equal(retried.success, true);
  assert.equal(Document._head.children.length, 1);
  assert.equal(Adapter.isFamilyLoaded('RetryWeb'), true);
  assert.equal(Core.isFamilyLoaded('RetryWeb'), true);
  Adapter.clearManifest();

});

test('should preserve successful family CSS when another family fails', async function () {

  const Core = fontLoader({ Utils, Debug });
  Core.registerFamilies({
    PartialGood: { url: '/good.woff2', weight: '400' },
    PartialBad: { url: '/bad.woff2', weight: '400' }
  });
  const Document = createDocumentStub();
  Document.fonts.load = function (descriptor) {
    return descriptor.indexOf('PartialGood') !== -1
      ? Promise.resolve([{}])
      : Promise.reject(new Error('font failed'));
  };
  const Adapter = webFontExtWebLoader({ Utils, Debug, Font: Core, Document });
  const result = await Adapter.loadManifest(Core.getManifest().manifest);
  assert.equal(result.success, false);
  assert.equal(Document._head.children.length, 1);
  assert.ok(Document._head.children[0].textContent.indexOf('PartialGood') !== -1);
  assert.ok(Document._head.children[0].textContent.indexOf('PartialBad') === -1);
  assert.equal(Adapter.isFamilyLoaded('PartialGood'), true);
  assert.equal(Adapter.isFamilyLoaded('PartialBad'), false);
  Document.fonts.load = function () { return Promise.resolve([{}]); };
  const retried = await Adapter.loadManifest({ PartialBad: Core.getManifest().manifest.PartialBad });
  assert.equal(retried.success, true);
  assert.equal(Adapter.isFamilyLoaded('PartialBad'), true);
  assert.equal(Document._head.children.length, 2);
  Adapter.clearManifest();
  assert.equal(Document._head.children.length, 0);

});

test('should reject empty or unavailable browser font checks', async function () {

  for (const mode of ['empty', 'missing']) {
    const Core = fontLoader({ Utils, Debug });
    const familyName = 'Unconfirmed' + mode;
    Core.registerFamilies({ [familyName]: { url: '/' + mode + '.woff2', weight: '400' } });
    const Document = createDocumentStub();
    if (mode === 'empty') {
      Document.fonts.load = function () { return Promise.resolve([]); };
    } else {
      delete Document.fonts;
    }
    const Adapter = webFontExtWebLoader({ Utils, Debug, Font: Core, Document });
    const result = await Adapter.loadManifest(Core.getManifest().manifest);
    assert.equal(result.success, false);
    assert.equal(Adapter.isFamilyLoaded(familyName), false);
    assert.equal(Core.isFamilyLoaded(familyName), false);
    assert.equal(Adapter.isReady(), false);
    assert.equal(Document._head.children.length, 0);
  }

});

test('should leave core and adapter unloaded when DOM insertion fails', async function () {

  const Core = fontLoader({ Utils, Debug });
  Core.registerFamilies({ Failed: { url: '/failed.woff2', weight: '400' } });
  const Document = createDocumentStub();
  Document.head.appendChild = function () { throw new Error('DOM unavailable'); };
  const Adapter = webFontExtWebLoader({ Utils, Debug, Font: Core, Document });
  const result = await Adapter.loadManifest(Core.getManifest().manifest);
  assert.equal(result.success, false);
  assert.equal(Core.isFamilyLoaded('Failed'), false);
  assert.equal(Adapter.isFamilyLoaded('Failed'), false);

});

test('should not mark a skipped native-only family loaded in the core', async function () {

  const Core = fontLoader({ Utils, Debug });
  Core.registerFamilies({ NativeOnly: { path: '/native.ttf', weight: '400' } });
  const Adapter = webFontExtWebLoader({ Utils, Debug, Font: Core, Document: createDocumentStub() });
  await Adapter.loadManifest(Core.getManifest().manifest);
  assert.equal(Core.isFamilyLoaded('NativeOnly'), false);
  assert.equal(Adapter.isFamilyLoaded('NativeOnly'), false);

});

// ~~~~~~~~~~~~~~~~~~~~ loadManifest ~~~~~~~~~~~~~~~~~~~~

test('loadManifest injects @font-face CSS into the DOM', async function () {

  const manifest = Font.getManifest().manifest;

  const result = await WebFontAdapter.loadManifest(manifest);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  // Verify a style node was appended to head
  assert.strictEqual(docStub._head.children.length, 1);

  const styleNode = docStub._head.children[0];
  assert.strictEqual(styleNode.tagName, 'style');
  assert.strictEqual(styleNode.attributes['data-font-loader'], 'helper-font-ext-web');

  // Verify the CSS contains @font-face for Poppins and Lora
  assert.ok(styleNode.textContent.indexOf('@font-face') !== -1);
  assert.ok(styleNode.textContent.indexOf('font-family: \'Poppins\'') !== -1);
  assert.ok(styleNode.textContent.indexOf('font-family: \'Lora\'') !== -1);

  // Cleanup
  WebFontAdapter.clearManifest();

});

test('loadManifest rejects invalid manifest', async function () {

  const result = await WebFontAdapter.loadManifest('not an object');

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.type, 'helper-font-ext-web/invalid-manifest');

});

test('loadManifest returns error when document is unavailable', async function () {

  // Build an adapter with no document and no global document
  const AdapterNoDoc = webFontExtWebLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font
  });

  const result = await AdapterNoDoc.loadManifest({});

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.type, 'helper-font-ext-web/document-unavailable');

});


// ~~~~~~~~~~~~~~~~~~~~ isReady ~~~~~~~~~~~~~~~~~~~~

test('isReady returns false before loadManifest', async function () {

  const freshDoc = createDocumentStub();
  const FreshAdapter = webFontExtWebLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font,
    Document: freshDoc
  });

  const result = FreshAdapter.isReady();

  assert.strictEqual(result, false);

});

test('isReady returns true after loadManifest', async function () {

  const freshDoc = createDocumentStub();
  const FreshAdapter = webFontExtWebLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font,
    Document: freshDoc
  });

  await FreshAdapter.loadManifest(Font.getManifest().manifest);

  const result = FreshAdapter.isReady();

  assert.strictEqual(result, true);

  FreshAdapter.clearManifest();

});


// ~~~~~~~~~~~~~~~~~~~~ clearManifest ~~~~~~~~~~~~~~~~~~~~

test('clearManifest removes the style node from the DOM', async function () {

  const freshDoc = createDocumentStub();
  const FreshAdapter = webFontExtWebLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font,
    Document: freshDoc
  });

  await FreshAdapter.loadManifest(Font.getManifest().manifest);

  assert.strictEqual(freshDoc._head.children.length, 1);

  FreshAdapter.clearManifest();

  assert.strictEqual(freshDoc._head.children.length, 0);

  const readyResult = FreshAdapter.isReady();
  assert.strictEqual(readyResult, false);

});


// ~~~~~~~~~~~~~~~~~~~~ Constructor validation ~~~~~~~~~~~~~~~~~~~~

test('constructor throws when Font core is not injected', function () {

  assert.throws(function () {

    webFontExtWebLoader({
      Utils: Utils,
      Debug: Debug
    });

  }, /Font is required/);

});


// ~~~~~~~~~~~~~~~~~~~~ isFamilyLoaded ~~~~~~~~~~~~~~~~~~~~

test('isFamilyLoaded returns false before loadManifest', function () {

  const freshDoc = createDocumentStub();
  const FreshAdapter = webFontExtWebLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font,
    Document: freshDoc
  });

  const result = FreshAdapter.isFamilyLoaded('Poppins');

  assert.strictEqual(result, false);

});

test('isFamilyLoaded returns true after loadManifest', async function () {

  const freshDoc = createDocumentStub();
  const FreshAdapter = webFontExtWebLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font,
    Document: freshDoc
  });

  await FreshAdapter.loadManifest(Font.getManifest().manifest);

  const result = FreshAdapter.isFamilyLoaded('Poppins');

  assert.strictEqual(result, true);

  FreshAdapter.clearManifest();

});


// ~~~~~~~~~~~~~~~~~~~~ Incremental loading ~~~~~~~~~~~~~~~~~~~~

test('loadManifest skips already-loaded families on second call', async function () {

  const freshDoc = createDocumentStub();
  const FreshAdapter = webFontExtWebLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font,
    Document: freshDoc
  });

  // First load with Poppins + Lora
  await FreshAdapter.loadManifest(Font.getManifest().manifest);

  assert.strictEqual(freshDoc._head.children.length, 1);

  // Second load with same manifest - should skip all families
  await FreshAdapter.loadManifest(Font.getManifest().manifest);

  // No new style node should be appended
  assert.strictEqual(freshDoc._head.children.length, 1);

  // isReady should still be true
  const readyResult = FreshAdapter.isReady();
  assert.strictEqual(readyResult, true);

  FreshAdapter.clearManifest();

});

test('loadManifest with partial manifest loads only new families', async function () {

  const freshDoc = createDocumentStub();
  const FreshAdapter = webFontExtWebLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font,
    Document: freshDoc
  });

  // First load with Poppins only
  await FreshAdapter.loadManifest({
    Poppins: {
      styles: {
        '400': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2', path: null, asset: null, weight: null, style: 'normal' }
      }
    }
  });

  assert.strictEqual(freshDoc._head.children.length, 1);
  assert.strictEqual(FreshAdapter.isFamilyLoaded('Poppins'), true);
  assert.strictEqual(FreshAdapter.isFamilyLoaded('Lora'), false);

  // Second load with Lora only (new family)
  await FreshAdapter.loadManifest({
    Lora: {
      styles: {
        '400': { url: 'https://example.com/lora-regular.ttf', path: null, asset: null, weight: null, style: 'normal' }
      }
    }
  });

  // A new style node should be appended for the new family
  assert.strictEqual(freshDoc._head.children.length, 2);
  assert.strictEqual(FreshAdapter.isFamilyLoaded('Lora'), true);

  FreshAdapter.clearManifest();

});


// ~~~~~~~~~~~~~~~~~~~~ Multi-source manifest ~~~~~~~~~~~~~~~~~~~~

test('loadManifest skips entries without url (native/Expo-only)', async function () {

  const freshDoc = createDocumentStub();
  const FreshAdapter = webFontExtWebLoader({
    Utils: Utils,
    Debug: Debug,
    Font: Font,
    Document: freshDoc
  });

  // Manifest with a path-only entry (no url) - should be skipped
  const manifest = {
    NativeOnlyFont: {
      styles: {
        '400': { path: '/app/fonts/native-only.ttf', url: null, asset: null, weight: null, style: 'normal' }
      }
    },
    WebFont: {
      styles: {
        '400': { url: 'https://example.com/web.woff2', path: null, asset: null, weight: null, style: 'normal' }
      }
    }
  };

  const result = await FreshAdapter.loadManifest(manifest);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  // Verify only the WebFont @font-face was injected
  const styleNode = freshDoc._head.children[0];
  assert.ok(styleNode.textContent.indexOf('font-family: \'WebFont\'') !== -1);
  assert.ok(styleNode.textContent.indexOf('NativeOnlyFont') === -1);

  FreshAdapter.clearManifest();

});
