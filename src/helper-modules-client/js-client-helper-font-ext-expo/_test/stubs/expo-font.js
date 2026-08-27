// Stub for expo-font in Node tests.
// Exposes loadAsync(fontDescriptor, source) matching the real API.
// ESM with named exports — consumed via `import * as ExpoFont from 'expo-font'`.

const loadedFonts = {};
let shouldFail = false;

export function loadAsync (fontDescriptor, source) {

  if (shouldFail) {
    return Promise.reject(new Error('stub: font load failed for ' + fontDescriptor));
  }

  loadedFonts[fontDescriptor] = source;
  return Promise.resolve();

}

// Test helpers
export function _setShouldFail (flag) {
  shouldFail = flag;
}

export function _getLoadedFonts () {
  const copy = {};
  const keys = Object.keys(loadedFonts);
  for (let i = 0; i < keys.length; i++) {
    copy[keys[i]] = loadedFonts[keys[i]];
  }
  return copy;
}

export function _clearLoadedFonts () {
  const keys = Object.keys(loadedFonts);
  for (let i = 0; i < keys.length; i++) {
    delete loadedFonts[keys[i]];
  }
}
