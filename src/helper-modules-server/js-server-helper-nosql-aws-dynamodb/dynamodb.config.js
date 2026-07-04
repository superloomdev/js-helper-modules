// Info: Default configuration for js-server-helper-nosql-aws-dynamodb.
// Pure defaults - the loader merges overrides on top of this. No process.env access here.
'use strict';


module.exports = {

  // AWS Region
  REGION: 'us-east-1',

  // AWS Credentials (injected via loader from environment)
  KEY: undefined,
  SECRET: undefined,

  // Custom endpoint for DynamoDB Local (e.g., 'http://localhost:8000')
  // Leave undefined for real AWS DynamoDB
  ENDPOINT: undefined,

  // Maximum retry attempts for failed requests
  MAX_RETRIES: 3,

  // Marshall options for DynamoDBDocumentClient
  // removeUndefinedValues prevents errors when item contains undefined values
  REMOVE_UNDEFINED_VALUES: true

};
