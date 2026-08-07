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
        '400': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2', path: '/app/fonts/poppins-400.ttf' },
        '600': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2', path: '/app/fonts/poppins-600.ttf' }
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
      path: '/app/fonts/lora-regular.ttf',
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
        '400': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2', path: '/app/fonts/poppins-400.ttf' }
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
        '400': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2', path: '/app/fonts/poppins-400.ttf' },
        '600': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2', path: '/app/fonts/poppins-600.ttf' }
      }
    }
  });

  const result = Font.getManifest();

  assert.strictEqual(result.success, true);
  assert.ok(result.manifest.Poppins);
  assert.ok(result.manifest.Poppins.styles['400']);
  assert.ok(result.manifest.Poppins.styles['600']);
  assert.strictEqual(result.manifest.Poppins.styles['400'].url, 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2');
  assert.strictEqual(result.manifest.Poppins.styles['400'].path, '/app/fonts/poppins-400.ttf');
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
      styles: { '400': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2', path: '/app/fonts/poppins-400.ttf' } }
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

test('constructor throws on invalid roles type', function () {

  assert.throws(function () {

    require('helper-font')({
      Utils: require('helper-utils')()
    }, {
      roles: 'not-an-object'
    });

  }, /roles must be a plain object/);

});


// ~~~~~~~~~~~~~~~~~~~~ Multi-source manifest ~~~~~~~~~~~~~~~~~~~~

test('registerFamilies with path only (native-only)', function () {

  const result = Font.registerFamilies({
    Roboto: {
      styles: {
        '400': { path: '/app/fonts/roboto-400.ttf' }
      }
    }
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  const families = Font.getRegisteredFamilies();
  assert.ok(families.families.includes('Roboto'));

});

test('registerFamilies with asset only (Expo)', function () {

  const result = Font.registerFamilies({
    Inter: {
      styles: {
        '400': { asset: 42 }
      }
    }
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  const families = Font.getRegisteredFamilies();
  assert.ok(families.families.includes('Inter'));

});

test('registerFamilies with url + path (cross-platform)', function () {

  const result = Font.registerFamilies({
    Nunito: {
      styles: {
        '400': {
          url: 'https://fonts.gstatic.com/s/nunito/v25/XRXI3I6Li01BKofiOc5wtlZ2diU.woff2',
          path: '/app/fonts/nunito-400.ttf'
        }
      }
    }
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  const manifest = Font.getManifest();
  assert.strictEqual(manifest.manifest.Nunito.styles['400'].url, 'https://fonts.gstatic.com/s/nunito/v25/XRXI3I6Li01BKofiOc5wtlZ2diU.woff2');
  assert.strictEqual(manifest.manifest.Nunito.styles['400'].path, '/app/fonts/nunito-400.ttf');

});

test('registerFamilies rejects entry with no source', function () {

  assert.throws(function () {

    Font.registerFamilies({
      BadFont: {
        styles: {
          '400': { weight: '400', style: 'normal' }
        }
      }
    });

  }, /Style entry must have at least one of: url, path, asset/);

});


// ~~~~~~~~~~~~~~~~~~~~ registerRoles ~~~~~~~~~~~~~~~~~~~~

test('registerRoles sets role mappings', function () {

  Font.registerFamilies({
    Poppins_400Regular: {
      styles: { '400': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2', path: '/app/fonts/poppins-400.ttf' } }
    },
    Poppins_600SemiBold: {
      styles: { '600': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2', path: '/app/fonts/poppins-600.ttf' } }
    }
  });

  const result = Font.registerRoles({
    primary: 'Poppins_400Regular',
    secondary: 'Poppins_600SemiBold'
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

});

test('resolveFamily resolves role token', function () {

  // Roles were registered in the previous test
  const result = Font.resolveFamily('primary');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.family, 'Poppins_400Regular');
  assert.strictEqual(result.error, null);

});

test('resolveFamily resolves secondary role token', function () {

  const result = Font.resolveFamily('secondary');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.family, 'Poppins_600SemiBold');
  assert.strictEqual(result.error, null);

});

test('resolveFamily role takes precedence over direct lookup', function () {

  // Register a role named 'Poppins' that maps to a different family
  Font.registerRoles({ Poppins: 'Poppins_400Regular' });

  const result = Font.resolveFamily('Poppins');

  // Role mapping should win: 'Poppins' role -> 'Poppins_400Regular'
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.family, 'Poppins_400Regular');

});

test('resolveFamily falls back to direct lookup for unregistered roles', function () {

  // 'Lora' is a registered family name, not a role
  const result = Font.resolveFamily('Lora');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.family, 'Lora');

});

test('registerRoles rejects non-object', function () {

  const result = Font.registerRoles('not-an-object');

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.type, 'helper-font/invalid-roles');

});

test('registerRoles rejects array', function () {

  const result = Font.registerRoles(['primary', 'secondary']);

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.type, 'helper-font/invalid-roles');

});


// ~~~~~~~~~~~~~~~~~~~~ Config roles seeding ~~~~~~~~~~~~~~~~~~~~

test('constructor seeds roles from config', function () {

  const ConfigFont = require('helper-font')({
    Utils: require('helper-utils')()
  }, {
    roles: { primary: 'Inter', secondary: 'Inter' }
  });

  const result = ConfigFont.resolveFamily('primary');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.family, 'Inter');

});


// ~~~~~~~~~~~~~~~~~~~~ getManifest with path and asset ~~~~~~~~~~~~~~~~~~~~

test('getManifest returns path and asset fields', function () {

  Font.registerFamilies({
    TestFont: {
      styles: {
        '400': { url: 'https://example.com/test.woff2', path: '/app/fonts/test.ttf', asset: 99 }
      }
    }
  });

  const result = Font.getManifest();

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.manifest.TestFont.styles['400'].url, 'https://example.com/test.woff2');
  assert.strictEqual(result.manifest.TestFont.styles['400'].path, '/app/fonts/test.ttf');
  assert.strictEqual(result.manifest.TestFont.styles['400'].asset, 99);

});

test('getManifest returns null for absent source fields', function () {

  Font.registerFamilies({
    UrlOnly: {
      styles: {
        '400': { url: 'https://example.com/url-only.woff2' }
      }
    }
  });

  const result = Font.getManifest();

  assert.strictEqual(result.manifest.UrlOnly.styles['400'].url, 'https://example.com/url-only.woff2');
  assert.strictEqual(result.manifest.UrlOnly.styles['400'].path, null);
  assert.strictEqual(result.manifest.UrlOnly.styles['400'].asset, null);

});
