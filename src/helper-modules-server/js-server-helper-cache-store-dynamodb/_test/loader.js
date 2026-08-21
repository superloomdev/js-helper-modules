// Info: Test loader for js-server-helper-cache-store-dynamodb.
// Mirrors the main project loader pattern: reads environment variables,
// builds Lib container, returns { Lib, Config }. Same loader works for
// both emulated (Docker DynamoDB Local) and integration (real AWS) testing.
'use strict';


/********************************************************************
Load all test dependencies and build the Lib container from environment.

process.env is ONLY read here - never in test.js.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug, Instance, DynamoDB)
@return {Object} result.Config - Test-wide environment values
*********************************************************************/
module.exports = function loader () {

  // Test-wide environment config
  const Config = {
    dynamodb_endpoint: process.env.DYNAMO_ENDPOINT || 'http://127.0.0.1:8002',
    aws_region: process.env.AWS_REGION || 'us-east-1',
    aws_access_key_id: process.env.AWS_ACCESS_KEY_ID || 'local',
    aws_secret_access_key: process.env.AWS_SECRET_ACCESS_KEY || 'local'
  };

  // Sub-configs: each helper module receives ONLY its relevant slice
  const config_dynamodb = {
    ENDPOINT: Config.dynamodb_endpoint,
    REGION: Config.aws_region,
    KEY: Config.aws_access_key_id,
    SECRET: Config.aws_secret_access_key
  };


  // Dependencies for this instance
  const Lib = {};

  // Helper modules
  Lib.Utils = require('helper-utils')(Lib, {});
  Lib.Debug = require('helper-debug')(Lib, {});
  Lib.Instance = require('helper-instance')(Lib, {});

  // Server helper modules
  Lib.DynamoDB = require('helper-nosql-aws-dynamodb')(Lib, config_dynamodb);


  // Return runtime objects
  return { Lib, Config };

};
