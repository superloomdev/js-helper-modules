// Info: Test loader for helper-logger-store-mongodb.
// Builds the Lib container so both Tier 1 (adapter unit tests, no
// logger.js dependency) and Tier 3 (full logger lifecycle via the store
// contract suite) can share the same runtime objects.
//
// MongoDB connection settings are read exclusively from environment
// variables here - test.js never reads process.env directly.
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import cryptoLoader from 'helper-crypto';
import instanceLoader from 'helper-instance';
import nosqlMongodbLoader from 'helper-nosql-mongodb';

/********************************************************************
Build the dependency container.

process.env is ONLY read here - never in test.js.

@return {Object} result
@return {Object} result.Lib - { Utils, Debug, Crypto, Instance, MongoDB }
*********************************************************************/
export default function loader () {

  const config_debug = { LOG_LEVEL: 'error' };

  const config_mongodb = {
    CONNECTION_STRING:        process.env.MONGO_URL      || 'mongodb://127.0.0.1:27020/?directConnection=true',
    DATABASE_NAME:            process.env.MONGO_DATABASE || 'test_db',
    MAX_POOL_SIZE:            5,
    SERVER_SELECTION_TIMEOUT: 5000
  };


  // ==================== DEPENDENCY CONTAINER ======================= //

  const Lib = {};


  // ==================== FOUNDATION MODULES ========================= //

  Lib.Utils = utilsLoader(Lib, {});
  Lib.Debug = debugLoader(Lib, config_debug);


  // ==================== SERVER HELPER MODULES ====================== //

  Lib.Crypto = cryptoLoader(Lib, {});
  Lib.Instance = instanceLoader(Lib, {});
  Lib.MongoDB = nosqlMongodbLoader(Lib, config_mongodb);


  return { Lib: Lib };

};
