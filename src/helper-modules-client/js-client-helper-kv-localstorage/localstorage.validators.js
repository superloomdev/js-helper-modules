// Info: Validators for helper-kv-localstorage.
//
// Receives Lib and ERRORS by injection from the loader.
// Never self-requires the error catalog or data files.

module.exports = function (Lib, ERRORS) { // eslint-disable-line no-unused-vars -- ERRORS kept for cross-module consistency

  return {

    /********************************************************************
    Validate the merged config object. Throws TypeError on programmer
    error.

@param {Object} CONFIG - Merged configuration
    *********************************************************************/
    validateConfig: function (CONFIG) {

      // NAMESPACE must be a string if provided
      if (!Lib.Utils.isNullOrUndefined(CONFIG.NAMESPACE)) {
        if (!Lib.Utils.isString(CONFIG.NAMESPACE)) {
          throw new TypeError('helper-kv-localstorage: NAMESPACE must be a string');
        }
      }

      // STORE must be 'local' or 'session'
      if (CONFIG.STORE !== 'local' && CONFIG.STORE !== 'session') {
        throw new TypeError('helper-kv-localstorage: STORE must be "local" or "session"');
      }

    }

  };

};
