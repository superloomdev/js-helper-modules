// Info: In-process Map-backed store fixture for distinct-queue unit tests.
// Implements the 4-method store contract so distinct-queue.js can be tested
// without any Docker container or database driver. All data is stored in a
// plain array keyed by tenant_id.
//
// This is intentionally a minimal, correct implementation - it is not
// a performance store and should never be used in production.
//
// Store contract (identical shape across all real stores):
//   writeRecord(instance, record)                                      -> { success, error }
//   queryByResourceId(instance, tenant_id, resource_id)                -> { success, records, error }
//   deleteByDataVersionLte(instance, tenant_id, resource_id, dv)       -> { success, error }
//   queryByResourceIdPrefix(instance, tenant_id, resource_id_prefix)   -> { success, records, error }
'use strict';


/********************************************************************
Create a new in-process memory store. Returns an object matching the
4-method store contract consumed by distinct-queue.js. Each call to
this factory produces an independent store, so tests can run in
isolation.

@return {Object} - Store interface (plus _records for white-box assertions)
*********************************************************************/
module.exports = function createMemoryStore () {

  // All records stored as flat array (simple, mirrors append-only semantics)
  const _records = [];

  const Store = {

    /******************************************************************
    Append a record to the store.
    ******************************************************************/
    writeRecord: async function (instance, record) { // eslint-disable-line no-unused-vars

      _records.push(Object.assign({}, record));

      return {
        success: true,
        error: null
      };

    },


    /******************************************************************
    Return all records matching (tenant_id, resource_id), sorted by
    sort_key ascending (chronological by data_version).
    ******************************************************************/
    queryByResourceId: async function (instance, tenant_id, resource_id) { // eslint-disable-line no-unused-vars

      const matches = _records
        .filter(function (r) {
          return r.tenant_id === tenant_id && r.resource_id === resource_id;
        })
        .sort(function (a, b) {
          if (a.sort_key < b.sort_key) { return -1; }
          if (a.sort_key > b.sort_key) { return 1; }
          return 0;
        });

      return {
        success: true,
        records: matches.map(function (r) { return Object.assign({}, r); }),
        error: null
      };

    },


    /******************************************************************
    Delete all records for (tenant_id, resource_id) where
    data_version <= boundary.
    ******************************************************************/
    deleteByDataVersionLte: async function (instance, tenant_id, resource_id, data_version_boundary) { // eslint-disable-line no-unused-vars

      // Walk backwards so splice indices stay valid
      for (let i = _records.length - 1; i >= 0; i--) {
        const r = _records[i];
        if (
          r.tenant_id === tenant_id &&
          r.resource_id === resource_id &&
          r.data_version <= data_version_boundary
        ) {
          _records.splice(i, 1);
        }
      }

      return {
        success: true,
        error: null
      };

    },


    /******************************************************************
    Return all records for tenant_id whose resource_id starts with the
    given prefix.
    ******************************************************************/
    queryByResourceIdPrefix: async function (instance, tenant_id, resource_id_prefix) { // eslint-disable-line no-unused-vars

      const matches = _records
        .filter(function (r) {
          return r.tenant_id === tenant_id && r.resource_id.startsWith(resource_id_prefix);
        })
        .sort(function (a, b) {
          if (a.sort_key < b.sort_key) { return -1; }
          if (a.sort_key > b.sort_key) { return 1; }
          return 0;
        });

      return {
        success: true,
        records: matches.map(function (r) { return Object.assign({}, r); }),
        error: null
      };

    },


    /******************************************************************
    Test helper - expose the raw array for white-box assertions.
    Not part of the public contract; never used in production code.
    ******************************************************************/
    _records: _records

  };

  return Store;

};
