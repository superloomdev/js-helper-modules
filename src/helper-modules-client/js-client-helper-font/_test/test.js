'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { Font } = require('./loader');


// ~~~~~~~~~~~~~~~~~~~~ System family (seeded at construction) ~~~~~~~~~~~~~~~~~~~~

test('System family is registered at construction', function () {

  const result = Font.getRegisteredFamilies();

  assert.strictEqual(result.success, true);
  assert.ok(result.families.includes('System'));
  assert.strictEqual(result.error, null);

});

test('resolveFamily returns System for the System token', function () {

  const result = Font.resolveFamily('System');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.family, 'System');
  assert.strictEqual(result.error, null);

});


// ~~~~~~~~~~~~~~~~~~~~ registerFamilies ~~~~~~~~~~~~~~~~~~~~

test('registerFamilies with styles map', function () {

  const result = Font.registerFamilies({
    Poppins: {
      styles: {
        '400': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2' },
        '600': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2' }
      }
    }
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  // Verify the family is registered
  const families = Font.getRegisteredFamilies();
  assert.ok(families.families.includes('Poppins'));

});

test('registerFamilies with flat entry', function () {

  const result = Font.registerFamilies({
    Lora: {
      url: 'https://example.com/lora-regular.ttf',
      weight: '400'
    }
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  // Verify the family is registered
  const families = Font.getRegisteredFamilies();
  assert.ok(families.families.includes('Lora'));

});

test('registerFamilies rejects non-object manifest', function () {

  const result = Font.registerFamilies('not an object');

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.type, 'helper-font/invalid-manifest');

});

test('registerFamilies rejects array manifest', function () {

  const result = Font.registerFamilies([]);

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.type, 'helper-font/invalid-manifest');

});


// ~~~~~~~~~~~~~~~~~~~~ resolveFamily ~~~~~~~~~~~~~~~~~~~~

test('resolveFamily returns registered family', function () {

  Font.registerFamilies({
    Poppins: {
      styles: {
        '400': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2' }
      }
    }
  });

  const result = Font.resolveFamily('Poppins');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.family, 'Poppins');
  assert.strictEqual(result.error, null);

});

test('resolveFamily falls back to System for unknown token', function () {

  const result = Font.resolveFamily('NonExistent');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.family, 'System');
  assert.strictEqual(result.error, null);

});

test('resolveFamily rejects empty token', function () {

  const result = Font.resolveFamily('');

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.family, null);
  assert.strictEqual(result.error.type, 'helper-font/invalid-token');

});


// ~~~~~~~~~~~~~~~~~~~~ buildFontFaceString ~~~~~~~~~~~~~~~~~~~~

test('buildFontFaceString with name, url, weight, and style', function () {

  const result = Font.buildFontFaceString(
    'Poppins',
    'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2',
    '400',
    'normal'
  );

  assert.strictEqual(result.success, true);
  assert.ok(result.css.indexOf('@font-face {') === 0);
  assert.ok(result.css.indexOf('font-family: \'Poppins\';') !== -1);
  assert.ok(result.css.indexOf('src: url(\'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2\');') !== -1);
  assert.ok(result.css.indexOf('font-weight: 400;') !== -1);
  assert.ok(result.css.indexOf('font-style: normal;') !== -1);
  assert.strictEqual(result.error, null);

});

test('buildFontFaceString with name and url only', function () {

  const result = Font.buildFontFaceString(
    'Lora',
    'https://example.com/lora-regular.ttf'
  );

  assert.strictEqual(result.success, true);
  assert.ok(result.css.indexOf('@font-face {') === 0);
  assert.ok(result.css.indexOf('font-family: \'Lora\';') !== -1);
  assert.ok(result.css.indexOf('font-style: normal;') !== -1);
  assert.strictEqual(result.error, null);

});

test('buildFontFaceString rejects empty name', function () {

  const result = Font.buildFontFaceString('', 'https://example.com/font.woff2');

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.css, null);
  assert.strictEqual(result.error.type, 'helper-font/invalid-family-name');

});

test('buildFontFaceString rejects empty url', function () {

  const result = Font.buildFontFaceString('Poppins', '');

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.css, null);
  assert.strictEqual(result.error.type, 'helper-font/invalid-url');

});

test('buildFontFaceString rejects invalid style', function () {

  const result = Font.buildFontFaceString('Poppins', 'https://example.com/font.woff2', '400', 'oblique');

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.css, null);
  assert.strictEqual(result.error.type, 'helper-font/invalid-style');

});


// ~~~~~~~~~~~~~~~~~~~~ getManifest ~~~~~~~~~~~~~~~~~~~~

test('getManifest returns registered families with styles', function () {

  Font.registerFamilies({
    Poppins: {
      styles: {
        '400': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2' },
        '600': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2' }
      }
    }
  });

  const result = Font.getManifest();

  assert.strictEqual(result.success, true);
  assert.ok(result.manifest.Poppins);
  assert.ok(result.manifest.Poppins.styles['400']);
  assert.ok(result.manifest.Poppins.styles['600']);
  assert.strictEqual(result.manifest.Poppins.styles['400'].url, 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2');
  assert.strictEqual(result.error, null);

});

test('getManifest excludes System (no style entries)', function () {

  const result = Font.getManifest();

  assert.strictEqual(result.success, true);
  assert.ok(!result.manifest.System);
  assert.strictEqual(result.error, null);

});


// ~~~~~~~~~~~~~~~~~~~~ getRegisteredFamilies ~~~~~~~~~~~~~~~~~~~~

test('getRegisteredFamilies includes System and registered families', function () {

  Font.registerFamilies({
    Poppins: {
      styles: { '400': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2' } }
    }
  });

  const result = Font.getRegisteredFamilies();

  assert.strictEqual(result.success, true);
  assert.ok(result.families.includes('System'));
  assert.ok(result.families.includes('Poppins'));
  assert.strictEqual(result.error, null);

});


// ~~~~~~~~~~~~~~~~~~~~ Constructor validation ~~~~~~~~~~~~~~~~~~~~

test('constructor throws on invalid DEFAULT_FAMILY', function () {

  assert.throws(function () {

    require('helper-font')({
      Utils: require('helper-utils')()
    }, {
      DEFAULT_FAMILY: ''
    });

  }, /DEFAULT_FAMILY must be a non-empty string/);

});
