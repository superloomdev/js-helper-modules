// Info: Default configuration for js-server-helper-nosql-aws-dynamodb-admin.
// Pure defaults - the loader merges overrides on top of this. No process.env access here.
'use strict';


module.exports = {

  // ---- AWS Region ----
  // Region where the DynamoDB table lives (or us-east-1 for DynamoDB Local).
  AWS_REGION: 'us-east-1',

  // ---- AWS Credentials ----
  // Elevated IAM credentials with dynamodb:CreateTable, DeleteTable,
  // UpdateTimeToLive, DescribeTable, ListTables permissions.
  // Distinct from the data-plane module's read/write credentials.
  AWS_ACCESS_KEY_ID: undefined,

  AWS_SECRET_ACCESS_KEY: undefined,

  // ---- Custom Endpoint ----
  // Set to 'http://localhost:8001' for DynamoDB Local testing.
  // Leave undefined for real AWS DynamoDB.
  ENDPOINT: undefined,

  // ---- Connection ----
  // How long to wait for table to reach ACTIVE state (seconds).
  WAIT_TIMEOUT_SECONDS: 60

};
