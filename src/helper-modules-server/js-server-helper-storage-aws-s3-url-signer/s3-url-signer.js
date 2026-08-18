// Info: S3 presigned URL generator for direct browser uploads and downloads.
// Server-only: generates signed URLs for secure direct-to-S3 uploads.
//
// Compatibility: Node.js 24+.
//
// Factory pattern: each loader call returns an independent S3 URL signer
// interface with its own Lib, CONFIG, and per-instance S3Client.
//
// Lazy-loaded AWS SDK v3 adapters (stateless, shared across instances):
//   - '@aws-sdk/client-s3'           -> S3Client, PutObjectCommand, GetObjectCommand
//   - '@aws-sdk/s3-request-presigner' -> getSignedUrl
'use strict';

// Shared stateless SDK adapters (module-level - require() is cached anyway).
let S3Client,
  PutObjectCommand,
  GetObjectCommand,
  getSignedUrl;



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
Lib, CONFIG, and S3 URL signer client.

@param {Object} shared_libs - Lib container with Utils, Debug, Instance
@param {Object} config - Overrides merged over module config defaults

@return {Object} - Public interface for this module
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    Instance: shared_libs.Instance
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    require('./s3-url-signer.config'),
    config || {}
  );

  // Error catalog (frozen, owned by the main module)
  const ERRORS = require('./s3-url-signer.errors');

  // Validators singleton - Lib, ERRORS, and any static data injected here
  const Validators = require('./s3-url-signer.validators')(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Mutable per-instance state (S3Client lives here)
  const state = {
    client: null
  };

  return createInterface(Lib, CONFIG, ERRORS, Validators, state);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public interface for one instance. Public and private
functions close over the provided Lib, CONFIG, ERRORS, Validators,
and state.

@param {Object} Lib - Dependency container (Utils, Debug, Instance)
@param {Object} CONFIG - Merged configuration for this instance
@param {Object} ERRORS - Frozen error catalog for this module
@param {Object} Validators - Validators singleton (Lib + ERRORS injected)
@param {Object} state - Mutable state holder (S3Client reference)

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, state) {

  ///////////////////////////Public Functions START//////////////////////////////
  const S3UrlSigner = {

    /********************************************************************
    Generate a presigned PUT URL for uploading a file directly to S3.
    Uses HTTP PUT method for simple file uploads. The URL is valid for a limited time (default 15 minutes).

    @param {String} bucket - S3 bucket name
    @param {String} key - Object key (path/filename in S3)
    @param {String} contentType - MIME type of the file to be uploaded
    @param {Object} [options] - (Optional) Additional options
    @param {Integer} [options.expiresIn] - URL expiration time in seconds. Default: 900 (15 min)
    @param {Object} [options.metadata] - Custom metadata to attach to object

    @return {Promise<Object>} - { success, url, fields, error }
    * @return {Boolean} success - true on success
    * @return {String} url - Presigned URL for PUT upload (HTTP PUT method)
    * @return {Object} fields - Empty object for PUT uploads
    * @return {Object|null} error - Error details if failed
    *********************************************************************/
    generateUploadUrlPut: async function (bucket, key, contentType, options) {

      // Initialize AWS SDK client (lazy loading)
      _S3FileUpload.initSDK(Lib, CONFIG, state);

      // Ensure options object exists
      options = options || {};

      try {

        // Create S3 PUT command for presigned URL generation
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: contentType
        });

        // Generate presigned URL with configurable expiry
        const url = await getSignedUrl(state.client, command, {
          expiresIn: options.expiresIn || CONFIG.UPLOAD_URL_EXPIRY
        });

        Lib.Debug.debug('S3 PUT upload URL generated', { bucket: bucket, key: key });

        // Return successful response with empty fields for PUT uploads
        return {
          success: true,
          url: url,
          fields: {},
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('S3 PUT upload URL failed', {
          type: ERRORS.STORAGE_URL_GENERATION_FAILED.type,
          bucket: bucket,
          key: key,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          url: null,
          fields: null,
          error: ERRORS.STORAGE_URL_GENERATION_FAILED
        };

      }

    },


    /********************************************************************
    Generate a presigned GET URL for downloading a file directly from S3.
    The URL is valid for a limited time (default 1 hour).

    @param {String} bucket - S3 bucket name
    @param {String} key - Object key (path/filename in S3)
    @param {Object} [options] - (Optional) Additional options
    @param {Integer} [options.expiresIn] - URL expiration time in seconds. Default: 3600 (1 hour)
    @param {String} [options.responseContentDisposition] - Content-Disposition header override

    @return {Promise<Object>} - { success, url, error }
    * @return {Boolean} success - true on success
    * @return {String} url - Presigned URL for GET download
    * @return {Object|null} error - Error details if failed
    *********************************************************************/
    generateDownloadUrlGet: async function (bucket, key, options) {

      // Initialize AWS SDK client (lazy loading)
      _S3FileUpload.initSDK(Lib, CONFIG, state);

      // Ensure options object exists
      options = options || {};

      try {

        // Build S3 GET command parameters
        const commandParams = {
          Bucket: bucket,
          Key: key
        };

        // Add content disposition override if provided
        if (options.responseContentDisposition) {
          commandParams.ResponseContentDisposition = options.responseContentDisposition;
        }

        // Create S3 GET command for presigned URL generation
        const command = new GetObjectCommand(commandParams);

        // Generate presigned URL with configurable expiry
        const url = await getSignedUrl(state.client, command, {
          expiresIn: options.expiresIn || CONFIG.DOWNLOAD_URL_EXPIRY
        });

        Lib.Debug.debug('S3 download URL generated', { bucket: bucket, key: key });

        // Return successful response
        return {
          success: true,
          url: url,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('S3 download URL failed', {
          type: ERRORS.STORAGE_URL_GENERATION_FAILED.type,
          bucket: bucket,
          key: key,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          url: null,
          error: ERRORS.STORAGE_URL_GENERATION_FAILED
        };

      }

    },


    /********************************************************************
    Generate a presigned POST URL for uploading a file directly to S3.
    Uses HTTP POST method with form fields for multipart/form-data uploads.
    The URL is valid for a limited time (default 15 minutes).

    @param {String} bucket - S3 bucket name
    @param {String} key - Object key (path/filename in S3)
    @param {String} contentType - MIME type of the file to be uploaded
    @param {Object} [options] - (Optional) Additional options
    @param {Integer} [options.expiresIn] - URL expiration time in seconds. Default: 900 (15 min)
    @param {Object} [options.metadata] - Custom metadata to attach to object

    @return {Promise<Object>} - { success, url, fields, error }
    * @return {Boolean} success - true on success
    * @return {String} url - Presigned URL for POST upload (HTTP POST method)
    * @return {Object} fields - Form fields for POST upload
    * @return {Object|null} error - Error details if failed
    *********************************************************************/
    generateUploadUrlPost: async function (bucket, key, contentType, options) {

      // Initialize AWS SDK client (lazy loading)
      _S3FileUpload.initSDK(Lib, CONFIG, state);

      // Ensure options object exists
      options = options || {};

      try {

        // Create S3 PUT command for presigned URL generation (same as PUT for POST)
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: contentType
        });

        // Generate presigned URL with configurable expiry
        const url = await getSignedUrl(state.client, command, {
          expiresIn: options.expiresIn || CONFIG.UPLOAD_URL_EXPIRY
        });

        Lib.Debug.debug('S3 POST upload URL generated', { bucket: bucket, key: key });

        // Return successful response with form fields for POST uploads
        return {
          success: true,
          url: url,
          fields: {
            key: key,
            'Content-Type': contentType
          },
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('S3 POST upload URL failed', {
          type: ERRORS.STORAGE_URL_GENERATION_FAILED.type,
          bucket: bucket,
          key: key,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          url: null,
          fields: null,
          error: ERRORS.STORAGE_URL_GENERATION_FAILED
        };

      }

    }

  };///////////////////////////Public Functions END//////////////////////////////



  //////////////////////////Private Functions START//////////////////////////////
  const _S3FileUpload = {


    /********************************************************************
    Lazy-load AWS SDK v3 S3 client and presigner.

    @param {Object} Lib - Dependency container (Utils, Debug, Instance)
    @param {Object} CONFIG - Merged configuration for this instance
    @param {Object} state - Mutable state holder (S3Client reference)

    @return {void}
    *********************************************************************/
    initSDK: function (Lib, CONFIG, state) {

      if (state.client !== null) {
        return;
      }

      const { S3Client: S3ClientClass, PutObjectCommand: PutCmd, GetObjectCommand: GetCmd } = require('@aws-sdk/client-s3');
      const { getSignedUrl: getSigned } = require('@aws-sdk/s3-request-presigner');

      S3Client = S3ClientClass;
      PutObjectCommand = PutCmd;
      GetObjectCommand = GetCmd;
      getSignedUrl = getSigned;

      const clientConfig = { region: CONFIG.REGION };

      // Add credentials if provided
      if (CONFIG.KEY && CONFIG.SECRET) {
        clientConfig.credentials = {
          accessKeyId: CONFIG.KEY,
          secretAccessKey: CONFIG.SECRET
        };
      }

      // Add custom endpoint if provided (for MinIO/LocalStack)
      if (CONFIG.ENDPOINT) {
        clientConfig.endpoint = CONFIG.ENDPOINT;
        clientConfig.forcePathStyle = CONFIG.FORCE_PATH_STYLE || false;
      }

      state.client = new S3Client(clientConfig);

    }

  };//////////////////////////Private Functions END//////////////////////////////



  // Return public interface
  return S3UrlSigner;

};/////////////////////////// createInterface END ///////////////////////////////
