/**
 * Error catalog for helper-email-adapter-smtp.
 * Frozen to prevent accidental mutation.
 */

export default Object.freeze({

  EMAIL_ADAPTER_SMTP_SEND_FAILED: Object.freeze({
    type: 'EMAIL_ADAPTER_SMTP_SEND_FAILED',
    message: 'Failed to send email via SMTP transport'
  }),

  EMAIL_ADAPTER_SMTP_CONFIG_INVALID: Object.freeze({
    type: 'EMAIL_ADAPTER_SMTP_CONFIG_INVALID',
    message: 'SMTP adapter configuration is invalid'
  }),

  ATTACHMENT_TOO_LARGE: Object.freeze({
    type: 'ATTACHMENT_TOO_LARGE',
    message: 'Attachment size exceeds the configured limit'
  })

});
