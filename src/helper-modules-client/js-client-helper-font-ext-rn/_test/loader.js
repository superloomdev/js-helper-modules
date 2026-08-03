'use strict';

const Utils = require('helper-utils')();
const Debug = require('helper-debug')({ Utils: Utils });
const Font = require('helper-font')({ Utils: Utils, Debug: Debug });

// Register example families (settled trio: System, Poppins, Lora)
Font.registerFamilies({
  Poppins: {
    styles: {
      '400': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2' },
      '600': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2' }
    }
  },
  Lora: {
    url: 'https://example.com/lora-regular.ttf',
    weight: '400'
  }
});


// --- Minimal native font loader stub ---

// Tracks loaded fonts: { familyName: url }
const loadedFonts = {};

function createNativeLoaderStub (shouldFail) {

  return {
    loadFont: function (name, url) {

      if (shouldFail) {
        return Promise.reject(new Error('stub: font load failed for ' + name));
      }

      loadedFonts[name] = url;
      return Promise.resolve();

    }
  };

}


// --- Build the adapter with a stubbed native loader ---

const nativeLoaderStub = createNativeLoaderStub(false);

const RNFontAdapter = require('helper-font-ext-rn')({
  Utils: Utils,
  Debug: Debug,
  Font: Font,
  NativeFontLoader: nativeLoaderStub
});


module.exports = {
  RNFontAdapter: RNFontAdapter,
  Font: Font,
  Utils: Utils,
  Debug: Debug,
  nativeLoaderStub: nativeLoaderStub,
  loadedFonts: loadedFonts,
  createNativeLoaderStub: createNativeLoaderStub
};
