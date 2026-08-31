/**
 * Error catalog for helper-email.
 * Frozen to prevent accidental mutation.
 */

export default Object.freeze({

  EMAIL_ADAPTER_MISSING: Object.freeze({
    type: 'EMAIL_ADAPTER_MISSING',
    message: 'Adapter is required and must be a ready-to-use object'
  }),

  EMAIL_ADAPTER_CONTRACT: Object.freeze({
    type: 'EMAIL_ADAPTER_CONTRACT',
    message: 'Adapter does not implement the required send method'
  }),

  EMAIL_MESSAGE_INVALID: Object.freeze({
    type: 'EMAIL_MESSAGE_INVALID',
    message: 'Email message is missing required fields'
  }),

  EMAIL_RECIPIENTS_EMPTY: Object.freeze({
    type: 'EMAIL_RECIPIENTS_EMPTY',
    message: 'At least one recipient (to, cc, or bcc) is required'
  }),

  EMAIL_SUBJECT_EMPTY: Object.freeze({
    type: 'EMAIL_SUBJECT_EMPTY',
    message: 'Subject is required'
  }),

  EMAIL_BODY_EMPTY: Object.freeze({
    type: 'EMAIL_BODY_EMPTY',
    message: 'At least one body (text or html) is required'
  }),

  EMAIL_SEND_FAILED: Object.freeze({
    type: 'EMAIL_SEND_FAILED',
    message: 'Failed to send email'
  }),

  EMAIL_INVALID_TOKEN: Object.freeze({
    type: 'EMAIL_INVALID_TOKEN',
    message: 'Unsubscribe token is invalid or signature does not match'
  })

});
