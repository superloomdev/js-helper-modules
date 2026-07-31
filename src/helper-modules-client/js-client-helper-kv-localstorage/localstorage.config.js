// Info: Default configuration for helper-kv-localstorage.
//
// All keys can be overridden by passing a config object to the loader.

module.exports = {

  // Key prefix. Stored key is [NAMESPACE]:[key] when non-empty, bare [key] when empty
  NAMESPACE: '',

  // 'local' for localStorage, 'session' for sessionStorage
  STORE: 'local'

};
