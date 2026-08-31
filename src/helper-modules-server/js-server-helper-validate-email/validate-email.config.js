// Info: Configuration file for helper-validate-email


export default {

  // SMTP probe timeout in milliseconds (connect + per-command response)
  SMTP_TIMEOUT_MS: 5000,

  // MAIL FROM address used for SMTP RCPT TO probes
  SMTP_FROM_ADDRESS: 'verify@superloom.dev',

  // Maximum number of MX hosts to try before giving up
  SMTP_MAX_MX_ATTEMPTS: 3,

  // DNS resolution timeout in milliseconds
  DNS_TIMEOUT_MS: 3000,

  // Whether to probe for catch-all domains after a successful RCPT TO.
  // When true, sends a second RCPT TO with a random address to detect
  // domains that accept all addresses regardless of mailbox existence.
  CHECK_CATCH_ALL: true,

  // Prefix for the random catch-all probe address. The full address is
  // this prefix plus a random UUID plus the domain being tested.
  CATCH_ALL_TEST_PREFIX: 'zzz-probe-',

  // Greylisting retry delay in milliseconds. When 0 (default), a 4xx
  // response returns an 'unknown' verdict (reachable: null). When set
  // to a positive number, the probe retries once after this delay.
  GREYLIST_RETRY_MS: 0,

  // EHLO FQDN sent in the SMTP greeting. When null, the module derives
  // the FQDN from the domain part of SMTP_FROM_ADDRESS. Some SMTP
  // servers reject bare or non-resolvable hostnames in EHLO.
  EHLO_FQDN: null,

  // Custom DNS servers for MX/A record resolution. When null, uses the
  // system default resolvers. When set, must be an array of IP strings.
  DNS_SERVERS: null

};
