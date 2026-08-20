'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  WebFontAdapter,
  Font,
  Utils,
  Debug,
  docStub,
  createDocumentStub
} = require('./loader');


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
  const AdapterNoDoc = require('helper-font-ext-web')({
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
  const FreshAdapter = require('helper-font-ext-web')({
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
  const FreshAdapter = require('helper-font-ext-web')({
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
  const FreshAdapter = require('helper-font-ext-web')({
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

    require('helper-font-ext-web')({
      Utils: Utils,
      Debug: Debug
    });

  }, /Font is required/);

});


// ~~~~~~~~~~~~~~~~~~~~ isFamilyLoaded ~~~~~~~~~~~~~~~~~~~~

test('isFamilyLoaded returns false before loadManifest', function () {

  const freshDoc = createDocumentStub();
  const FreshAdapter = require('helper-font-ext-web')({
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
  const FreshAdapter = require('helper-font-ext-web')({
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
  const FreshAdapter = require('helper-font-ext-web')({
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
  const FreshAdapter = require('helper-font-ext-web')({
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
  const FreshAdapter = require('helper-font-ext-web')({
    Utils: Utils,
    Debug: Debug,
    Font: Font,
    Document: freshDoc
  });

  // Manifest with a path-only entry (no url) — should be skipped
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
