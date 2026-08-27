// Stub for @vitrion/react-native-load-fonts in Node tests.
// Exposes loadFontFromFile(name, filePath) matching the real API.
// ESM with named exports — consumed via `import * as NativeFonts from '@vitrion/react-native-load-fonts'`.

const loadedFonts = {};

export function loadFontFromFile (name, filePath) {

  if (loadedFonts._shouldFail) {
    return Promise.reject(new Error('stub: font load failed for ' + name));
  }

  loadedFonts[name] = filePath;
  return Promise.resolve(name);

}

// Test helpers
export function _setShouldFail (shouldFail) {
  loadedFonts._shouldFail = shouldFail;
}

export function _getLoadedFonts () {
  const copy = {};
  const keys = Object.keys(loadedFonts);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] !== '_shouldFail') {
      copy[keys[i]] = loadedFonts[keys[i]];
    }
  }
  return copy;
}

export function _clearLoadedFonts () {
  const keys = Object.keys(loadedFonts);
  for (let i = 0; i < keys.length; i++) {
    delete loadedFonts[keys[i]];
  }
}
