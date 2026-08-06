'use strict';

const Utils = require('helper-utils')();
const Debug = require('helper-debug')({ Utils: Utils });
const Font = require('helper-font')({ Utils: Utils, Debug: Debug });

// Register example families with asset, url, and path
Font.registerFamilies({
  Poppins: {
    styles: {
      '400': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2', path: '/app/fonts/poppins-400.ttf', asset: 1001 },
      '600': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2', path: '/app/fonts/poppins-600.ttf', asset: 1002 }
    }
  },
  Lora: {
    url: 'https://example.com/lora-regular.ttf',
    path: '/app/fonts/lora-regular.ttf',
    weight: '400'
  }
});

// The expo-font stub is aliased via _test/package.json and the parent
// package.json devDependencies. The extension requires it directly at module
// scope — no injection needed.

// Build the adapter — no expo-font injection needed
const ExpoFontAdapter = require('helper-font-ext-expo')({
  Utils: Utils,
  Debug: Debug,
  Font: Font
});


module.exports = {
  ExpoFontAdapter: ExpoFontAdapter,
  Font: Font,
  Utils: Utils,
  Debug: Debug
};
