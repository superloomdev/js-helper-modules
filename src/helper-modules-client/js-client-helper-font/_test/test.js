import { test } from 'node:test';
import assert from 'node:assert/strict';
import fontLoader from 'helper-font';
import utilsLoader from 'helper-utils';

import loader from './loader.js';
const { Font } = loader;


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

    fontLoader({
      Utils: utilsLoader()
    }, {
      DEFAULT_FAMILY: ''
    });

  }, /DEFAULT_FAMILY must be a non-empty string/);

});

test('constructor throws on invalid roles type', function () {

  assert.throws(function () {

    fontLoader({
      Utils: utilsLoader()
    }, {
      ROLES: 'not-an-object'
    });

  }, /roles must be a plain object/);

});


// ~~~~~~~~~~~~~~~~~~~~ isRegistered ~~~~~~~~~~~~~~~~~~~~

test('isRegistered returns true for System (seeded at construction)', function () {

  const result = Font.isRegistered('System');

  assert.strictEqual(result, true);

});

test('isRegistered returns true for a registered family', function () {

  Font.registerFamilies({
    IsRegTestFont: {
      styles: { '400': { url: 'https://example.com/isreg.woff2' } }
    }
  });

  const result = Font.isRegistered('IsRegTestFont');

  assert.strictEqual(result, true);

});

test('isRegistered returns false for an unregistered family', function () {

  const result = Font.isRegistered('NonExistentFont');

  assert.strictEqual(result, false);

});

test('isRegistered throws TypeError on empty string', function () {

  assert.throws(function () {
    Font.isRegistered('');
  }, TypeError);

});

test('isRegistered throws TypeError on non-string input', function () {

  assert.throws(function () {
    Font.isRegistered(123);
  }, TypeError);

});

test('isRegistered throws TypeError on null input', function () {

  assert.throws(function () {
    Font.isRegistered(null);
  }, TypeError);

});


// ~~~~~~~~~~~~~~~~~~~~ markLoaded / isFamilyLoaded ~~~~~~~~~~~~~~~~~~~~

test('isFamilyLoaded returns false for a registered but not loaded family', function () {

  Font.registerFamilies({
    NotLoadedFont: {
      styles: { '400': { url: 'https://example.com/font.woff2' } }
    }
  });

  assert.strictEqual(Font.isRegistered('NotLoadedFont'), true);
  assert.strictEqual(Font.isFamilyLoaded('NotLoadedFont'), false);

});

test('markLoaded marks a family as loaded', function () {

  Font.registerFamilies({
    LoadableFont: {
      styles: { '400': { url: 'https://example.com/font.woff2' } }
    }
  });

  assert.strictEqual(Font.isFamilyLoaded('LoadableFont'), false);

  const wasNew = Font.markLoaded('LoadableFont');
  assert.strictEqual(wasNew, true);
  assert.strictEqual(Font.isFamilyLoaded('LoadableFont'), true);

});

test('markLoaded returns false when marking an already-loaded family', function () {

  Font.markLoaded('LoadableFont');
  const wasNew = Font.markLoaded('LoadableFont');
  assert.strictEqual(wasNew, false);

});

test('isFamilyLoaded returns false for an unregistered family', function () {

  assert.strictEqual(Font.isFamilyLoaded('UnregisteredFont'), false);

});

test('should reject an unregistered family when markLoaded is called', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });
  assert.throws(function () {
    Isolated.markLoaded('NotRegistered');
  }, /family must be registered/);

});

test('markLoaded throws TypeError on empty string', function () {

  assert.throws(function () {
    Font.markLoaded('');
  }, TypeError);

});

test('isFamilyLoaded throws TypeError on non-string input', function () {

  assert.throws(function () {
    Font.isFamilyLoaded(123);
  }, TypeError);

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

  }, /\[helper-font\] registerStyle: styleEntry must have at least one source field/);

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


test('should keep families, roles, and loaded state isolated when two core instances are created', function () {

  const First = fontLoader({ Utils: utilsLoader() }, { ROLES: { primary: 'FirstFamily' } });
  const Second = fontLoader({ Utils: utilsLoader() }, { ROLES: { primary: 'SecondFamily' } });
  First.registerFamilies({ FirstFamily: { url: 'https://example.com/first.woff2' } });
  Second.registerFamilies({ SecondFamily: { url: 'https://example.com/second.woff2' } });
  First.markLoaded('FirstFamily');
  assert.strictEqual(First.resolveFamily('primary').family, 'FirstFamily');
  assert.strictEqual(Second.resolveFamily('primary').family, 'SecondFamily');
  assert.strictEqual(First.isRegistered('SecondFamily'), false);
  assert.strictEqual(Second.isRegistered('FirstFamily'), false);
  assert.strictEqual(First.isFamilyLoaded('FirstFamily'), true);
  assert.strictEqual(Second.isFamilyLoaded('FirstFamily'), false);

});

