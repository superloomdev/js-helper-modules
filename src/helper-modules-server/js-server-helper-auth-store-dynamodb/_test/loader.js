// Info: Test loader for helper-auth-store-dynamodb.
// Builds the Lib container so both Tier 1 (adapter unit tests, no auth.js)
// and Tier 3 (full auth lifecycle via the store contract suite) can share
// the same runtime objects.
//
// DynamoDB connection settings are read exclusively from environment
// variables here - test.js never reads process.env directly.


/********************************************************************
Build the dependency container.

process.env is ONLY read here - never in test.js.

@return {Object} result
@return {Object} result.Lib    - { Utils, Debug, Crypto, Instance, DynamoDB }
*********************************************************************/
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import cryptoLoader from 'helper-crypto';
import instanceLoader from 'helper-instance';
import nosqlAwsDynamodbLoader from 'helper-nosql-aws-dynamodb';
export default function loader () {

  const config_debug = { LOG_LEVEL: 'error' };

  const config_dynamodb = {
    ENDPOINT: process.env.DYNAMO_ENDPOINT || 'http://127.0.0.1:8001',
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
  Lib.HttpGateway = {
    buildCookie: function (existing, name, value, ttl) {
      const descriptor = existing ? Object.assign({}, existing) : {};
      descriptor[name] = { value: value, ttl: ttl, options: {} };
      return descriptor;
    }
  };
  Lib.DynamoDB = nosqlAwsDynamodbLoader(Lib, config_dynamodb);


  return { Lib: Lib };

};
