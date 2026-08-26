// Info: Config validator for js-server-helper-sql-mysql.
// Called once at construction time from the loader to validate CONFIG.
// Throws Error on misconfiguration so the module fails before serving
// a single request.
//
// Singleton: Lib and ERRORS injected once by the loader. Node.js require
// cache guarantees the same reference on every subsequent require.


// Shared dependencies injected by loader
let Lib;
let ERRORS; // eslint-disable-line no-unused-vars


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Injects Lib and ERRORS, then returns the module-scope
Validators object. Takes Lib and ERRORS - no CONFIG - because validators
run before CONFIG is validated.

@param {Object} shared_libs - Dependency container (Utils, Debug)
@param {Object} errors - Frozen error catalog (mysql.errors.js)

@return {Object} - Public Validators interface
*********************************************************************/
export default function loader (shared_libs, errors) {

  // Inject shared dependencies
  Lib = shared_libs;
  ERRORS = errors;

  // Return the Validators interface
  return Validators;

};///////////////////////////// Module-Loader END ///////////////////////////////



////////////////////////////// Public Functions START ////////////////////////
const Validators = {


  /********************************************************************
  Validate the merged CONFIG. Throws on any misconfiguration so the
  loader fails before the module is used.

  @param {Object} config - Merged module configuration

  @return {void}
  *********************************************************************/
  validateConfig: function (config) {

    // D1 fix: maxIdle must be strictly below connectionLimit, otherwise
    // mysql2 never starts its idle reaper and POOL_IDLE_TIMEOUT_MS is dead.
    if (
      Lib.Utils.isNumber(config.POOL_MAX_IDLE) &&
      Lib.Utils.isNumber(config.POOL_MAX) &&
      config.POOL_MAX_IDLE >= config.POOL_MAX
    ) {
      throw new Error(
        'MySQL: POOL_MAX_IDLE (' + config.POOL_MAX_IDLE +
        ') must be strictly below POOL_MAX (' + config.POOL_MAX +
        ') or the idle reaper never starts and POOL_IDLE_TIMEOUT_MS has no effect'
      );
    }

  }


};////////////////////////////// Public Functions END //////////////////////////
