'use strict';

// Stub for expo-font in Node tests.
// Exposes loadAsync(fontDescriptor, source) matching the real API.

var loadedFonts = {};
var shouldFail = false;

function setShouldFail (flag) {
  shouldFail = flag;
}

function getLoadedFonts () {
  var copy = {};
  var keys = Object.keys(loadedFonts);
  for (var i = 0; i < keys.length; i++) {
    copy[keys[i]] = loadedFonts[keys[i]];
  }
  return copy;
}

function clearLoadedFonts () {
  var keys = Object.keys(loadedFonts);
  for (var i = 0; i < keys.length; i++) {
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
