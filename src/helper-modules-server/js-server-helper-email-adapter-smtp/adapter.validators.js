// Info: All validators for helper-email-adapter-smtp. Config validation at
// loader time. Programmer errors throw TypeError synchronously.
//
// Singleton: Lib injected for Utils type-check primitives.


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Singleton loader. Returns the module-scope Validators object.
SMTP adapter validators need Lib injection for Utils type checks.

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
    Validate the adapter config at loader time. Programmer errors throw
    TypeError synchronously.

    @param {Object} config - Merged configuration object
    *********************************************************************/
    validateConfig: function (config) {

      // SMTP_HOST must be a non-empty string
      if (!Lib.Utils.isString(config.SMTP_HOST) || Lib.Utils.isEmptyString(config.SMTP_HOST)) {
        throw new TypeError('[helper-email-adapter-smtp] SMTP_HOST must be a non-empty string');
      }

      // SMTP_PORT must be a positive number
      if (!Lib.Utils.isNumber(config.SMTP_PORT) || config.SMTP_PORT <= 0 || config.SMTP_PORT > 65535) {
        throw new TypeError('[helper-email-adapter-smtp] SMTP_PORT must be a number between 1 and 65535');
      }

      // SMTP_SECURE must be a boolean
      if (!Lib.Utils.isBoolean(config.SMTP_SECURE)) {
        throw new TypeError('[helper-email-adapter-smtp] SMTP_SECURE must be a boolean');
      }

      // SMTP_USER and SMTP_PASS are optional but must be strings if provided
      if (!Lib.Utils.isNullOrUndefined(config.SMTP_USER)) {
        if (!Lib.Utils.isString(config.SMTP_USER)) {
          throw new TypeError('[helper-email-adapter-smtp] SMTP_USER must be a string if provided');
        }
      }

      if (!Lib.Utils.isNullOrUndefined(config.SMTP_PASS)) {
        if (!Lib.Utils.isString(config.SMTP_PASS)) {
          throw new TypeError('[helper-email-adapter-smtp] SMTP_PASS must be a string if provided');
        }
      }

      // DKIM keys are optional, but if one is provided all three must be provided
      const has_dkim_domain = !Lib.Utils.isNullOrUndefined(config.SMTP_DKIM_DOMAIN);
      const has_dkim_selector = !Lib.Utils.isNullOrUndefined(config.SMTP_DKIM_SELECTOR);
      const has_dkim_key = !Lib.Utils.isNullOrUndefined(config.SMTP_DKIM_PRIVATE_KEY);

      if (has_dkim_domain || has_dkim_selector || has_dkim_key) {

        // All three must be provided if any one is
        if (!has_dkim_domain || !has_dkim_selector || !has_dkim_key) {
          throw new TypeError('[helper-email-adapter-smtp] all three DKIM keys (SMTP_DKIM_DOMAIN, SMTP_DKIM_SELECTOR, SMTP_DKIM_PRIVATE_KEY) must be provided together');
        }

        // Validate each is a non-empty string
        if (!Lib.Utils.isString(config.SMTP_DKIM_DOMAIN) || Lib.Utils.isEmptyString(config.SMTP_DKIM_DOMAIN)) {
          throw new TypeError('[helper-email-adapter-smtp] SMTP_DKIM_DOMAIN must be a non-empty string');
        }

        if (!Lib.Utils.isString(config.SMTP_DKIM_SELECTOR) || Lib.Utils.isEmptyString(config.SMTP_DKIM_SELECTOR)) {
          throw new TypeError('[helper-email-adapter-smtp] SMTP_DKIM_SELECTOR must be a non-empty string');
        }

        if (!Lib.Utils.isString(config.SMTP_DKIM_PRIVATE_KEY) || Lib.Utils.isEmptyString(config.SMTP_DKIM_PRIVATE_KEY)) {
          throw new TypeError('[helper-email-adapter-smtp] SMTP_DKIM_PRIVATE_KEY must be a non-empty string');
        }

      }

      // Attachment size limits must be non-negative numbers
      if (!Lib.Utils.isNumber(config.SMTP_MAX_ATTACHMENT_SIZE_MB) || config.SMTP_MAX_ATTACHMENT_SIZE_MB < 0) {
        throw new TypeError('[helper-email-adapter-smtp] SMTP_MAX_ATTACHMENT_SIZE_MB must be a non-negative number');
      }

      if (!Lib.Utils.isNumber(config.SMTP_MAX_TOTAL_ATTACHMENT_SIZE_MB) || config.SMTP_MAX_TOTAL_ATTACHMENT_SIZE_MB < 0) {
        throw new TypeError('[helper-email-adapter-smtp] SMTP_MAX_TOTAL_ATTACHMENT_SIZE_MB must be a non-negative number');
      }

    }

  };

}////////////////////////////// Public Functions END ////////////////////////////
