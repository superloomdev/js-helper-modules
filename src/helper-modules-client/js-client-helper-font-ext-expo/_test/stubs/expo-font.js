// Stub for expo-font in Node tests.
// Exposes loadAsync(fontDescriptor, source) matching the real API.
// ESM with named exports - consumed via `import * as ExpoFont from 'expo-font'`.
//
// Uses globalThis for state so that both the extension (symlinked via
// file:../) and the test file resolve to the same state even when Node
// creates separate module instances under --preserve-symlinks.

const _state = globalThis.__expoFontStub = globalThis.__expoFontStub || {
  loadedFonts: {},
  shouldFail: false,
  deferred: false,
  pending: []
};

export function loadAsync (fontDescriptor, source) {

  if (_state.shouldFail) {
    return Promise.reject(new Error('stub: font load failed for ' + fontDescriptor));
  }

  if (_state.deferred) {
    return new Promise(function (resolve, reject) {
      _state.pending.push({ fontDescriptor: fontDescriptor, source: source, resolve: resolve, reject: reject });
    });
  }

  _state.loadedFonts[fontDescriptor] = source;
  return Promise.resolve();

}

// Test helpers
export function _setShouldFail (flag) {
  _state.shouldFail = flag;
}

export function _setDeferred (deferred) {
  _state.deferred = deferred;
}

export function _resolveDeferred () {
  const pending = _state.pending.splice(0);
  for (let i = 0; i < pending.length; i++) {
    _state.loadedFonts[pending[i].fontDescriptor] = pending[i].source;
    pending[i].resolve();
  }
}

export function _getPendingCount () {
  return _state.pending.length;
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
  _state.deferred = false;
  _state.pending = [];
  const keys = Object.keys(_state.loadedFonts);
  for (let i = 0; i < keys.length; i++) {
    delete _state.loadedFonts[keys[i]];
  }
}
