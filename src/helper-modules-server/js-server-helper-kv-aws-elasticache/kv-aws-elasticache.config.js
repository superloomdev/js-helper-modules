// Info: Default configuration for js-server-helper-kv-aws-elasticache.
// Extends kv-valkey config with AWS IAM auth settings. No process.env access here.
'use strict';


module.exports = {

  // ---- ElastiCache Connection (passed through to kv-valkey) ----
  HOST: 'localhost',
  PORT: 6379,
  DB: 0,
  TLS: true,
  TLS_CONFIG: undefined,

  // ---- Isolation ----
  KEY_PREFIX: '',

  // ---- Serialization ----
  SERIALIZE_JSON: true,

  // ---- Scan ----
  SCAN_PAGE_SIZE: 100,

  // ---- Timeouts ----
  CONNECT_TIMEOUT_MS: 5000,
  COMMAND_TIMEOUT_MS: 3000,

  // ---- AWS IAM Auth ----
  // AWS region for SigV4 signing
  AWS_REGION: 'us-east-1',

  // AWS access key ID (explicit credentials, matching nosql-aws-dynamodb pattern)
  AWS_KEY: undefined,

  // AWS secret access key
  AWS_SECRET: undefined,

  // ElastiCache user ID (must match the ACL username configured in ElastiCache)
  IAM_USER_ID: undefined,

  // ElastiCache cluster or replication group name (used in the SigV4 signing host)
  CACHE_NAME: undefined,

  // Refresh the IAM token this many seconds before it expires (max token TTL is 900s)
  TOKEN_REFRESH_MARGIN_SECONDS: 60

};
