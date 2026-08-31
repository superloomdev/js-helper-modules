// Info: Configuration file for helper-email


export default {

  // Required: ready-to-use transport adapter object (Class F)
  Adapter: null,

  // Optional: default sender address if message.from is omitted
  DEFAULT_FROM: null,

  // Default message type: 'transactional' or 'promotional'
  DEFAULT_MESSAGE_TYPE: 'transactional',

  // Required for signUnsubscribeToken and verifyUnsubscribeToken:
  // HMAC-SHA256 secret used to sign and verify unsubscribe tokens.
  // When null, sign/verify functions throw TypeError on call.
  UNSUBSCRIBE_SECRET: null

};
