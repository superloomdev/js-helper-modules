// Info: In-process Map-backed store fixture for helper-cache unit tests.
// Implements the 5-method store contract so cache.js can be tested
// without any Docker container or database driver. All data is stored
// in a plain Map keyed by "namespace\u001Fcache_code".
//
// This is intentionally a minimal, correct implementation - it is not
// a performance store and should never be used in production.
//
// Store contract (identical shape across all real stores):
//   get(instance, namespace, cache_code)                  -> { success, value, error }
//   set(instance, namespace, cache_code, value, ttl_seconds) -> { success, error }
//   delete(instance, namespace, cache_code)               -> { success, error }
//   clear(instance, namespace, cache_code_prefix?)        -> { success, deleted_count, error }
//   list(instance, namespace, cache_code_prefix?)         -> { success, cache_codes, error }
//
// Expiry is driven off instance.time (not wall clock) so the TTL test is
// deterministic: advance instance.time instead of sleeping.
'use strict';


/********************************************************************
Build a composite map key from namespace + cache_code using the
non-printable ASCII Unit Separator. This mirrors what the real
MongoDB adapter will do and makes prefix logic in the fixture
match production semantics.

@param {String} namespace
@param {String} cache_code

@return {String}
*********************************************************************/
function compositeKey (namespace, cache_code) {
  return namespace + '\u001F' + cache_code;
}


/********************************************************************
Create a new in-process memory store. Returns an object matching the
5-method store contract consumed by cache.js. Each call to this
function produces an independent Map, so tests can run in isolation.

@return {Object} - Store interface (plus _records for white-box assertions)
*********************************************************************/
module.exports = function createMemoryStore () {

  const _map = new Map();

  const Store = {

    /******************************************************************
    Read one entry by composite key. Returns null when absent or
    expired. Expiry is checked against instance.time so the TTL
    test is deterministic.
    ******************************************************************/
    get: async function (instance, namespace, cache_code) {

      const stored = _map.get(compositeKey(namespace, cache_code));

      if (!stored) {
        return {
          success: true,
          value: null,
          error: null
        };
      }

      // Treat expired entries as misses and delete them
      if (stored.expires_at !== null && stored.expires_at < instance['time']) {
        _map.delete(compositeKey(namespace, cache_code));
        return {
          success: true,
          value: null,
          error: null
        };
      }

      return {
        success: true,
        value: stored.value,
        error: null
      };

    },


    /******************************************************************
    Upsert - overwrites any existing entry at the composite key.
    ttl_seconds is optional; when absent the entry has no expiry.
    ******************************************************************/
    set: async function (instance, namespace, cache_code, value, ttl_seconds) { // eslint-disable-line no-unused-vars

      const entry = {
        value: value,
        expires_at: null
      };

      if (ttl_seconds) {
        entry.expires_at = instance['time'] + ttl_seconds;
      }

      _map.set(compositeKey(namespace, cache_code), entry);

      return {
        success: true,
        error: null
      };

    },


    /******************************************************************
    Idempotent delete (missing key reports success).
    ******************************************************************/
    delete: async function (instance, namespace, cache_code) { // eslint-disable-line no-unused-vars

      _map.delete(compositeKey(namespace, cache_code));

      return {
        success: true,
        error: null
      };

    },


    /******************************************************************
    Remove all entries in namespace whose cache_code starts with
    cache_code_prefix. When cache_code_prefix is omitted, removes
    every entry in the namespace. Returns the count of deleted
    entries.
    ******************************************************************/
    clear: async function (instance, namespace, cache_code_prefix) { // eslint-disable-line no-unused-vars

      const prefix = namespace + '\u001F' + (cache_code_prefix || '');
      let count = 0;

      for (const key of Array.from(_map.keys())) {
        if (key.startsWith(prefix)) {
          _map.delete(key);
          count = count + 1;
        }
      }

      return {
        success: true,
        deleted_count: count,
        error: null
      };

    },


    /******************************************************************
    List cache_codes in namespace whose cache_code starts with
    cache_code_prefix. When omitted, lists every cache_code in the
    namespace. Returns cache_codes without the namespace prefix.
    ******************************************************************/
    list: async function (instance, namespace, cache_code_prefix) { // eslint-disable-line no-unused-vars

      const prefix = namespace + '\u001F' + (cache_code_prefix || '');
      const cache_codes = [];

      for (const key of _map.keys()) {
        if (key.startsWith(prefix)) {
          // Strip the namespace + '\u001F' prefix
          cache_codes.push(key.substring(namespace.length + 1));
        }
      }

      return {
        success: true,
        cache_codes: cache_codes,
        error: null
      };

    },


    /******************************************************************
    Test helper - expose the raw Map for white-box assertions.
    Not part of the public contract; never used in production code.
    ******************************************************************/
    _records: _map

  };

  return Store;

};
