// Info: Test loader for helper-logger-store-dynamodb.
// Builds the Lib container so both Tier 1 (adapter unit tests, no
// logger.js) and Tier 3 (full logger lifecycle via the store contract
// suite) can share the same runtime objects.
//
// DynamoDB connection settings are read exclusively from environment
// variables here - test.js never reads process.env directly.
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import cryptoLoader from 'helper-crypto';
import instanceLoader from 'helper-instance';
import nosqlAwsDynamodbLoader from 'helper-nosql-aws-dynamodb';

/********************************************************************
Build the dependency container.

process.env is ONLY read here - never in test.js.

@return {Object} result
@return {Object} result.Lib - { Utils, Debug, Crypto, Instance, DynamoDB }
*********************************************************************/
export default function loader () {

  const config_debug = { LOG_LEVEL: 'error' };

  const config_dynamodb = {
    ENDPOINT: process.env.DYNAMO_ENDPOINT || 'http://127.0.0.1:8002',
    REGION:   process.env.AWS_REGION      || 'us-east-1'
  };


  // ==================== DEPENDENCY CONTAINER ======================= //

  const Lib = {};


  // ==================== FOUNDATION MODULES ========================= //

  Lib.Utils = utilsLoader(Lib, {});
  Lib.Debug = debugLoader(Lib, config_debug);


  // ==================== SERVER HELPER MODULES ====================== //

  Lib.Crypto = cryptoLoader(Lib, {});
  Lib.Instance = instanceLoader(Lib, {});
  Lib.DynamoDB = nosqlAwsDynamodbLoader(Lib, config_dynamodb);


  return { Lib: Lib };

};
