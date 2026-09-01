// Info: Email sending module with swappable transport adapters. Owns the
// message model, deliverability headers, and the transport adapter contract.
// The caller passes a ready-to-use adapter object as CONFIG.Adapter.
//
// Adapter contract (1 method every adapter must implement):
//   send(instance, message) -> { success, message_id, accepted, rejected, error }
//
// Compatibility: Node.js 24+
//
// Factory pattern: each loader call returns an independent Email interface
// with its own Lib, CONFIG, ERRORS, and Validators, bound to one adapter.
// Stateless - no per-instance resources.
import nodeCrypto from 'node:crypto';
import CONFIG_DEFAULTS from './email.config.js';
import ERRORS from './email.errors.js';
import createValidators from './email.validators.js';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent Email instance with its own
Lib, CONFIG, ERRORS, and Validators, bound to one adapter. Validates
CONFIG at construction time so misconfiguration fails at startup.

@param {Object} shared_libs - Lib container with Utils, Debug
@param {Object} config - Overrides merged over module config defaults.
                         Must include: { Adapter: ready-to-use adapter }

@return {Object} - Public Email interface
*********************************************************************/
export default function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    Crypto: shared_libs.Crypto
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    CONFIG_DEFAULTS,
    config || {}
  );

  // Validators singleton - Lib, ERRORS injected here
  const Validators = createValidators(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Adapter + contract validation
  const adapter = CONFIG.Adapter;
  Validators.validateAdapterContract(adapter);

  // Create and return the public interface
  return createInterface(Lib, CONFIG, ERRORS, Validators, adapter);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public interface for one instance. Public and private
functions close over the provided Lib, CONFIG, ERRORS, Validators,
and adapter.

@param {Object} Lib - Dependency container (Utils, Debug)
@param {Object} CONFIG - Merged configuration for this instance
@param {Object} ERRORS - Error catalog for this module
@param {Object} Validators - Validators module instance
@param {Object} adapter - Ready-to-use transport adapter

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, adapter) {

  ///////////////////////////Public Functions START//////////////////////////////
  const Email = {

    // ~~~~~~~~~~~~~~~~~~~~ Email Sending ~~~~~~~~~~~~~~~~~~~~
    // Build, validate, and dispatch email messages through the transport adapter.

    /********************************************************************
    Send an email message through the configured transport adapter. Validates
    the message, applies deliverability headers based on message_type, and
    delegates to the adapter for delivery.

    @param {Object} instance - Request instance
    @param {Object} message - Email message object

    @return {Promise<Object>} - { success, message_id, accepted, rejected, error }
    *********************************************************************/
    sendEmail: async function (instance, message) {

      // Validate message - programmer error throws TypeError
      _Email.validateMessage(message);

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Normalize recipients to arrays
      const normalized_message = _Email.normalizeMessage(message);

      // Apply deliverability headers based on message type
      normalized_message.headers = _Email.applyDeliverabilityHeaders(normalized_message);

      // Delegate to the transport adapter for delivery
      let result;

      try {
        result = await adapter.send(instance, normalized_message);
      } catch (adapter_error) {

        // Adapter threw - translate to envelope, never let exceptions cross module boundary
        Lib.Debug.debug('Email sendEmail adapter threw', {
          message: adapter_error && adapter_error.message
        });

        Lib.Debug.performanceAuditLog('End', 'Email sendEmail', start_ms);

        return {
          success: false,
          message_id: null,
          accepted: [],
          rejected: [],
          error: ERRORS.EMAIL_SEND_FAILED
        };

      }

      Lib.Debug.performanceAuditLog('End', 'Email sendEmail', start_ms);

      // Return adapter result envelope
      return {
        success: result.success,
        message_id: result.success ? result.message_id : null,
        accepted: result.accepted || [],
        rejected: result.rejected || [],
        error: result.error || null
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Deliverability Headers ~~~~~~~~~~~~~~~~~~~~
    // Pure helpers for building transactional and promotional header sets.

    /********************************************************************
    Build headers object for transactional messages.

    @return {Object} - Headers object with Precedence: transactional
    *********************************************************************/
    buildTransactionalHeaders: function () {

      // Return transactional headers
      return {
        'Precedence': 'transactional'
      };

    },


    /********************************************************************
    Build headers object for promotional or marketing messages. Includes
    List-Unsubscribe and List-Unsubscribe-Post per RFC 8058 (one-click
    unsubscribe), required by Gmail and Yahoo for bulk senders.

    @param {String} unsubscribe_url - HTTPS URL for one-click unsubscribe
    @param {String} unsubscribe_email - Mailto address for unsubscribe

    @return {Object} - Headers object with Precedence, List-Unsubscribe, List-Unsubscribe-Post
    *********************************************************************/
    buildPromotionalHeaders: function (unsubscribe_url, unsubscribe_email) {

      // Validate inputs - programmer error throws TypeError
      if (!Lib.Utils.isString(unsubscribe_url) || Lib.Utils.isEmptyString(unsubscribe_url)) {
        throw new TypeError('[helper-email] buildPromotionalHeaders requires a non-empty string unsubscribe_url');
      }

      if (!Lib.Utils.isString(unsubscribe_email) || Lib.Utils.isEmptyString(unsubscribe_email)) {
        throw new TypeError('[helper-email] buildPromotionalHeaders requires a non-empty string unsubscribe_email');
      }

      // Return promotional headers with RFC 8058 one-click unsubscribe
      return {
        'Precedence': 'bulk',
        'List-Unsubscribe': '<' + unsubscribe_url + '>, <mailto:' + unsubscribe_email + '>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Unsubscribe Token Signing ~~~~~~~~~~~~~~~~~~~~
    // HMAC-SHA256 signed tokens for RFC 8058 one-click unsubscribe URLs.

    /********************************************************************
    Sign an email address into an unsubscribe token. The token is a
    URL-safe string containing the base64url-encoded email and its
    HMAC-SHA256 signature, separated by a dot. The application builds
    the unsubscribe URL by appending this token as a query parameter.

    Token format: base64url(email).base64url(hmac_sha256(email, secret))

    @param {Object} instance - Request instance
    @param {String} email - Email address to sign

    @return {Object} - { success, token, error }
    *********************************************************************/
    signUnsubscribeToken: function (instance, email) {

      // Validate email - programmer error throws TypeError
      if (!Lib.Utils.isString(email) || Lib.Utils.isEmptyString(email)) {
        throw new TypeError('[helper-email] signUnsubscribeToken requires a non-empty string email');
      }

      // Validate UNSUBSCRIBE_SECRET is configured
      if (Lib.Utils.isNullOrUndefined(CONFIG.UNSUBSCRIBE_SECRET) || Lib.Utils.isEmptyString(CONFIG.UNSUBSCRIBE_SECRET)) {
        throw new TypeError('[helper-email] signUnsubscribeToken requires UNSUBSCRIBE_SECRET to be configured');
      }

      // Encode the email as URL-safe base64
      const encoded_email = Lib.Crypto.urlEncodeBase64(Lib.Crypto.stringToBase64(email));

      // Sign the email with HMAC-SHA256 using the configured secret
      const signature = Lib.Crypto.sha256String(email, CONFIG.UNSUBSCRIBE_SECRET);

      // Encode the signature as URL-safe base64
      const encoded_signature = Lib.Crypto.urlEncodeBase64(Lib.Crypto.stringToBase64(signature));

      // Return the signed token
      return {
        success: true,
        token: encoded_email + '.' + encoded_signature,
        error: null
      };

    },


    /********************************************************************
    Verify an unsubscribe token and extract the original email address.
    Uses constant-time comparison to prevent timing attacks.

    @param {Object} instance - Request instance
    @param {String} token - Token returned by signUnsubscribeToken

    @return {Object} - { success, email, error }
    *********************************************************************/
    verifyUnsubscribeToken: function (instance, token) {

      // Validate token - programmer error throws TypeError
      if (!Lib.Utils.isString(token) || Lib.Utils.isEmptyString(token)) {
        throw new TypeError('[helper-email] verifyUnsubscribeToken requires a non-empty string token');
      }

      // Validate UNSUBSCRIBE_SECRET is configured
      if (Lib.Utils.isNullOrUndefined(CONFIG.UNSUBSCRIBE_SECRET) || Lib.Utils.isEmptyString(CONFIG.UNSUBSCRIBE_SECRET)) {
        throw new TypeError('[helper-email] verifyUnsubscribeToken requires UNSUBSCRIBE_SECRET to be configured');
      }

      // Split token into email and signature parts
      const parts = token.split('.');

      // Return error for invalid token format
      if (parts.length !== 2) {
        return {
          success: false,
          email: null,
          error: ERRORS.EMAIL_INVALID_TOKEN
        };
      }

      // Decode the email from URL-safe base64
      let decoded_email;

      try {
        decoded_email = Lib.Crypto.base64ToString(Lib.Crypto.urlDecodeBase64(parts[0]));
      } catch {
        return {
          success: false,
          email: null,
          error: ERRORS.EMAIL_INVALID_TOKEN
        };
      }

      // Recompute the HMAC signature
      const expected_signature = Lib.Crypto.sha256String(decoded_email, CONFIG.UNSUBSCRIBE_SECRET);
      const expected_encoded = Lib.Crypto.urlEncodeBase64(Lib.Crypto.stringToBase64(expected_signature));

      // Compare using constant-time comparison to prevent timing attacks
      const provided_buffer = Buffer.from(parts[1]);
      const expected_buffer = Buffer.from(expected_encoded);

      // Return error if lengths do not match
      if (provided_buffer.length !== expected_buffer.length) {
        return {
          success: false,
          email: null,
          error: ERRORS.EMAIL_INVALID_TOKEN
        };
      }

      // Constant-time comparison
      if (!nodeCrypto.timingSafeEqual(provided_buffer, expected_buffer)) {
        return {
          success: false,
          email: null,
          error: ERRORS.EMAIL_INVALID_TOKEN
        };
      }

      // Return the verified email
      return {
        success: true,
        email: decoded_email,
        error: null
      };

    }

  };///////////////////////////Public Functions END//////////////////////////////



  //////////////////////////Private Functions START//////////////////////////////
  const _Email = {

    /********************************************************************
    Validate the email message object. Throws TypeError on programmer
    error (missing required fields).

    @param {Object} message - Email message object
    *********************************************************************/
    validateMessage: function (message) {

      // Check message is an object
      if (!Lib.Utils.isObject(message)) {
        throw new TypeError('[helper-email] message must be an object');
      }

      // Check at least one recipient exists
      const has_to = Lib.Utils.isString(message.to) && !Lib.Utils.isEmptyString(message.to);
      const has_cc = Lib.Utils.isString(message.cc) && !Lib.Utils.isEmptyString(message.cc);
      const has_bcc = Lib.Utils.isString(message.bcc) && !Lib.Utils.isEmptyString(message.bcc);
      const has_array_recipients = Array.isArray(message.to) || Array.isArray(message.cc) || Array.isArray(message.bcc);
      if (!has_to && !has_cc && !has_bcc && !has_array_recipients) {
        throw new TypeError('[helper-email] at least one recipient (to, cc, or bcc) is required');
      }

      // Check subject is present
      if (!Lib.Utils.isString(message.subject) || Lib.Utils.isEmptyString(message.subject)) {
        throw new TypeError('[helper-email] subject is required');
      }

      // Check at least one body or attachments exist
      const has_text = Lib.Utils.isString(message.text) && !Lib.Utils.isEmptyString(message.text);
      const has_html = Lib.Utils.isString(message.html) && !Lib.Utils.isEmptyString(message.html);
      const has_attachments = Array.isArray(message.attachments) && message.attachments.length > 0;
      if (!has_text && !has_html && !has_attachments) {
        throw new TypeError('[helper-email] at least one body (text or html) or attachments are required');
      }

    },


    /********************************************************************
    Normalize the message: convert recipient strings to arrays, apply
    default from address and message type from config.

    @param {Object} message - Email message object

    @return {Object} - Normalized message object
    *********************************************************************/
    normalizeMessage: function (message) {

      // Clone the message to avoid mutating the caller's object
      const normalized = Object.assign({}, message);

      // Apply default from address if not set
      if (Lib.Utils.isNullOrUndefined(normalized.from) || !Lib.Utils.isString(normalized.from) || Lib.Utils.isEmptyString(normalized.from)) {
        if (!Lib.Utils.isNullOrUndefined(CONFIG.DEFAULT_FROM) && !Lib.Utils.isEmptyString(CONFIG.DEFAULT_FROM)) {
          normalized.from = CONFIG.DEFAULT_FROM;
        }
      }

      // Apply default message type if not set
      if (Lib.Utils.isNullOrUndefined(normalized.message_type) || Lib.Utils.isEmptyString(normalized.message_type)) {
        normalized.message_type = CONFIG.DEFAULT_MESSAGE_TYPE;
      }

      // Normalize recipients to arrays
      normalized.to = _Email.normalizeRecipients(normalized.to);
      normalized.cc = _Email.normalizeRecipients(normalized.cc);
      normalized.bcc = _Email.normalizeRecipients(normalized.bcc);

      // Ensure headers object exists
      if (!Lib.Utils.isObject(normalized.headers)) {
        normalized.headers = {};
      }

      // Return normalized message
      return normalized;

    },


    /********************************************************************
    Normalize recipient field to an array of strings.

    @param {String|Array|undefined} recipients - Recipient(s)

    @return {Array} - Array of recipient strings, or empty array
    *********************************************************************/
    normalizeRecipients: function (recipients) {

      // Return empty array for undefined or null
      if (Lib.Utils.isNullOrUndefined(recipients)) {
        return [];
      }

      // Wrap single string in array
      if (Lib.Utils.isString(recipients)) {
        return [recipients];
      }

      // Return as-is if already an array
      if (Array.isArray(recipients)) {
        return recipients;
      }

      // Return empty array for other types
      return [];

    },


    /********************************************************************
    Apply deliverability headers based on message_type. Merges the
    deliverability headers with any caller-supplied custom headers.

    @param {Object} message - Normalized message object

    @return {Object} - Merged headers object
    *********************************************************************/
    applyDeliverabilityHeaders: function (message) {

      // Get caller-supplied custom headers
      const custom_headers = message.headers || {};

      // Build deliverability headers based on message type
      let deliverability_headers;

      if (message.message_type === 'promotional') {

        // Promotional messages require unsubscribe URL and email
        const has_unsub_url = Lib.Utils.isString(message.unsubscribe_url) && !Lib.Utils.isEmptyString(message.unsubscribe_url);
        const has_unsub_email = Lib.Utils.isString(message.unsubscribe_email) && !Lib.Utils.isEmptyString(message.unsubscribe_email);
        if (!has_unsub_url || !has_unsub_email) {
          throw new TypeError('[helper-email] promotional messages require unsubscribe_url and unsubscribe_email');
        }

        deliverability_headers = Email.buildPromotionalHeaders(
          message.unsubscribe_url,
          message.unsubscribe_email
        );

      } else {

        // Default to transactional headers
        deliverability_headers = Email.buildTransactionalHeaders();

      }

      // Merge: caller headers take precedence over deliverability headers
      return Object.assign({}, deliverability_headers, custom_headers);

    }

  };//////////////////////////Private Functions END//////////////////////////////



  // Return public interface
  return Email;

};/////////////////////////// createInterface END //////////////////////////////
