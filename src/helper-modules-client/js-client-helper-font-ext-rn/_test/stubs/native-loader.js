// Stub for @vitrion/react-native-load-fonts in Node tests.
// Exposes loadFontFromFile(name, filePath) matching the real API.
// ESM with named exports — consumed via `import * as NativeFonts from '@vitrion/react-native-load-fonts'`.
//
// Uses globalThis for state so that both the extension (symlinked via
// file:../) and the test file resolve to the same state even when Node
// creates separate module instances under --preserve-symlinks.

const _state = globalThis.__nativeFontStub = globalThis.__nativeFontStub || {
  loadedFonts: {},
  shouldFail: false
};

export function loadFontFromFile (name, filePath) {

  if (_state.shouldFail) {
    return Promise.reject(new Error('stub: font load failed for ' + name));
  }

  _state.loadedFonts[name] = filePath;
  return Promise.resolve(name);

}

// Test helpers
export function _setShouldFail (shouldFail) {
  _state.shouldFail = shouldFail;
}

export function _getLoadedFonts () {
  const copy = {};
  const keys = Object.keys(_state.loadedFonts);
  for (let i = 0; i < keys.length; i++) {
    copy[keys[i]] = _state.loadedFonts[keys[i]];
  }
  return copy;
}

export function _clearLoadedFonts () {
  const keys = Object.keys(_state.loadedFonts);
  for (let i = 0; i < keys.length; i++) {
    delete _state.loadedFonts[keys[i]];
  }
}
