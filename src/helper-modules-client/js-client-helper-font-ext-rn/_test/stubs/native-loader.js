'use strict';

// Stub for @vitrion/react-native-load-fonts in Node tests.
// Exposes loadFontFromFile(name, filePath) matching the real API.

var loadedFonts = {};

function setShouldFail (shouldFail) {
  loadedFonts._shouldFail = shouldFail;
}

function getLoadedFonts () {
  var copy = {};
  var keys = Object.keys(loadedFonts);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i] !== '_shouldFail') {
      copy[keys[i]] = loadedFonts[keys[i]];
    }
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
  loadFontFromFile: function (name, filePath) {

    if (loadedFonts._shouldFail) {
      return Promise.reject(new Error('stub: font load failed for ' + name));
    }

    loadedFonts[name] = filePath;
    return Promise.resolve(name);

  },

  // Test helpers
  _setShouldFail: setShouldFail,
  _getLoadedFonts: getLoadedFonts,
  _clearLoadedFonts: clearLoadedFonts
};
