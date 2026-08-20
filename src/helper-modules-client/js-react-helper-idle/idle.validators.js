// Info: Validators for helper-idle.
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

      // idle_ms must be a positive number
      if (!Lib.Utils.isNullOrUndefined(CONFIG.IDLE_MS)) {
        if (!Lib.Utils.isNumber(CONFIG.IDLE_MS) || CONFIG.IDLE_MS <= 0) {
          throw new TypeError('helper-idle: idle_ms must be a positive number');
        }
      }

    },


    /********************************************************************
    Validate options passed to useIdle. Throws TypeError on programmer
    error.

    @param {Object} options - Hook options
    *********************************************************************/
    validateUseIdle: function (options) {

      // sources must be an array if provided
      if (!Lib.Utils.isNullOrUndefined(options.sources)) {
        if (!Array.isArray(options.sources)) {
          throw new TypeError('helper-idle: options.sources must be an array');
        }
      }

      // thresholds must be an array if provided
      if (!Lib.Utils.isNullOrUndefined(options.thresholds)) {
        if (!Array.isArray(options.thresholds)) {
          throw new TypeError('helper-idle: options.thresholds must be an array');
        }

        // Each threshold must be { ms: positive number, callback: function }
        for (let i = 0; i < options.thresholds.length; i++) {
          const t = options.thresholds[i];
          if (!t || !Lib.Utils.isNumber(t.ms) || t.ms <= 0) {
            throw new TypeError('helper-idle: options.thresholds[' + i + '].ms must be a positive number');
          }
          if (!Lib.Utils.isFunction(t.callback)) {
            throw new TypeError('helper-idle: options.thresholds[' + i + '].callback must be a function');
          }
        }
      }

    }

  };

};
