// Stub for expo-font in Node tests.
// Exposes loadAsync(fontDescriptor, source) matching the real API.
// ESM with named exports — consumed via `import * as ExpoFont from 'expo-font'`.
//
// Uses globalThis for state so that both the extension (symlinked via
// file:../) and the test file resolve to the same state even when Node
// creates separate module instances under --preserve-symlinks.

const _state = globalThis.__expoFontStub = globalThis.__expoFontStub || {
  loadedFonts: {},
  shouldFail: false
};

export function loadAsync (fontDescriptor, source) {

  if (_state.shouldFail) {
    return Promise.reject(new Error('stub: font load failed for ' + fontDescriptor));
  }

  _state.loadedFonts[fontDescriptor] = source;
  return Promise.resolve();

}

// Test helpers
export function _setShouldFail (flag) {
  _state.shouldFail = flag;
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
