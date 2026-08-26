// Info: Test loader for js-server-helper-nosql-aws-dynamodb-admin
// Mirrors the main project loader pattern: loads dependencies, merges config from environment
// Same loader works for both emulated (dev) and integration testing - env vars control the target
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import instanceLoader from 'helper-instance';
import dynamodbAdminLoader from 'helper-nosql-aws-dynamodb-admin';


/********************************************************************
Load all test dependencies, build Lib container from environment.

process.env is ONLY read here - nowhere else in test code.

Config = test-wide environment values, available to test.js for any purpose
(e.g., AdminClient setup, assertions, debugging). Independent of any module.
config_dynamodb_admin = module-specific config slice, only passed to the admin module.

Returns a default Lib configured as a persistent deployment
(CLOSE_ON_CLEANUP false), plus a builder so a test can construct a
fresh Lib configured as a serverless deployment (CLOSE_ON_CLEANUP
true). Each builder call returns an independent Lib with its own
Instance process cleanup queue and its own DynamoDBAdmin driver state.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug, DynamoDBAdmin)
@return {Object} result.Config - Test-wide environment values for test infrastructure
@return {Object} result.instance - Default request instance
@return {Function} result.buildLib - (instance_config) => { Lib, instance }
*********************************************************************/
export default function loader () {

  // Test-wide environment config - available to test.js for test infrastructure
  // This is NOT a module config. It holds raw env values that test.js may need
  // (e.g., AdminClient credentials, endpoint for table setup/teardown)
  const Config = {
    aws_region: process.env.AWS_REGION,
    aws_access_key_id: process.env.AWS_ACCESS_KEY_ID,
    aws_secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
    dynamodb_endpoint: process.env.DYNAMODB_ADMIN_ENDPOINT
  };

  // Sub-configs: each helper module receives ONLY its relevant config slice
  // process.env is ONLY read here - nowhere else in test code
  const config_dynamodb_admin = {
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    ENDPOINT: process.env.DYNAMODB_ADMIN_ENDPOINT
  };


  // Build a Lib container with a chosen Instance config. Each call
  // produces an independent Instance module (own process cleanup queue)
  // and an independent DynamoDBAdmin driver (own client state).
  const buildLib = function (instance_config) {

    const Lib = {};

    // Helper modules
    Lib.Utils = utilsLoader(Lib, {});
    Lib.Debug = debugLoader(Lib, {});
    Lib.Instance = instanceLoader(Lib, instance_config);

    // Server helper modules
    Lib.DynamoDBAdmin = dynamodbAdminLoader(Lib, config_dynamodb_admin);

    const instance = Lib.Instance.initialize();

    return { Lib, instance };
  };


  // Default: persistent deployment. Process-scoped teardown waits for
  // an explicit runProcessCleanup() call.
  const { Lib, instance } = buildLib({ CLOSE_ON_CLEANUP: false });


  // Return runtime objects
  return { Lib, Config, instance, buildLib };

};
