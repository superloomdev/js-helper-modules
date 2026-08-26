// Info: Default configuration for js-server-helper-kv-valkey.
// Pure defaults - the loader merges overrides on top of this. No process.env access here.
export default {

  // ---- Connection ----
  // Valkey/Redis server hostname. Override for ElastiCache or remote servers.
  HOST: 'localhost',

  // Valkey/Redis server port.
  PORT: 6379,

  // AUTH password. Also used for ElastiCache AUTH tokens.
  PASSWORD: undefined,

  // Valkey/Redis 6+ ACL username. Omit for pre-ACL servers.
  USERNAME: undefined,

  // ---- Isolation ----
  // Key prefix applied to every key on write and stripped on read.
  // The recommended multi-application isolation mechanism (see docs/configuration.md).
  KEY_PREFIX: '',

  // Logical database (0-15 on a default server). Functional but prefer KEY_PREFIX
  // for application isolation (see docs/configuration.md for the three reasons).
  DB: 0,

  // ---- TLS ----
  // Enable TLS. Required for ElastiCache in-transit encryption.
  TLS: false,

  // Additional TLS options passed to the ioredis tls constructor option.
  TLS_CONFIG: undefined,

  // ---- Timeouts ----
  // Connection timeout in milliseconds.
  CONNECT_TIMEOUT_MS: 5000,

  // Command timeout in milliseconds.
  COMMAND_TIMEOUT_MS: 3000,

  // ---- Serialization ----
  // When true, set runs JSON.stringify and get runs JSON.parse.
  // When false, values pass through as strings or Buffers untouched.
  SERIALIZE_JSON: true,

  // ---- Scan ----
  // COUNT hint for SCAN operations. Controls page size, not result size.
  SCAN_PAGE_SIZE: 100

};
