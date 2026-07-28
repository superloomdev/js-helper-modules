// Info: Validators for js-react-helper-timer
'use strict';


/********************************************************************
Validators factory. Receives Lib and ERRORS by injection from the
loader (single-require rule).

@param {Object} Lib    - Dependency container (Utils)
@param {Object} ERRORS - Frozen error catalog (kept in scope per the
                        universal companion files rule)

@return {Object} - Public Validators interface
*********************************************************************/
module.exports = function loader (Lib, ERRORS) { // eslint-disable-line no-unused-vars

  const Validators = {

    /********************************************************************
    Validate config. Throws TypeError on programmer error.

    @param {Object} CONFIG - Merged configuration
    *********************************************************************/
    validateConfig: function (CONFIG) { // eslint-disable-line no-unused-vars

      // No config keys to validate - timer options are per-start

    },


    /********************************************************************
    Validate options passed to start. Throws TypeError on programmer
    error.

    @param {Object} options - Start options
    *********************************************************************/
    validateStart: function (options) {

      // duration_ms must be a positive number
      if (!Lib.Utils.isNumber(options.duration_ms) || options.duration_ms <= 0) {
        throw new TypeError('helper-timer: duration_ms must be a positive number');
      }

      // direction must be 'down' or 'up' if provided
      if (options.direction !== undefined && options.direction !== 'down' && options.direction !== 'up') {
        throw new TypeError('helper-timer: direction must be "down" or "up"');
      }

      // tick_ms must be a positive number if provided
      if (options.tick_ms !== undefined) {
        if (!Lib.Utils.isNumber(options.tick_ms) || options.tick_ms <= 0) {
          throw new TypeError('helper-timer: tick_ms must be a positive number');
        }
      }

      // onTick must be a function if provided
      if (options.onTick !== undefined && !Lib.Utils.isFunction(options.onTick)) {
        throw new TypeError('helper-timer: onTick must be a function');
      }

      // onDone must be a function if provided
      if (options.onDone !== undefined && !Lib.Utils.isFunction(options.onDone)) {
        throw new TypeError('helper-timer: onDone must be a function');
      }

    }


  };

  // Return the Validators interface
  return Validators;

};