// ~~~~~~~~~~~~~~~~~~~~ Config roles seeding ~~~~~~~~~~~~~~~~~~~~

test('constructor seeds roles from config', function () {

  const ConfigFont = fontLoader({
    Utils: utilsLoader()
  }, {
    ROLES: { primary: 'Inter', secondary: 'Inter' }
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


// ~~~~~~~~~~~~~~~~~~~~ F1: prototype-unsafe registry maps ~~~~~~~~~~~~~~~~~~~~

test('F1 resolveFamily does not return the inherited toString function for the toString token', function () {

  const result = Font.resolveFamily('toString');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.family, 'System');
  assert.strictEqual(result.error, null);

});

test('F1 resolveFamily does not return the inherited Object constructor for the constructor token', function () {

  const result = Font.resolveFamily('constructor');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.family, 'System');
  assert.strictEqual(result.error, null);

});

test('F1 registerFamilies registers a family literally named __proto__ without silent data loss', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });
  // Use Object.create(null) so __proto__ is an own property, not the prototype setter.
  // A normal {} literal would set the prototype, hiding the key from Object.keys.
  const manifest = Object.create(null);
  manifest['__proto__'] = { url: 'https://example.com/proto.woff2' };
  const result = Isolated.registerFamilies(manifest);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

  // The family must appear in the registry, not be swallowed by Object.prototype
  const families = Isolated.getRegisteredFamilies();
  assert.ok(families.families.includes('__proto__'));

  // The manifest must also include it
  const manifestResult = Isolated.getManifest();
  assert.ok(manifestResult.manifest['__proto__']);

});

test('F1 registerFamilies does not throw when registering a family named constructor', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });
  const result = Isolated.registerFamilies({ constructor: { url: 'https://example.com/ctor.woff2' } });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);
  assert.strictEqual(Isolated.isRegistered('constructor'), true);

});

test('F1 registering __proto__ does not pollute Object.prototype', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });
  const manifest = Object.create(null);
  manifest['__proto__'] = { url: 'https://example.com/proto.woff2' };
  Isolated.registerFamilies(manifest);

  // Object.prototype must not gain any new own property from the registration.
  // Note: __proto__ is a built-in accessor on Object.prototype, so checking for
  // it would always be true. Instead, verify no new property was added.
  assert.strictEqual(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted'), false);
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(Object.getPrototypeOf({}), Object.prototype);

});

test('F1 getManifest output survives JSON.stringify after registering a __proto__ family', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });
  const manifest = Object.create(null);
  manifest['__proto__'] = { url: 'https://example.com/proto.woff2' };
  Isolated.registerFamilies(manifest);

  const manifestResult = Isolated.getManifest();

  // Must not throw and must include the family
  const serialized = JSON.stringify(manifestResult.manifest);
  assert.ok(serialized.indexOf('__proto__') !== -1);

});


// ~~~~~~~~~~~~~~~~~~~~ F2: registerFamilies atomicity ~~~~~~~~~~~~~~~~~~~~

test('F2 registerFamilies is atomic: a later invalid family does not leave earlier registrations committed', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });

  // Good is valid, Bad has a style entry with no source field
  assert.throws(function () {

    Isolated.registerFamilies({
      Good: { url: 'https://example.com/good.woff2' },
      Bad: { styles: { '400': { weight: '400' } } }
    });

  }, /styleEntry must have at least one source field/);

  // Good must NOT be registered: the failed call left nothing behind
  assert.strictEqual(Isolated.isRegistered('Good'), false);
  assert.strictEqual(Isolated.isRegistered('Bad'), false);

});


// ~~~~~~~~~~~~~~~~~~~~ F3: @font-face CSS escaping and weight validation ~~~~~~~~~~~~~~~~~~~~

test('F3 buildFontFaceString escapes single quotes in family name and URL', function () {

  const result = Font.buildFontFaceString(
    'O\x27Brien',
    'https://example.com/a\x27b.woff2',
    '400',
    'normal'
  );

  assert.strictEqual(result.success, true);

  // The family name must be escaped, not interpolated raw
  assert.ok(result.css.indexOf('O\\\'Brien') !== -1);
  // The URL must be escaped, not interpolated raw
  assert.ok(result.css.indexOf('a\\\'b.woff2') !== -1);
  // The rule must not contain an unescaped broken quote sequence
  assert.ok(result.css.indexOf("'O'Brien'") === -1);

});

test('F3 buildFontFaceString rejects an injection weight string with INVALID_WEIGHT', function () {

  const result = Font.buildFontFaceString(
    'X',
    'https://example.com/x.woff2',
    '400; } body { display:none } @font-face { font-weight:900',
    'normal'
  );

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.css, null);
  assert.strictEqual(result.error.type, 'helper-font/invalid-weight');

});

