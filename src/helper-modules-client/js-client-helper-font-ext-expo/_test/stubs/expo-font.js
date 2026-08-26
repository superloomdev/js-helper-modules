// Stub for expo-font in Node tests.
// Exposes loadAsync(fontDescriptor, source) matching the real API.

const loadedFonts = {};
let shouldFail = false;

function setShouldFail (flag) {
  shouldFail = flag;
}

function getLoadedFonts () {
  const copy = {};
  const keys = Object.keys(loadedFonts);
  for (let i = 0; i < keys.length; i++) {
    copy[keys[i]] = loadedFonts[keys[i]];
  }
  return copy;
}

function clearLoadedFonts () {
  const keys = Object.keys(loadedFonts);
  for (let i = 0; i < keys.length; i++) {
    delete loadedFonts[keys[i]];
  }
}

module.exports = {
  loadAsync: function (fontDescriptor, source) {

    if (shouldFail) {
      return Promise.reject(new Error('stub: font load failed for ' + fontDescriptor));
    }

    loadedFonts[fontDescriptor] = source;
    return Promise.resolve();

  },

  // Test helpers
  _setShouldFail: setShouldFail,
  _getLoadedFonts: getLoadedFonts,
  _clearLoadedFonts: clearLoadedFonts
};
