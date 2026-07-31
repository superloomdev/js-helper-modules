'use strict';


// In-memory Web Storage stub for testing.
// Implements the Storage interface: getItem, setItem, removeItem, key, length, clear.
// Supports a configurable throw mode to simulate quota exceeded and read errors.

function createWebStorageStub (options) {

  options = options || {};

  const data = {};
  let throwOnWrite = false;
  let throwOnRead = false;

  return {

    get length () {
      if (throwOnRead) {
        throw new Error('SecurityError: read blocked');
      }
      return Object.keys(data).length;
    },

    key: function (index) {
      if (throwOnRead) {
        throw new Error('SecurityError: read blocked');
      }
      const keys = Object.keys(data);
      return keys[index] || null;
    },

    getItem: function (k) {
      if (throwOnRead) {
        throw new Error('SecurityError: read blocked');
      }
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
    },

    setItem: function (k, v) {
      if (throwOnWrite) {
        throw new Error('QuotaExceededError: storage full');
      }
      data[k] = String(v);
    },

    removeItem: function (k) {
      delete data[k];
    },

    clear: function () {
      Object.keys(data).forEach(function (k) { delete data[k]; });
    },

    // Test helpers (not part of the Storage interface)
    _setThrowOnWrite: function (v) { throwOnWrite = v; },
    _setThrowOnRead: function (v) { throwOnRead = v; },
    _rawSet: function (k, v) { data[k] = String(v); },
    _rawGet: function (k) { return data[k]; },
    _rawData: function () { return data; }

  };

}

module.exports = createWebStorageStub;