test('F3 validateWeight accepts 400, 600, normal, and bold', function () {

  for (const w of ['400', '600', 'normal', 'bold']) {

    const result = Font.buildFontFaceString('X', 'https://example.com/x.woff2', w, 'normal');
    assert.strictEqual(result.success, true, 'weight ' + w + ' should be accepted');
    assert.strictEqual(result.error, null);

  }

});

test('F3 validateWeight rejects a numeric 400', function () {

  const result = Font.buildFontFaceString('X', 'https://example.com/x.woff2', 400, 'normal');

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.css, null);
  assert.strictEqual(result.error.type, 'helper-font/invalid-weight');

});


// ~~~~~~~~~~~~~~~~~~~~ F4: platform-name channel ~~~~~~~~~~~~~~~~~~~~

test('F4 registerPlatformName and getPlatformName exist on the public interface', function () {

  assert.strictEqual(typeof Font.registerPlatformName, 'function');
  assert.strictEqual(typeof Font.getPlatformName, 'function');

});

test('F4 recording a platform name changes resolveFamily output for that family', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });
  Isolated.registerFamilies({ IBMPlexSans: { styles: { '400': { url: 'https://example.com/plex.woff2' } } } });

  // Before recording, resolveFamily returns the family name unchanged
  assert.strictEqual(Isolated.resolveFamily('IBMPlexSans').family, 'IBMPlexSans');

  // Record the platform-resolved name
  const recordResult = Isolated.registerPlatformName('IBMPlexSans', 'IBM Plex Sans');
  assert.strictEqual(recordResult.success, true);
  assert.strictEqual(recordResult.error, null);

  // After recording, resolveFamily returns the platform name
  assert.strictEqual(Isolated.resolveFamily('IBMPlexSans').family, 'IBM Plex Sans');

});

test('F4 recording a platform name changes resolveFamily output for a role pointing at that family', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });
  Isolated.registerFamilies({ IBMPlexSans: { styles: { '400': { url: 'https://example.com/plex.woff2' } } } });
  Isolated.registerRoles({ primary: 'IBMPlexSans' });

  assert.strictEqual(Isolated.resolveFamily('primary').family, 'IBMPlexSans');

  Isolated.registerPlatformName('IBMPlexSans', 'IBM Plex Sans');

  assert.strictEqual(Isolated.resolveFamily('primary').family, 'IBM Plex Sans');

});

test('F4 an unrecorded family resolves unchanged', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });
  Isolated.registerFamilies({ NoPlatform: { styles: { '400': { url: 'https://example.com/n.woff2' } } } });

  assert.strictEqual(Isolated.resolveFamily('NoPlatform').family, 'NoPlatform');

});

test('F4 registerPlatformName throws for an unregistered family', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });

  assert.throws(function () {
    Isolated.registerPlatformName('NotRegistered', 'Whatever');
  }, /family must be registered/);

});

test('F4 getPlatformName returns null when no platform name was recorded', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });
  Isolated.registerFamilies({ NoPlatform: { styles: { '400': { url: 'https://example.com/n.woff2' } } } });

  const result = Isolated.getPlatformName('NoPlatform');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.platform_name, null);
  assert.strictEqual(result.error, null);

});

test('F4 two core instances keep platform names isolated', function () {

  const First = fontLoader({ Utils: utilsLoader() });
  const Second = fontLoader({ Utils: utilsLoader() });
  First.registerFamilies({ Shared: { styles: { '400': { url: 'https://example.com/s.woff2' } } } });
  Second.registerFamilies({ Shared: { styles: { '400': { url: 'https://example.com/s.woff2' } } } });

  First.registerPlatformName('Shared', 'FirstPlatform');

  assert.strictEqual(First.resolveFamily('Shared').family, 'FirstPlatform');
  // Second instance must not see First's platform name
  assert.strictEqual(Second.resolveFamily('Shared').family, 'Shared');

});


// ~~~~~~~~~~~~~~~~~~~~ D1: getManifest plain-prototype contract ~~~~~~~~~~~~~~~~~~~~

test('D1 getManifest output has Object.prototype as its prototype', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });
  Isolated.registerFamilies({ Probe: { styles: { '400': { url: 'https://example.com/p.woff2' } } } });

  const result = Isolated.getManifest();

  assert.strictEqual(Object.getPrototypeOf(result.manifest), Object.prototype);

});

test('D1 getManifest nested styles objects have Object.prototype as their prototype', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });
  Isolated.registerFamilies({ Probe: { styles: { '400': { url: 'https://example.com/p.woff2' } } } });

  const result = Isolated.getManifest();

  assert.strictEqual(Object.getPrototypeOf(result.manifest.Probe.styles), Object.prototype);

});

