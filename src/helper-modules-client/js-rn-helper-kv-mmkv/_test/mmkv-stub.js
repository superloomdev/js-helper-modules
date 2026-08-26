


// In-memory MMKV stub for testing.
// Implements the MMKV interface: getString, set, delete, contains,
// getAllKeys, clearAll. Constructor receives { id, encryptionKey }.
// Supports a configurable throw mode to simulate engine errors.

function createMmkvStub (options) {

  options = options || {};

  const data = {};
  let throwOnWrite = false;
  let throwOnRead = false;

  function MmkvStub (constructorOptions) {
    this._id = constructorOptions.id;
    this._encryptionKey = constructorOptions.encryptionKey;
  }

  MmkvStub.prototype.getString = function (k) {
    if (throwOnRead) {
      throw new Error('MMKV read error');
    }
    return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : undefined;
  };

  MmkvStub.prototype.set = function (k, v) {
    if (throwOnWrite) {
      throw new Error('MMKV write error');
    }
    data[k] = String(v);
  };

  MmkvStub.prototype.delete = function (k) {
    if (throwOnWrite) {
      throw new Error('MMKV delete error');
    }
    delete data[k];
  };

  MmkvStub.prototype.contains = function (k) {
    if (throwOnRead) {
      throw new Error('MMKV read error');
    }
    return Object.prototype.hasOwnProperty.call(data, k);
  };

  MmkvStub.prototype.getAllKeys = function () {
    if (throwOnRead) {
      throw new Error('MMKV read error');
    }
    return Object.keys(data);
  };

  MmkvStub.prototype.clearAll = function () {
    if (throwOnWrite) {
      throw new Error('MMKV delete error');
    }
    Object.keys(data).forEach(function (k) { delete data[k]; });
  };

  // Test helpers (not part of the MMKV interface)
  MmkvStub._setThrowOnWrite = function (v) { throwOnWrite = v; };
  MmkvStub._setThrowOnRead = function (v) { throwOnRead = v; };
  MmkvStub._rawSet = function (k, v) { data[k] = String(v); };
  MmkvStub._rawGet = function (k) { return data[k]; };
  MmkvStub._rawData = function () { return data; };
  MmkvStub._reset = function () {
    Object.keys(data).forEach(function (k) { delete data[k]; });
    throwOnWrite = false;
    throwOnRead = false;
  };

  return MmkvStub;

}

export default createMmkvStub;
