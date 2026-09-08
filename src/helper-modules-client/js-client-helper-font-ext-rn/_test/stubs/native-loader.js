// Stub for @vitrion/react-native-load-fonts in Node tests.
// Exposes loadFontFromFile(name, filePath) matching the real API.
// ESM with named exports - consumed via `import * as NativeFonts from '@vitrion/react-native-load-fonts'`.
//
// Uses globalThis for state so that both the extension (symlinked via
// file:../) and the test file resolve to the same state even when Node
// creates separate module instances under --preserve-symlinks.

const _state = globalThis.__nativeFontStub = globalThis.__nativeFontStub || {
  loadedFonts: {},
  shouldFail: false,
  deferred: false,
  pending: [],
  resolvedName: null
};

export function loadFontFromFile (name, filePath) {

  if (_state.shouldFail) {
    return Promise.reject(new Error('stub: font load failed for ' + name));
  }

  if (_state.deferred) {
    return new Promise(function (resolve, reject) {
      _state.pending.push({ name: name, filePath: filePath, resolve: resolve, reject: reject });
    });
  }

  _state.loadedFonts[name] = filePath;
  // Return the resolved name if set, otherwise return the name itself
  return Promise.resolve(_state.resolvedName || name);

}

// Test helpers
export function _setShouldFail (shouldFail) {
  _state.shouldFail = shouldFail;
}

export function _setDeferred (deferred) {
  _state.deferred = deferred;
}

export function _resolveDeferred () {
  const pending = _state.pending.splice(0);
  for (let i = 0; i < pending.length; i++) {
    _state.loadedFonts[pending[i].name] = pending[i].filePath;
    pending[i].resolve(_state.resolvedName || pending[i].name);
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
  _state.resolvedName = null;
  const keys = Object.keys(_state.loadedFonts);
  for (let i = 0; i < keys.length; i++) {
    delete _state.loadedFonts[keys[i]];
  }
}

// FN1: resolved name stub helpers
export function _setResolvedName (name) {
  _state.resolvedName = name;
}

export function _clearResolvedName () {
  _state.resolvedName = null;
}
