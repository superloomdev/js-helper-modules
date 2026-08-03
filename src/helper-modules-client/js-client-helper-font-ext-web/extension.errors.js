// Info: Error catalog for helper-font-ext-web.
//
// Frozen on export. Injected into the public interface.
'use strict';

module.exports = Object.freeze({

  DOCUMENT_UNAVAILABLE: {
    type: 'helper-font-ext-web/document-unavailable',
    message: 'document is not available. This adapter requires a browser DOM environment'
  },

  INVALID_MANIFEST: {
    type: 'helper-font-ext-web/invalid-manifest',
    message: 'Manifest must be a plain object with family entries'
  },

  FONT_CORE_UNAVAILABLE: {
    type: 'helper-font-ext-web/font-core-unavailable',
    message: 'Font core module is not injected. Provide shared_libs.Font (the js-client-helper-font instance)'
  }

});
