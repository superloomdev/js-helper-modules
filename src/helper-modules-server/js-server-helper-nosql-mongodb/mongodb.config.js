// Info: Default configuration for js-server-helper-nosql-mongodb.
// Pure defaults - the loader merges overrides on top of this. No process.env access here.
'use strict';


module.exports = {

  // ---- Connection ----
  // MongoDB connection string. Override with Atlas URI or replica-set string in production.
  CONNECTION_STRING: 'mongodb://localhost:27017',

  // Database name to select after connecting.
  DATABASE_NAME: 'test',

  // ---- Pool ----
  // Maximum number of connections in the driver pool.
  // Serverless: 1-3. Persistent: 10-20. Atlas: stay under cluster limit x 0.8.
  MAX_POOL_SIZE: 10,

  // How long the driver waits to select a server before failing.
  // Lower for fast-fail in serverless; higher for cross-region.
  SERVER_SELECTION_TIMEOUT: 5000

};