test('D1 getManifest output supports hasOwnProperty without throwing', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });
  Isolated.registerFamilies({ Probe: { styles: { '400': { url: 'https://example.com/p.woff2' } } } });

  const result = Isolated.getManifest();

  assert.strictEqual(result.manifest.hasOwnProperty('Probe'), true);

});

test('D1 a family literally named __proto__ appears in Object.keys of getManifest output', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });
  const input = Object.create(null);
  input['__proto__'] = { url: 'https://example.com/proto.woff2' };
  Isolated.registerFamilies(input);

  const result = Isolated.getManifest();

  assert.ok(Object.keys(result.manifest).includes('__proto__'));

});

test('D1 registering __proto__ does not pollute Object.prototype after getManifest', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });
  const input = Object.create(null);
  input['__proto__'] = { url: 'https://example.com/proto.woff2' };
  Isolated.registerFamilies(input);
  Isolated.getManifest();

  assert.strictEqual(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted'), false);
  assert.strictEqual({}.polluted, undefined);
  assert.strictEqual(Object.getPrototypeOf({}), Object.prototype);

});

test('D1 getManifest output survives JSON.stringify after registering a __proto__ family with plain prototype', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });
  const input = Object.create(null);
  input['__proto__'] = { url: 'https://example.com/proto.woff2' };
  Isolated.registerFamilies(input);

  const result = Isolated.getManifest();

  const serialized = JSON.stringify(result.manifest);
  assert.ok(serialized.indexOf('__proto__') !== -1);

});

test('D1 mutating the returned manifest does not change a second getManifest call', function () {

  const Isolated = fontLoader({ Utils: utilsLoader() });
  Isolated.registerFamilies({ Probe: { styles: { '400': { url: 'https://example.com/p.woff2' } } } });

  const first = Isolated.getManifest();
  first.manifest.Probe.styles['400'].url = 'tampered';
  first.manifest.Tampered = { styles: {} };

  const second = Isolated.getManifest();

  assert.strictEqual(second.manifest.Probe.styles['400'].url, 'https://example.com/p.woff2');
  assert.strictEqual(second.manifest.Tampered, undefined);

});


// ~~~~~~~~~~~~~~~~~~~~ D2: validateWeight CSS grammar ~~~~~~~~~~~~~~~~~~~~

test('D2 validateWeight accepts 350, 450, 1000, and 1', function () {

  for (const w of ['350', '450', '1000', '1']) {

    const result = Font.buildFontFaceString('X', 'https://example.com/x.woff2', w, 'normal');
    assert.strictEqual(result.success, true, 'weight ' + w + ' should be accepted');
    assert.strictEqual(result.error, null);

  }

});

test('D2 validateWeight accepts the two-value range 100 900', function () {

  const result = Font.buildFontFaceString('X', 'https://example.com/x.woff2', '100 900', 'normal');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.error, null);

});

test('D2 validateWeight accepts lighter and bolder', function () {

  for (const w of ['lighter', 'bolder']) {

    const result = Font.buildFontFaceString('X', 'https://example.com/x.woff2', w, 'normal');
    assert.strictEqual(result.success, true, 'weight ' + w + ' should be accepted');
    assert.strictEqual(result.error, null);

  }

});

test('D2 validateWeight rejects 0, 1001, 007, and semibold', function () {

  for (const w of ['0', '1001', '007', 'semibold']) {

    const result = Font.buildFontFaceString('X', 'https://example.com/x.woff2', w, 'normal');
    assert.strictEqual(result.success, false, 'weight ' + w + ' should be rejected');
    assert.strictEqual(result.error.type, 'helper-font/invalid-weight');

  }

});

test('D2 validateWeight rejects malformed spacing in weight values', function () {

  for (const w of ['400 ', ' 400', '100  900', '100 900 400']) {

    const result = Font.buildFontFaceString('X', 'https://example.com/x.woff2', w, 'normal');
    assert.strictEqual(result.success, false, 'weight ' + JSON.stringify(w) + ' should be rejected');
    assert.strictEqual(result.error.type, 'helper-font/invalid-weight');

  }

});

test('D2 validateWeight rejects an empty string', function () {

  const result = Font.buildFontFaceString('X', 'https://example.com/x.woff2', '', 'normal');

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.error.type, 'helper-font/invalid-weight');

});

test('D2 buildFontFaceString emits font-weight 100 900 unchanged for a range input', function () {

  const result = Font.buildFontFaceString('X', 'https://example.com/x.woff2', '100 900', 'normal');

  assert.strictEqual(result.success, true);
  assert.ok(result.css.indexOf('font-weight: 100 900;') !== -1);

});
