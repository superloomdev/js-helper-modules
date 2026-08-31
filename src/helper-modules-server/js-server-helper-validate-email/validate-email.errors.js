/**
 * Error catalog for helper-validate-email.
 * Frozen to prevent accidental mutation.
 */

export default Object.freeze({

  VALIDATE_EMAIL_INVALID_DOMAIN: Object.freeze({
    type: 'VALIDATE_EMAIL_INVALID_DOMAIN',
    message: 'Domain is empty or not a valid domain string'
  }),

  VALIDATE_EMAIL_INVALID_EMAIL: Object.freeze({
    type: 'VALIDATE_EMAIL_INVALID_EMAIL',
    message: 'Email address is empty or not a valid email string'
  }),

  VALIDATE_EMAIL_DNS_FAILED: Object.freeze({
    type: 'VALIDATE_EMAIL_DNS_FAILED',
    message: 'DNS resolution failed for domain'
  }),

  VALIDATE_EMAIL_NO_MX: Object.freeze({
    type: 'VALIDATE_EMAIL_NO_MX',
    message: 'No MX records found and no A/AAAA fallback for domain'
  }),

  VALIDATE_EMAIL_SMTP_CONNECT_FAILED: Object.freeze({
    type: 'VALIDATE_EMAIL_SMTP_CONNECT_FAILED',
    message: 'Could not connect to any MX server'
  }),

  VALIDATE_EMAIL_SMTP_TIMEOUT: Object.freeze({
    type: 'VALIDATE_EMAIL_SMTP_TIMEOUT',
    message: 'SMTP probe timed out'
  }),

  VALIDATE_EMAIL_SMTP_PROTOCOL_ERROR: Object.freeze({
    type: 'VALIDATE_EMAIL_SMTP_PROTOCOL_ERROR',
    message: 'Unexpected SMTP response during verification'
  })

});
