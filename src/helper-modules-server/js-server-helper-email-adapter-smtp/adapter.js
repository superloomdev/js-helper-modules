// Info: SMTP transport adapter for js-server-helper-email. Uses Nodemailer
// to deliver email messages via an SMTP server.
//
// Standard factory shape: receives shared_libs, owns its own CONFIG, ERRORS,
// and Validators. Returns a ready-to-use adapter object that the parent
// email module consumes via CONFIG.Adapter.
//
// Adapter contract:
//   send(instance, message) -> { success, message_id, accepted, rejected, error }
//
// Compatibility: Node.js 24+
import CONFIG_DEFAULTS from './adapter.config.js';
import ERRORS from './adapter.errors.js';
import createValidators from './adapter.validators.js';


// Lazy-loaded Nodemailer transport (module-scope cache)
let Nodemailer = null;
let transporter = null;
let transporter_config_key = null;



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Thin loader. Picks dependencies from the injected container, merges
config over defaults, validates config via the Validators singleton,
then delegates to createInterface. Each call returns an independent
Adapter instance.

@param {Object} shared_libs - Dependency container (Utils, Debug)
@param {Object} config - Overrides merged over adapter config defaults
                         (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ...)

@return {Object} - Adapter interface (the parent's adapter contract)
*********************************************************************/
export default function loader (shared_libs, config) {

  // Dependencies for this instance - by reference from the shared container
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug
  };

  // Merge overrides over adapter config defaults
  const CONFIG = Object.assign(
    {},
    CONFIG_DEFAULTS,
    config || {}
  );

  // Load the validators singleton and inject Lib + ERRORS
  const Validators = createValidators(Lib, ERRORS);

  // Validate config - throws on misconfiguration
  Validators.validateConfig(CONFIG);

  // Build the public Adapter interface
  return createInterface(Lib, CONFIG, ERRORS, Validators);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public Adapter interface closed over Lib, CONFIG, ERRORS,
and Validators. The Nodemailer transporter is lazy-loaded on first
send to avoid importing the dependency until it is needed.

@param {Object} Lib - Dependency container (Utils, Debug)
@param {Object} CONFIG - Merged adapter configuration
@param {Object} ERRORS - Frozen error catalog
@param {Object} Validators - Config validators

@return {Object} - { send }
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  ////////////////////////////// Public Functions START ////////////////////////
  const Adapter = {

    /********************************************************************
    Send an email message through the SMTP transport. Lazy-loads
    Nodemailer and builds the transporter on first use.

    @param {Object} instance - Request instance
    @param {Object} message - Normalized message object from the parent

    @return {Promise<Object>} - { success, message_id, accepted, rejected, error }
    *********************************************************************/
    send: async function (instance, message) {

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Validate attachment sizes before sending (fail fast)
        const attachment_error = _Adapter.validateAttachmentSizes(message);

        if (attachment_error) {
          Lib.Debug.performanceAuditLog('End', 'EmailAdapterSmtp send', start_ms);

          return {
            success: false,
            message_id: null,
            accepted: [],
            rejected: [],
            error: attachment_error
          };
        }

        // Initialize the Nodemailer transporter on first use
        await _Adapter.initTransporter(CONFIG);

        // Build the Nodemailer message object from the normalized message
        const mail_options = _Adapter.buildMailOptions(message);

        // Send the email through Nodemailer
        const info = await transporter.sendMail(mail_options);

        Lib.Debug.performanceAuditLog('End', 'EmailAdapterSmtp send', start_ms);

        // Return success envelope with provider response
        return {
          success: true,
          message_id: info.messageId,
          accepted: info.accepted || [],
          rejected: info.rejected || [],
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('EmailAdapterSmtp send failed', {
          type: ERRORS.EMAIL_ADAPTER_SMTP_SEND_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        Lib.Debug.performanceAuditLog('End', 'EmailAdapterSmtp send', start_ms);

        // Return error envelope
        return {
          success: false,
          message_id: null,
          accepted: [],
          rejected: [],
          error: ERRORS.EMAIL_ADAPTER_SMTP_SEND_FAILED
        };

      }

    }

  };///////////////////////////// Public Functions END /////////////////////////



  ///////////////////////////// Private Functions START /////////////////////////
  const _Adapter = {

    /********************************************************************
    Lazy-load Nodemailer and build the transporter on first use.
    The transporter is cached at module scope keyed by the SMTP config
    so multiple instances with the same config share one transporter.

    @param {Object} CONFIG - Merged adapter configuration
    *********************************************************************/
    initTransporter: async function (CONFIG) {

      // Load Nodemailer on first use (module-scope cache)
      if (Lib.Utils.isNullOrUndefined(Nodemailer)) {
        Nodemailer = (await import('nodemailer')).default;
      }

      // Build a cache key from the SMTP connection config
      const config_key = CONFIG.SMTP_HOST + ':' + CONFIG.SMTP_PORT + ':' + (CONFIG.SMTP_USER || '') + ':' + (CONFIG.SMTP_DKIM_DOMAIN || '');

      // Return early if the transporter is already built for this config
      if (!Lib.Utils.isNullOrUndefined(transporter) && transporter_config_key === config_key) {
        return;
      }

      // Build the Nodemailer transporter with auth if credentials are provided
      const transport_config = {
        host: CONFIG.SMTP_HOST,
        port: CONFIG.SMTP_PORT,
        secure: CONFIG.SMTP_SECURE
      };

      if (!Lib.Utils.isNullOrUndefined(CONFIG.SMTP_USER) && !Lib.Utils.isEmptyString(CONFIG.SMTP_USER)) {
        transport_config.auth = {
          user: CONFIG.SMTP_USER,
          pass: CONFIG.SMTP_PASS
        };
      }

      // Add DKIM signing when all three DKIM keys are configured
      if (!Lib.Utils.isNullOrUndefined(CONFIG.SMTP_DKIM_DOMAIN) && !Lib.Utils.isEmptyString(CONFIG.SMTP_DKIM_DOMAIN)) {
        transport_config.dkim = {
          domainName: CONFIG.SMTP_DKIM_DOMAIN,
          keySelector: CONFIG.SMTP_DKIM_SELECTOR,
          privateKey: CONFIG.SMTP_DKIM_PRIVATE_KEY
        };
      }

      // Cache the transporter at module scope
      transporter = Nodemailer.createTransport(transport_config);
      transporter_config_key = config_key;

    },


    /********************************************************************
    Build a Nodemailer message object from the normalized message.

    @param {Object} message - Normalized message object

    @return {Object} - Nodemailer mail options object
    *********************************************************************/
    buildMailOptions: function (message) {

      // Build the base mail options from normalized message fields
      const mail_options = {
        from: message.from,
        subject: message.subject,
        headers: message.headers
      };

      // Add recipients as comma-separated strings (Nodemailer accepts arrays too)
      if (!Lib.Utils.isEmptyArray(message.to)) {
        mail_options.to = message.to.join(', ');
      }

      if (!Lib.Utils.isEmptyArray(message.cc)) {
        mail_options.cc = message.cc.join(', ');
      }

      if (!Lib.Utils.isEmptyArray(message.bcc)) {
        mail_options.bcc = message.bcc.join(', ');
      }

      // Add body content
      if (!Lib.Utils.isNullOrUndefined(message.text)) {
        mail_options.text = message.text;
      }

      if (!Lib.Utils.isNullOrUndefined(message.html)) {
        mail_options.html = message.html;
      }

      // Add attachments if provided
      if (Array.isArray(message.attachments) && message.attachments.length > 0) {
        mail_options.attachments = message.attachments;
      }

      // Return the Nodemailer mail options
      return mail_options;

    },


    /********************************************************************
    Validate attachment sizes against configured limits. Returns an
    error object if any limit is exceeded, or null if all sizes are
    within limits or no limits are configured.

    @param {Object} message - Normalized message object

    @return {Object|null} - Error object or null
    *********************************************************************/
    validateAttachmentSizes: function (message) {

      // Skip if no attachments
      if (!Array.isArray(message.attachments) || message.attachments.length === 0) {
        return null;
      }

      const MB_IN_BYTES = 1024 * 1024;
      let total_size = 0;

      // Check each attachment against the per-file limit
      if (CONFIG.SMTP_MAX_ATTACHMENT_SIZE_MB > 0) {

        for (let i = 0; i < message.attachments.length; i++) {

          const attachment = message.attachments[i];

          // Calculate size: Buffer content uses length, string content uses byteLength
          const size_bytes = Buffer.isBuffer(attachment.content)
            ? attachment.content.length
            : Buffer.byteLength(attachment.content || '', 'utf8');

          // Return error if this attachment exceeds the per-file limit
          if (size_bytes > CONFIG.SMTP_MAX_ATTACHMENT_SIZE_MB * MB_IN_BYTES) {
            return ERRORS.ATTACHMENT_TOO_LARGE;
          }

          total_size += size_bytes;

        }

      } else {

        // No per-file limit, but still calculate total for the total limit check
        for (let i = 0; i < message.attachments.length; i++) {

          const attachment = message.attachments[i];

          total_size += Buffer.isBuffer(attachment.content)
            ? attachment.content.length
            : Buffer.byteLength(attachment.content || '', 'utf8');

        }

      }

      // Check total attachment size against the total limit
      if (CONFIG.SMTP_MAX_TOTAL_ATTACHMENT_SIZE_MB > 0) {
        if (total_size > CONFIG.SMTP_MAX_TOTAL_ATTACHMENT_SIZE_MB * MB_IN_BYTES) {
          return ERRORS.ATTACHMENT_TOO_LARGE;
        }
      }

      // All sizes within limits
      return null;

    }

  };///////////////////////////// Private Functions END ////////////////////////

  return Adapter;

};/////////////////////////// createInterface END //////////////////////////////
