// Info: Configuration file for helper-email-adapter-smtp


export default {

  // SMTP server hostname (required)
  SMTP_HOST: null,

  // SMTP server port (required; typically 587 for STARTTLS, 465 for SSL)
  SMTP_PORT: 587,

  // Use SSL/TLS directly (port 465). When false, STARTTLS is used (port 587)
  SMTP_SECURE: false,

  // SMTP authentication credentials (optional for open relays)
  SMTP_USER: null,
  SMTP_PASS: null,

  // DKIM signing (optional). When all three keys are provided, Nodemailer
  // signs outgoing emails with DKIM. Required for RFC 8058 one-click
  // unsubscribe compliance (List-Unsubscribe headers must be DKIM-signed).
  SMTP_DKIM_DOMAIN: null,
  SMTP_DKIM_SELECTOR: null,
  SMTP_DKIM_PRIVATE_KEY: null,

  // Attachment size limits in megabytes. 0 means no limit.
  // The SMTP server enforces its own limits; these are pre-send validation
  // to fail fast before consuming bandwidth.
  SMTP_MAX_ATTACHMENT_SIZE_MB: 0,
  SMTP_MAX_TOTAL_ATTACHMENT_SIZE_MB: 0

};
