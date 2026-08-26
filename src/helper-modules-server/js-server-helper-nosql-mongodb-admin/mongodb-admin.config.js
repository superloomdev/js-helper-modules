// Info: Default configuration for js-server-helper-nosql-mongodb-admin.
// Pure defaults - the loader merges overrides on top of this. No process.env access here.
export default {

  // ---- Connection ----
  // MongoDB connection string for admin-role user. Must have dbAdmin or root role.
  // Override with Atlas URI or replica-set string in production.
  CONNECTION_STRING: 'mongodb://localhost:27018',

  // Database name to select after connecting.
  DATABASE_NAME: 'test',

  // How long the driver waits to connect before failing.
  // Lower for fast-fail in serverless; higher for cross-region.
  CONNECT_TIMEOUT_MS: 5000

};
