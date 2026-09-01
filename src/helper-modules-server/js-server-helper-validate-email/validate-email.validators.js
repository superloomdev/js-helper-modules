// Info: All validators for helper-validate-email. Config validation at
// loader time. Programmer errors (bad arguments) throw TypeError at call
// sites, not in validators.
//
// Singleton: Lib injected for Utils type-check primitives.


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Returns the module-scope Validators object.
ValidateEmail validators need Lib injection for Utils type checks.

@param {Object} Lib - Dependency container (Utils)
@param {Object} errors - Error catalog

@return {Object} - Public Validators interface
*********************************************************************/
export default function loader (Lib, errors) {

  // Return the Validators interface
  return Validators(Lib, errors);

};///////////////////////////// Module-Loader END ///////////////////////////////



///////////////////////////Public Functions START//////////////////////////////

function Validators (Lib, errors) { // eslint-disable-line no-unused-vars

  return {

    /********************************************************************
    Validate the module config at loader time. Programmer errors throw
    TypeError synchronously.

    @param {Object} config - Merged configuration object
    *********************************************************************/
    validateConfig: function (config) {

      // SMTP_TIMEOUT_MS must be a positive number
      if (!Lib.Utils.isNumber(config.SMTP_TIMEOUT_MS) || config.SMTP_TIMEOUT_MS <= 0) {
        throw new TypeError('[helper-validate-email] SMTP_TIMEOUT_MS must be a positive number');
      }

      // SMTP_FROM_ADDRESS must be a non-empty string
      if (!Lib.Utils.isString(config.SMTP_FROM_ADDRESS) || Lib.Utils.isEmptyString(config.SMTP_FROM_ADDRESS)) {
        throw new TypeError('[helper-validate-email] SMTP_FROM_ADDRESS must be a non-empty string');
      }

      // SMTP_MAX_MX_ATTEMPTS must be a positive number
      if (!Lib.Utils.isNumber(config.SMTP_MAX_MX_ATTEMPTS) || config.SMTP_MAX_MX_ATTEMPTS <= 0) {
        throw new TypeError('[helper-validate-email] SMTP_MAX_MX_ATTEMPTS must be a positive number');
      }

      // CHECK_CATCH_ALL must be a boolean
      if (!Lib.Utils.isBoolean(config.CHECK_CATCH_ALL)) {
        throw new TypeError('[helper-validate-email] CHECK_CATCH_ALL must be a boolean');
      }

      // CATCH_ALL_TEST_PREFIX must be a non-empty string
      if (!Lib.Utils.isString(config.CATCH_ALL_TEST_PREFIX) || Lib.Utils.isEmptyString(config.CATCH_ALL_TEST_PREFIX)) {
        throw new TypeError('[helper-validate-email] CATCH_ALL_TEST_PREFIX must be a non-empty string');
      }

      // GREYLIST_RETRY_MS must be a non-negative number
      if (!Lib.Utils.isNumber(config.GREYLIST_RETRY_MS) || config.GREYLIST_RETRY_MS < 0) {
        throw new TypeError('[helper-validate-email] GREYLIST_RETRY_MS must be a non-negative number');
      }

      // EHLO_FQDN must be null or a non-empty string
      if (!Lib.Utils.isNullOrUndefined(config.EHLO_FQDN)) {
        if (!Lib.Utils.isString(config.EHLO_FQDN) || Lib.Utils.isEmptyString(config.EHLO_FQDN)) {
          throw new TypeError('[helper-validate-email] EHLO_FQDN must be null or a non-empty string');
        }
      }

      // DNS_SERVERS must be null or an array of non-empty strings
      if (!Lib.Utils.isNullOrUndefined(config.DNS_SERVERS)) {
        if (!Array.isArray(config.DNS_SERVERS) || config.DNS_SERVERS.length === 0) {
          throw new TypeError('[helper-validate-email] DNS_SERVERS must be null or a non-empty array');
        }
        for (let i = 0; i < config.DNS_SERVERS.length; i++) {
          if (!Lib.Utils.isString(config.DNS_SERVERS[i]) || Lib.Utils.isEmptyString(config.DNS_SERVERS[i])) {
            throw new TypeError('[helper-validate-email] DNS_SERVERS must be an array of non-empty strings');
          }
        }
      }

    }

  };

}////////////////////////////// Public Functions END ////////////////////////////
