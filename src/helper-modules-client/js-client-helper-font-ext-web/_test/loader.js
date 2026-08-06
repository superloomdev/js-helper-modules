'use strict';

const Utils = require('helper-utils')();
const Debug = require('helper-debug')({ Utils: Utils });
const Font = require('helper-font')({ Utils: Utils, Debug: Debug });

// Register example families with url (web) and path (native)
Font.registerFamilies({
  Poppins: {
    styles: {
      '400': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecm0.woff2', path: '/app/fonts/poppins-400.ttf' },
      '600': { url: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2', path: '/app/fonts/poppins-600.ttf' }
    }
  },
  Lora: {
    url: 'https://example.com/lora-regular.ttf',
    path: '/app/fonts/lora-regular.ttf',
    weight: '400'
  }
});


// --- Minimal document stub ---

function createDocumentStub () {

  const head = {
    children: [],
    appendChild: function (node) {
      this.children.push(node);
      node.parentNode = this;
    },
    removeChild: function (node) {
      const index = this.children.indexOf(node);
      if (index !== -1) {
        this.children.splice(index, 1);
      }
      node.parentNode = null;
    },
    querySelector: function () { return this; }
  };

  const doc = {
    _head: head,
    createElement: function (tag) {
      return {
        tagName: tag,
        textContent: '',
        attributes: {},
        parentNode: null,
        setAttribute: function (key, value) {
          this.attributes[key] = value;
        }
      };
    },
    querySelector: function (selector) {
      if (selector === 'head') return head;
      return null;
    },
    head: head,
    documentElement: head
  };

  return doc;

}


// --- Build the adapter with a document stub ---

const docStub = createDocumentStub();

const WebFontAdapter = require('helper-font-ext-web')({
  Utils: Utils,
  Debug: Debug,
  Font: Font,
  Document: docStub
});


module.exports = {
  WebFontAdapter: WebFontAdapter,
  Font: Font,
  Utils: Utils,
  Debug: Debug,
  docStub: docStub,
  createDocumentStub: createDocumentStub
};
