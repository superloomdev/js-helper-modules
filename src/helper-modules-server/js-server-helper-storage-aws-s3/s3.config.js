// Info: Default configuration for js-server-helper-storage-aws-s3.
// Pure defaults - the loader merges overrides on top of this. No process.env access here.
'use strict';


module.exports = {

  // AWS Region
  REGION: 'us-east-1',

  // AWS Credentials (injected via loader from environment)
  KEY: undefined,
  SECRET: undefined,

  // Custom endpoint for S3-compatible emulators such as MinIO or LocalStack
  // (e.g., 'http://localhost:9000'). Leave undefined for real AWS S3.
  ENDPOINT: undefined,

  // Enable path-style addressing (http://host/bucket/key). Required for MinIO
  // and most self-hosted S3-compatible servers. AWS S3 uses virtual-hosted
  // style by default - leave false for real AWS.
  FORCE_PATH_STYLE: false,

  // Maximum retry attempts for failed requests
  MAX_RETRIES: 3

};
