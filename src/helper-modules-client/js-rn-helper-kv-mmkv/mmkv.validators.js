// Info: Validators for helper-kv-mmkv.
//
// Receives Lib and ERRORS by injection from the loader.
// Never self-requires the error catalog or data files.
'use strict';

module.exports = function (Lib, ERRORS) { // eslint-disable-line no-unused-vars

  const Validators = {

    /********************************************************************
Validate the merged config object. Throws TypeError on any
misconfiguration so the module fails at startup, not at call time.

@param {Object} CONFIG - Merged config for this instance
@return {void}
    *********************************************************************/
    validateConfig: function (CONFIG) {

      // NAMESPACE must be a string if provided
      if (!Lib.Utils.isNullOrUndefined(CONFIG.NAMESPACE)) {
        if (!Lib.Utils.isString(CONFIG.NAMESPACE)) {
          throw new TypeError('helper-kv-mmkv: NAMESPACE must be a string');
        }
      }

      // INSTANCE_ID must be a non-empty string
      if (!Lib.Utils.isString(CONFIG.INSTANCE_ID) || CONFIG.INSTANCE_ID.length === 0) {
        throw new TypeError('helper-kv-mmkv: INSTANCE_ID must be a non-empty string');
      }

      // ENCRYPTION_KEY must be a string if provided
      if (!Lib.Utils.isNullOrUndefined(CONFIG.ENCRYPTION_KEY)) {
        if (!Lib.Utils.isString(CONFIG.ENCRYPTION_KEY)) {
          throw new TypeError('helper-kv-mmkv: ENCRYPTION_KEY must be a string');
        }
      }

    }

  };

  return Validators;

};
