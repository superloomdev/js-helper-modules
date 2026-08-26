// Info: Configuration file for helper-contact-email


export default {

  // Characters stripped from sanitized email input
  // Strips everything except letters, digits, @, ., +, -, _
  EMAIL_SANITIZE_REGEX: /[^a-zA-Z0-9@.+_-]/g,

  // Maximum length for a full email address (per RFC 5321)
  EMAIL_MAX_LENGTH: 254,

  // Maximum length for the local part (per RFC 5321)
  LOCAL_MAX_LENGTH: 64,

  // Maximum length for the domain part (per RFC 5321)
  DOMAIN_MAX_LENGTH: 255

};
