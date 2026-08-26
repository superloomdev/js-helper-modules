// Info: Default configuration for js-server-helper-kv-aws-elasticache.
// Standalone module - does not depend on kv-valkey. Uses ioredis directly
// with AWS SDK v3 SigV4 signing for IAM authentication.
// No process.env access here.
export default {

  // ---- ElastiCache Connection ----
  // ElastiCache primary endpoint hostname.
  HOST: 'localhost',

  // ElastiCache endpoint port.
  PORT: 6379,

  // Logical database (0-15 on a default server).
  DB: 0,

  // ---- TLS ----
  // Enable TLS. Required for ElastiCache in-transit encryption.
  TLS: true,

  // Additional TLS options passed to the ioredis tls constructor option.
  TLS_CONFIG: undefined,

  // ---- AWS Credentials ----
  // AWS region. Required for SigV4 token signing.
  REGION: 'us-east-1',

  // AWS access key ID. Explicit credentials, matching nosql-aws-dynamodb pattern.
  KEY: undefined,

  // AWS secret access key.
  SECRET: undefined,

  // Custom endpoint for local testing (e.g. http://localhost:6379).
  // When set, IAM token generation is skipped and a plain ioredis connection is used.
  ENDPOINT: undefined,

  // ---- IAM Auth ----
  // ElastiCache user ID with IAM authentication mode.
  // Must match the ACL username configured in ElastiCache.
  // When set, the module generates SigV4 tokens and injects them as the ioredis password.
  IAM_USER_ID: undefined,

  // ElastiCache cluster or replication group name.
  // Used as the hostname in the SigV4 signing request.
  // Required when IAM_USER_ID is set.
  CACHE_NAME: undefined,

  // Whether the cache is a serverless cache. When true, adds ResourceType=ServerlessCache
  // to the SigV4 signing query.
  SERVERLESS: false,

  // Refresh the IAM token this many seconds before it expires.
  // Max token TTL is 900 seconds (15 minutes) per AWS.
  TOKEN_REFRESH_MARGIN_SECONDS: 60,

  // ---- Isolation ----
  // Key prefix applied to every key on write and stripped on read.
  KEY_PREFIX: '',

  // ---- Serialization ----
  // When true, set runs JSON.stringify and get runs JSON.parse.
  SERIALIZE_JSON: true,

  // ---- Scan ----
  // COUNT hint for SCAN operations. Controls page size, not result size.
  SCAN_PAGE_SIZE: 100,

  // ---- Timeouts ----
  // Connection timeout in milliseconds.
  CONNECT_TIMEOUT_MS: 5000,

  // Command timeout in milliseconds.
  COMMAND_TIMEOUT_MS: 3000

};
