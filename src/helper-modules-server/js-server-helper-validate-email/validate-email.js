// Info: Email deliverability verification. MX record resolution and SMTP
// mailbox reachability probes using Node.js dns and net modules.
//
// Compatibility: Node.js 24+.
//
// Factory pattern: each loader call returns an independent ValidateEmail
// interface with its own Lib, CONFIG, ERRORS, and Validators. Stateless -
// no per-instance resources.
import dns from 'node:dns/promises';
import dnsSync from 'node:dns';
import net from 'node:net';
import crypto from 'node:crypto';
import CONFIG_DEFAULTS from './validate-email.config.js';
import ERRORS from './validate-email.errors.js';
import createValidators from './validate-email.validators.js';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
Lib, CONFIG, ERRORS, and Validators.

@param {Object} shared_libs - Lib container with Utils, Debug, Instance
@param {Object} config - Overrides merged over module config defaults

@return {Object} - Public interface for this module
*********************************************************************/
export default function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    CONFIG_DEFAULTS,
    config || {}
  );

  // Validators module (singleton, initialized with Lib, ERRORS)
  const Validators = createValidators(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Create and return the public interface
  return createInterface(Lib, CONFIG, ERRORS, Validators);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public interface for one instance. Public and private
functions close over the provided Lib, CONFIG, ERRORS, and Validators.

@param {Object} Lib - Dependency container (Utils, Debug)
@param {Object} CONFIG - Merged configuration for this instance
@param {Object} ERRORS - Error catalog for this module
@param {Object} Validators - Validators module instance

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  ///////////////////////////Public Functions START//////////////////////////////
  const ValidateEmail = {

    // ~~~~~~~~~~~~~~~~~~~~ MX Record Resolution ~~~~~~~~~~~~~~~~~~~~
    // DNS-based domain deliverability checks.

    /********************************************************************
    Check whether a domain can receive email by resolving its MX records.
    Handles null MX (RFC 7505) and A/AAAA fallback (RFC 5321 section 5.1).

    @param {Object} instance - Request instance
    @param {String} domain - Domain name to check

    @return {Promise<Object>} - { success, has_mx, mx_records, error }
    *********************************************************************/
    checkDomainMx: async function (instance, domain) {

      // Validate input - programmer error throws TypeError
      if (!Lib.Utils.isString(domain) || Lib.Utils.isEmptyString(domain)) {
        throw new TypeError('[helper-validate-email] checkDomainMx requires a non-empty string domain');
      }

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Resolve MX records for the domain
      const mx_result = await _ValidateEmail.resolveMx(domain);

      Lib.Debug.performanceAuditLog('End', 'ValidateEmail checkDomainMx', start_ms);

      // Return result envelope
      return {
        success: mx_result.success,
        has_mx: mx_result.success && mx_result.mx_records.length > 0,
        mx_records: mx_result.success ? mx_result.mx_records : [],
        error: mx_result.error
      };

    },


    /********************************************************************
    Resolve MX records for a domain without SMTP probing. Returns the
    raw MX record array sorted by priority.

    @param {Object} instance - Request instance
    @param {String} domain - Domain name to resolve

    @return {Promise<Object>} - { success, mx_records, error }
    *********************************************************************/
    getDomainMx: async function (instance, domain) {

      // Validate input - programmer error throws TypeError
      if (!Lib.Utils.isString(domain) || Lib.Utils.isEmptyString(domain)) {
        throw new TypeError('[helper-validate-email] getDomainMx requires a non-empty string domain');
      }

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Resolve MX records for the domain
      const mx_result = await _ValidateEmail.resolveMx(domain);

      Lib.Debug.performanceAuditLog('End', 'ValidateEmail getDomainMx', start_ms);

      // Return result envelope
      return {
        success: mx_result.success,
        mx_records: mx_result.success ? mx_result.mx_records : [],
        error: mx_result.error
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ SMTP Mailbox Verification ~~~~~~~~~~~~~~~~~~~~
    // Best-effort mailbox reachability via SMTP RCPT TO probes.

    /********************************************************************
    Check whether a specific mailbox is reachable by connecting to the
    domain's MX server and running an SMTP RCPT TO probe.

    Best-effort: greylisting, catch-all domains, and provider blocks
    (Gmail, Yahoo) make SMTP verification inherently unreliable. The
    result is a signal, not a guarantee.

    @param {Object} instance - Request instance
    @param {String} email - Email address to verify

    @return {Promise<Object>} - { success, reachable, catch_all, reason, error }
    *********************************************************************/
    checkMailbox: async function (instance, email) {

      // Validate input - programmer error throws TypeError
      if (!Lib.Utils.isString(email) || Lib.Utils.isEmptyString(email)) {
        throw new TypeError('[helper-validate-email] checkMailbox requires a non-empty string email');
      }

      // Extract domain from email address
      const at_index = email.lastIndexOf('@');

      // Return error for invalid email format
      if (at_index < 0 || at_index === email.length - 1) {
        return {
          success: false,
          reachable: false,
          catch_all: false,
          reason: 'Invalid email format',
          error: ERRORS.VALIDATE_EMAIL_INVALID_EMAIL
        };
      }

      const domain = email.substring(at_index + 1);

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Resolve MX records for the domain
      const mx_result = await _ValidateEmail.resolveMx(domain);

      // Return error if MX resolution failed
      if (!mx_result.success) {

        Lib.Debug.performanceAuditLog('End', 'ValidateEmail checkMailbox', start_ms);

        // Return DNS failure envelope
        return {
          success: false,
          reachable: false,
          catch_all: false,
          reason: 'DNS resolution failed',
          error: mx_result.error
        };

      }

      // Return not reachable if no MX records
      if (mx_result.mx_records.length === 0) {

        Lib.Debug.performanceAuditLog('End', 'ValidateEmail checkMailbox', start_ms);

        // Return no-MX envelope
        return {
          success: true,
          reachable: false,
          catch_all: false,
          reason: 'No MX records found for domain',
          error: null
        };

      }

      // Attempt SMTP probe against MX hosts in priority order
      const max_attempts = Math.min(CONFIG.SMTP_MAX_MX_ATTEMPTS, mx_result.mx_records.length);
      let last_error = null;
      let greylisted = false;

      for (let i = 0; i < max_attempts; i++) {

        const mx_host = mx_result.mx_records[i].exchange;

        // Probe one MX host
        const probe_result = await _ValidateEmail.smtpProbe(mx_host, email, domain, CONFIG.SMTP_TIMEOUT_MS);

        // Return immediately on a definitive result (reachable or rejected)
        if (probe_result.success && probe_result.reachable !== null) {

          Lib.Debug.performanceAuditLog('End', 'ValidateEmail checkMailbox', start_ms);

          // Determine catch-all status when mailbox is reachable
          let catch_all = false;

          if (probe_result.reachable && CONFIG.CHECK_CATCH_ALL) {

            // Probe with a random address to detect catch-all domains
            const catch_all_result = await _ValidateEmail.smtpProbe(
              mx_host,
              CONFIG.CATCH_ALL_TEST_PREFIX + crypto.randomUUID() + '@' + domain,
              domain,
              CONFIG.SMTP_TIMEOUT_MS
            );

            catch_all = catch_all_result.success && catch_all_result.reachable === true;

          }

          // Return definitive result envelope
          return {
            success: true,
            reachable: probe_result.reachable,
            catch_all: catch_all,
            reason: probe_result.reason,
            error: null
          };

        }

        // Track greylisting (4xx) across MX hosts
        if (probe_result.reason && probe_result.reason.indexOf('Greylisted') >= 0) {
          greylisted = true;
        }

        // Record error and try next MX host
        last_error = probe_result.error;

      }

      // All MX hosts exhausted
      Lib.Debug.performanceAuditLog('End', 'ValidateEmail checkMailbox', start_ms);

      // Return greylisted envelope when 4xx was encountered
      if (greylisted) {
        return {
          success: true,
          reachable: null,
          catch_all: false,
          reason: 'Greylisted (4xx transient failure)',
          error: null
        };
      }

      // Return failure envelope after exhausting all MX hosts
      return {
        success: false,
        reachable: false,
        catch_all: false,
        reason: 'All MX hosts failed to respond',
        error: last_error || ERRORS.VALIDATE_EMAIL_SMTP_CONNECT_FAILED
      };

    },


    // ~~~~~~~~~~~~~~~~~~~~ Composite Verification ~~~~~~~~~~~~~~~~~~~~
    // Full deliverability check in one call.

    /********************************************************************
    Run a composite deliverability check: syntax validation, MX record
    resolution, and SMTP mailbox probe. Returns a single envelope with
    all results.

    @param {Object} instance - Request instance
    @param {String} email - Email address to verify

    @return {Promise<Object>} - { success, syntax_valid, has_mx, mailbox_reachable, catch_all, reason, error }
    *********************************************************************/
    checkEmailDeliverability: async function (instance, email) {

      // Validate input - programmer error throws TypeError
      if (!Lib.Utils.isString(email) || Lib.Utils.isEmptyString(email)) {
        throw new TypeError('[helper-validate-email] checkEmailDeliverability requires a non-empty string email');
      }

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Check email syntax
      const syntax_valid = _ValidateEmail.checkSyntax(email);

      // Return early if syntax is invalid
      if (!syntax_valid) {

        Lib.Debug.performanceAuditLog('End', 'ValidateEmail checkEmailDeliverability', start_ms);

        // Return invalid-syntax envelope
        return {
          success: true,
          syntax_valid: false,
          has_mx: false,
          mailbox_reachable: false,
          catch_all: false,
          reason: 'Invalid email syntax',
          error: null
        };

      }

      // Extract domain from email
      const at_index = email.lastIndexOf('@');
      const domain = email.substring(at_index + 1);

      // Resolve MX records
      const mx_result = await _ValidateEmail.resolveMx(domain);

      // Return early if no MX records
      if (!mx_result.success || mx_result.mx_records.length === 0) {

        Lib.Debug.performanceAuditLog('End', 'ValidateEmail checkEmailDeliverability', start_ms);

        // Return no-MX envelope
        return {
          success: true,
          syntax_valid: true,
          has_mx: false,
          mailbox_reachable: false,
          catch_all: false,
          reason: mx_result.success ? 'No MX records found' : 'DNS resolution failed',
          error: null
        };

      }

      // Attempt SMTP mailbox probe
      const max_attempts = Math.min(CONFIG.SMTP_MAX_MX_ATTEMPTS, mx_result.mx_records.length);
      let mailbox_reachable = false;
      let catch_all = false;
      let reason = 'All MX hosts failed to respond';
      let greylisted = false;

      for (let i = 0; i < max_attempts; i++) {

        const mx_host = mx_result.mx_records[i].exchange;

        // Probe one MX host
        const probe_result = await _ValidateEmail.smtpProbe(mx_host, email, domain, CONFIG.SMTP_TIMEOUT_MS);

        // Check for definitive result
        if (probe_result.success && probe_result.reachable !== null) {
          mailbox_reachable = probe_result.reachable;
          reason = probe_result.reason;

          // Determine catch-all status when mailbox is reachable
          if (probe_result.reachable && CONFIG.CHECK_CATCH_ALL) {

            // Probe with a random address to detect catch-all domains
            const catch_all_result = await _ValidateEmail.smtpProbe(
              mx_host,
              CONFIG.CATCH_ALL_TEST_PREFIX + crypto.randomUUID() + '@' + domain,
              domain,
              CONFIG.SMTP_TIMEOUT_MS
            );

            catch_all = catch_all_result.success && catch_all_result.reachable === true;

          }

          break;
        }

        // Track greylisting (4xx) across MX hosts
        if (probe_result.reason && probe_result.reason.indexOf('Greylisted') >= 0) {
          greylisted = true;
        }

      }

      // Return composite result
      Lib.Debug.performanceAuditLog('End', 'ValidateEmail checkEmailDeliverability', start_ms);

      // Return greylisted envelope when 4xx was encountered
      if (greylisted && !mailbox_reachable) {
        return {
          success: true,
          syntax_valid: true,
          has_mx: true,
          mailbox_reachable: null,
          catch_all: false,
          reason: 'Greylisted (4xx transient failure)',
          error: null
        };
      }

      // Return composite deliverability envelope
      return {
        success: true,
        syntax_valid: true,
        has_mx: true,
        mailbox_reachable: mailbox_reachable,
        catch_all: catch_all,
        reason: reason,
        error: null
      };

    }

  };///////////////////////////Public Functions END//////////////////////////////



  //////////////////////////Private Functions START//////////////////////////////
  const _ValidateEmail = {

    /********************************************************************
    Resolve MX records for a domain with A/AAAA fallback per RFC 5321.
    Handles null MX (RFC 7505) where priority 0 and exchange "." means
    the domain does not accept email.

    @param {String} domain - Domain name to resolve

    @return {Promise<Object>} - { success, mx_records, error }
    *********************************************************************/
    resolveMx: async function (domain) {

      // Use a custom DNS resolver when DNS_SERVERS is configured
      const resolver = _ValidateEmail.getDnsResolver();

      try {

        // Attempt MX record resolution
        const records = await resolver.resolveMx(domain);

        // Check for null MX (RFC 7505: priority 0, exchange ".")
        const null_mx = records.find(function (record) {
          return record.priority === 0 && record.exchange === '.';
        });

        if (null_mx) {
          return {
            success: true,
            mx_records: [],
            error: null
          };
        }

        // Sort by priority (lower number = higher priority)
        records.sort(function (a, b) {
          return a.priority - b.priority;
        });

        return {
          success: true,
          mx_records: records,
          error: null
        };

      } catch (error) {

        // If MX resolution fails, try A/AAAA fallback per RFC 5321 section 5.1
        try {

          const a_records = await resolver.resolve4(domain);

          // A record fallback: synthesize MX record with the domain itself
          return {
            success: true,
            mx_records: [{ priority: 0, exchange: a_records[0] }],
            error: null
          };

        } catch (a_error) {

          // Both MX and A resolution failed
          Lib.Debug.debug('ValidateEmail resolveMx failed', {
            domain: domain,
            mx_error: error.message,
            a_error: a_error.message
          });

          return {
            success: false,
            mx_records: [],
            error: ERRORS.VALIDATE_EMAIL_DNS_FAILED
          };

        }

      }

    },


    /********************************************************************
    Return a DNS resolver. When DNS_SERVERS is configured, returns a
    custom resolver with those servers. Otherwise returns the global
    dns/promises API for backward compatibility.

    @return {Object} - DNS resolver with resolveMx and resolve4 methods
    *********************************************************************/
    getDnsResolver: function () {

      // Return custom resolver when DNS_SERVERS is configured
      if (!Lib.Utils.isNullOrUndefined(CONFIG.DNS_SERVERS) && Array.isArray(CONFIG.DNS_SERVERS)) {

        const custom_resolver = new dnsSync.Resolver();

        custom_resolver.setServers(CONFIG.DNS_SERVERS);

        return custom_resolver;

      }

      // Return the global dns/promises API as default
      return dns;

    },


    /********************************************************************
    Connect to an MX host and run an SMTP RCPT TO probe to check
    whether a mailbox is reachable. Handles 4xx greylisting with
    optional retry when GREYLIST_RETRY_MS is configured.

    @param {String} mx_host - MX server hostname
    @param {String} email - Email address to probe
    @param {String} domain - Domain part of the email (for EHLO FQDN)
    @param {Integer} timeout_ms - Connection and response timeout

    @return {Promise<Object>} - { success, reachable, reason, error }
    *********************************************************************/
    smtpProbe: async function (mx_host, email, domain, timeout_ms) {

      // First probe attempt
      const result = await _ValidateEmail._smtpProbeOnce(mx_host, email, domain, timeout_ms);

      // Return immediately if not a 4xx greylisting response
      if (!result.greylisted) {
        return result;
      }

      // If greylisting retry is configured, wait and retry once
      if (CONFIG.GREYLIST_RETRY_MS > 0) {

        // Wait for the configured retry delay
        await new Promise(function (resolve) {
          setTimeout(resolve, CONFIG.GREYLIST_RETRY_MS);
        });

        // Retry the probe
        const retry_result = await _ValidateEmail._smtpProbeOnce(mx_host, email, domain, timeout_ms);

        // Return retry result if it is not still greylisted
        if (!retry_result.greylisted) {
          return retry_result;
        }

      }

      // Return greylisted verdict (reachable: null, 'unknown')
      return {
        success: true,
        reachable: null,
        reason: 'Greylisted (4xx transient failure)',
        error: null
      };

    },


    /********************************************************************
    Single SMTP probe attempt. Opens a TCP connection to the MX host
    and runs the EHLO / MAIL FROM / RCPT TO / QUIT sequence.

    @param {String} mx_host - MX server hostname
    @param {String} email - Email address to probe
    @param {String} domain - Domain part of the email (for EHLO FQDN)
    @param {Integer} timeout_ms - Connection and response timeout

    @return {Promise<Object>} - { success, reachable, reason, error, greylisted }
    *********************************************************************/
    _smtpProbeOnce: function (mx_host, email, domain, timeout_ms) {

      return new Promise(function (resolve) {

        // Build SMTP commands
        const commands = _ValidateEmail.buildSmtpCommands(email, domain);

        const socket = net.createConnection({
          host: mx_host,
          port: 25,
          timeout: timeout_ms
        });

        let state = 'connecting';
        let smtp_response = '';

        // Handle connection timeout
        socket.setTimeout(timeout_ms);

        socket.on('timeout', function () {

          socket.destroy();

          resolve({
            success: false,
            reachable: null,
            reason: 'Connection timed out',
            error: ERRORS.VALIDATE_EMAIL_SMTP_TIMEOUT,
            greylisted: false
          });

        });

        // Handle connection errors
        socket.on('error', function (error) {

          resolve({
            success: false,
            reachable: null,
            reason: 'Connection failed: ' + error.message,
            error: ERRORS.VALIDATE_EMAIL_SMTP_CONNECT_FAILED,
            greylisted: false
          });

        });

        // Process SMTP responses
        socket.on('data', function (data) {

          smtp_response += data.toString();

          // Wait for complete response line (ends with CRLF)
          if (!smtp_response.endsWith('\r\n')) {
            return;
          }

          const response_code = parseInt(smtp_response.substring(0, 3), 10);
          smtp_response = '';

          // State machine: process SMTP handshake
          if (state === 'connecting') {

            // Expect 220 greeting from server
            if (response_code === 220) {
              state = 'ehlo';
              socket.write(commands.ehlo);
            } else {
              socket.destroy();
              resolve({
                success: false,
                reachable: null,
                reason: 'Unexpected greeting: ' + response_code,
                error: ERRORS.VALIDATE_EMAIL_SMTP_PROTOCOL_ERROR,
                greylisted: false
              });
            }

          } else if (state === 'ehlo') {

            // Expect 250 response to EHLO
            if (response_code === 250) {
              state = 'mail_from';
              socket.write(commands.mail_from);
            } else {
              socket.destroy();
              resolve({
                success: false,
                reachable: null,
                reason: 'EHLO rejected: ' + response_code,
                error: ERRORS.VALIDATE_EMAIL_SMTP_PROTOCOL_ERROR,
                greylisted: false
              });
            }

          } else if (state === 'mail_from') {

            // Expect 250 response to MAIL FROM
            if (response_code === 250) {
              state = 'rcpt_to';
              socket.write(commands.rcpt_to);
            } else {
              socket.destroy();
              resolve({
                success: false,
                reachable: null,
                reason: 'MAIL FROM rejected: ' + response_code,
                error: ERRORS.VALIDATE_EMAIL_SMTP_PROTOCOL_ERROR,
                greylisted: false
              });
            }

          } else if (state === 'rcpt_to') {

            // RCPT TO response determines mailbox reachability
            socket.write(commands.quit);
            socket.destroy();

            if (response_code === 250 || response_code === 251) {
              resolve({
                success: true,
                reachable: true,
                reason: 'Mailbox accepted (SMTP ' + response_code + ')',
                error: null,
                greylisted: false
              });
            } else if (response_code >= 550 && response_code <= 553) {
              resolve({
                success: true,
                reachable: false,
                reason: 'Mailbox rejected (SMTP ' + response_code + ')',
                error: null,
                greylisted: false
              });
            } else if (response_code >= 400 && response_code < 500) {

              // 4xx = greylisting (temporary failure)
              resolve({
                success: false,
                reachable: null,
                reason: 'Greylisted (SMTP ' + response_code + ')',
                error: null,
                greylisted: true
              });
            } else {
              resolve({
                success: false,
                reachable: null,
                reason: 'Unexpected response (SMTP ' + response_code + ')',
                error: ERRORS.VALIDATE_EMAIL_SMTP_PROTOCOL_ERROR,
                greylisted: false
              });
            }

          }

        });

      });

    },


    /********************************************************************
    Build SMTP command strings from an email address and domain.

    @param {String} email - Email address for the RCPT TO command
    @param {String} domain - Domain part of the email (for EHLO FQDN fallback)

    @return {Object} - { ehlo, mail_from, rcpt_to, quit }
    *********************************************************************/
    buildSmtpCommands: function (email, domain) {

      // Use configured EHLO_FQDN, or fall back to the email domain
      const ehlo_fqdn = (!Lib.Utils.isNullOrUndefined(CONFIG.EHLO_FQDN) && !Lib.Utils.isEmptyString(CONFIG.EHLO_FQDN))
        ? CONFIG.EHLO_FQDN
        : domain;

      return {
        ehlo: 'EHLO ' + ehlo_fqdn + '\r\n',
        mail_from: 'MAIL FROM:<' + CONFIG.SMTP_FROM_ADDRESS + '>\r\n',
        rcpt_to: 'RCPT TO:<' + email + '>\r\n',
        quit: 'QUIT\r\n'
      };

    },


    /********************************************************************
    Check basic email syntax. A simple RFC 5321-compatible check:
    local-part@domain. Not a full RFC 5322 parser - the existing
    contact-email module handles full syntax validation.

    @param {String} email - Email address to check

    @return {Boolean} - true if syntax is valid
    *********************************************************************/
    checkSyntax: function (email) {

      // Check for exactly one @ symbol
      const at_index = email.indexOf('@');
      if (at_index < 1 || at_index === email.length - 1) {
        return false;
      }

      // Check for a dot in the domain part
      const domain = email.substring(at_index + 1);
      if (domain.indexOf('.') < 0) {
        return false;
      }

      // Check for spaces
      if (email.indexOf(' ') >= 0) {
        return false;
      }

      return true;

    }

  };//////////////////////////Private Functions END//////////////////////////////



  // Return public interface
  return ValidateEmail;

};/////////////////////////// createInterface END //////////////////////////////
