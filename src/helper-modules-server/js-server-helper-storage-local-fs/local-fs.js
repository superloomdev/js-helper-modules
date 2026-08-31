// Info: Local filesystem storage module for Node.js. Wraps node:fs/promises
// and node:fs streams with path safety, error mapping, and an API that
// mirrors the S3 storage module. No metadata storage.
//
// The `bucket` parameter is the storage-agnostic container name shared across
// all storage modules. In local-fs, it maps to a subdirectory under
// ROOT_DIRECTORY. In the S3 module, it maps to an S3 bucket. This shared
// parameter name enables hot-swappability between storage backends.
//
// Compatibility: Node.js 24+.
//
// Factory pattern: each loader call returns an independent LocalFs interface
// with its own Lib, CONFIG, ERRORS, and Validators. Stateless - no
// per-instance resources.
import nodeFs from 'node:fs/promises';
import nodePath from 'node:path';
import CONFIG_DEFAULTS from './local-fs.config.js';
import ERRORS from './local-fs.errors.js';
import createValidators from './local-fs.validators.js';



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent LocalFs instance with its
own Lib, CONFIG, ERRORS, and Validators.

@param {Object} shared_libs - Lib container with Utils, Debug
@param {Object} config - Overrides merged over module config defaults

@return {Object} - Public interface for this module
*********************************************************************/
export default function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    CONFIG_DEFAULTS,
    config || {}
  );

  // Validators singleton - Lib, ERRORS injected here
  const Validators = createValidators(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Create and return the public interface
  return createInterface(Lib, CONFIG, ERRORS, Validators);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public interface for one instance. Public and private
functions close over the provided Lib, CONFIG, ERRORS, and Validators.

@param {Object} Lib - Dependency container (Utils, Debug)
@param {Object} CONFIG - Merged configuration for this instance
@param {Object} ERRORS - Error catalog for this module
@param {Object} Validators - Validators module instance

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators) { // eslint-disable-line no-unused-vars

  ///////////////////////////Public Functions START//////////////////////////////
  const LocalFs = {

    // ~~~~~~~~~~~~~~~~~~~~ File Operations ~~~~~~~~~~~~~~~~~~~~
    // Single-file upload, download, delete, copy, and move.

    /********************************************************************
    Upload (write) a file to the local filesystem. Creates parent
    directories as needed. The bucket parameter maps to a subdirectory
    under the root directory.

    @param {Object} instance - Request instance
    @param {String} bucket - Storage container name (maps to a subdirectory under ROOT_DIRECTORY in local-fs)
    @param {String} key - File path relative to bucket
    @param {Buffer|String} body - File content
    @param {String} content_type - MIME type (ignored - no metadata storage)
    @param {Object} metadata - Custom metadata (ignored - no metadata storage)
    @param {Boolean} is_public - Set file permissions (ignored on most platforms)

    @return {Promise<Object>} - { success, key, error }
    *********************************************************************/
    uploadFile: async function (instance, bucket, key, body, content_type, metadata, is_public) { // eslint-disable-line no-unused-vars

      // Validate inputs - programmer error throws TypeError
      _LocalFs.validateFilePath(bucket, key);

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Resolve the full file path with path safety
      const full_path = _LocalFs.resolvePath(bucket, key);

      try {

        // Ensure parent directories exist
        const dir = nodePath.dirname(full_path);
        await nodeFs.mkdir(dir, { recursive: true });

        // Write the file content
        await nodeFs.writeFile(full_path, body);

        Lib.Debug.performanceAuditLog('End', 'LocalFs uploadFile', start_ms);

        // Return success envelope
        return {
          success: true,
          key: key,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('LocalFs uploadFile failed', {
          type: ERRORS.LOCAL_FS_WRITE_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        Lib.Debug.performanceAuditLog('End', 'LocalFs uploadFile', start_ms);

        // Return error envelope
        return {
          success: false,
          key: key,
          error: ERRORS.LOCAL_FS_WRITE_FAILED
        };

      }

    },


    /********************************************************************
    Upload (write) multiple files in parallel. Each file entry mirrors
    the uploadFile signature as an object.

    @param {Object} instance - Request instance
    @param {Object[]} files - Array of file descriptors

    @return {Promise<Object>} - { success, results, error }
    *********************************************************************/
    uploadFiles: async function (instance, files) {

      // Validate files is an array
      if (!Array.isArray(files)) {
        throw new TypeError('[helper-storage-local-fs] uploadFiles requires an array of file descriptors');
      }

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Fire all uploads in parallel and collect per-file outcomes
      const results = await Promise.all(files.map(function (file) {
        return LocalFs.uploadFile(
          instance,
          file.bucket,
          file.key,
          file.body,
          file.content_type,
          file.metadata,
          file.is_public
        );
      }));

      Lib.Debug.performanceAuditLog('End', 'LocalFs uploadFiles', start_ms);

      // Return aggregate result
      const all_success = results.every(function (r) {
        return r.success;
      });

      return {
        success: all_success,
        results: results,
        error: all_success ? null : ERRORS.LOCAL_FS_WRITE_FAILED
      };

    },


    /********************************************************************
    Get (read) a file from the local filesystem. Returns the file
    content as a string or Buffer depending on output_as_string.

    @param {Object} instance - Request instance
    @param {String} bucket - Storage container name (maps to a subdirectory under ROOT_DIRECTORY in local-fs)
    @param {String} key - File path relative to bucket
    @param {Boolean} output_as_string - Return content as string (default true)

    @return {Promise<Object>} - { success, body, error }
    *********************************************************************/
    getFile: async function (instance, bucket, key, output_as_string) {

      // Validate inputs - programmer error throws TypeError
      _LocalFs.validateFilePath(bucket, key);

      // Default output_as_string to true
      if (Lib.Utils.isNullOrUndefined(output_as_string)) {
        output_as_string = true;
      }

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Resolve the full file path with path safety
      const full_path = _LocalFs.resolvePath(bucket, key);

      try {

        // Read the file content
        const content = await nodeFs.readFile(full_path, output_as_string ? 'utf8' : null);

        Lib.Debug.performanceAuditLog('End', 'LocalFs getFile', start_ms);

        // Return success envelope with file content
        return {
          success: true,
          body: content,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('LocalFs getFile failed', {
          type: ERRORS.LOCAL_FS_READ_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        Lib.Debug.performanceAuditLog('End', 'LocalFs getFile', start_ms);

        // Return error envelope
        return {
          success: false,
          body: null,
          error: error.code === 'ENOENT' ? ERRORS.LOCAL_FS_NOT_FOUND : ERRORS.LOCAL_FS_READ_FAILED
        };

      }

    },


    /********************************************************************
    Delete a file from the local filesystem.

    @param {Object} instance - Request instance
    @param {String} bucket - Storage container name (maps to a subdirectory under ROOT_DIRECTORY in local-fs)
    @param {String} key - File path relative to bucket

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    deleteFile: async function (instance, bucket, key) {

      // Validate inputs - programmer error throws TypeError
      _LocalFs.validateFilePath(bucket, key);

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Resolve the full file path with path safety
      const full_path = _LocalFs.resolvePath(bucket, key);

      try {

        // Delete the file
        await nodeFs.unlink(full_path);

        Lib.Debug.performanceAuditLog('End', 'LocalFs deleteFile', start_ms);

        // Return success envelope
        return {
          success: true,
          deleted_count: 1,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('LocalFs deleteFile failed', {
          type: ERRORS.LOCAL_FS_DELETE_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        Lib.Debug.performanceAuditLog('End', 'LocalFs deleteFile', start_ms);

        // Return error envelope
        return {
          success: false,
          deleted_count: 0,
          error: error.code === 'ENOENT' ? ERRORS.LOCAL_FS_NOT_FOUND : ERRORS.LOCAL_FS_DELETE_FAILED
        };

      }

    },


    /********************************************************************
    Delete multiple files from the local filesystem.

    @param {Object} instance - Request instance
    @param {String} bucket - Storage container name (maps to a subdirectory under ROOT_DIRECTORY in local-fs)
    @param {String[]} keys - Array of file paths relative to bucket

    @return {Promise<Object>} - { success, deleted_count, error }
    *********************************************************************/
    deleteFiles: async function (instance, bucket, keys) {

      // Validate bucket is a non-empty string
      if (!Lib.Utils.isString(bucket) || Lib.Utils.isEmptyString(bucket)) {
        throw new TypeError('[helper-storage-local-fs] deleteFiles requires a non-empty string bucket');
      }

      // Validate keys is an array
      if (!Array.isArray(keys)) {
        throw new TypeError('[helper-storage-local-fs] deleteFiles requires an array of keys');
      }

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Delete all files in parallel and collect outcomes
      const results = await Promise.all(keys.map(function (key) {
        return LocalFs.deleteFile(instance, bucket, key);
      }));

      Lib.Debug.performanceAuditLog('End', 'LocalFs deleteFiles', start_ms);

      // Count successful deletions
      const deleted_count = results.filter(function (r) {
        return r.success;
      }).length;

      return {
        success: deleted_count === keys.length,
        deleted_count: deleted_count,
        error: deleted_count === keys.length ? null : ERRORS.LOCAL_FS_DELETE_FAILED
      };

    },


    /********************************************************************
    Copy a file within the local filesystem.

    @param {Object} instance - Request instance
    @param {String} source_bucket - Source subdirectory
    @param {String} source_key - Source file path
    @param {String} dest_bucket - Destination subdirectory
    @param {String} dest_key - Destination file path
    @param {Boolean} is_public - Set file permissions (ignored on most platforms)

    @return {Promise<Object>} - { success, key, error }
    *********************************************************************/
    copyFile: async function (instance, source_bucket, source_key, dest_bucket, dest_key, is_public) { // eslint-disable-line no-unused-vars

      // Validate inputs - programmer error throws TypeError
      _LocalFs.validateFilePath(source_bucket, source_key);
      _LocalFs.validateFilePath(dest_bucket, dest_key);

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Resolve source and destination paths
      const source_path = _LocalFs.resolvePath(source_bucket, source_key);
      const dest_path = _LocalFs.resolvePath(dest_bucket, dest_key);

      try {

        // Ensure destination parent directories exist
        const dir = nodePath.dirname(dest_path);
        await nodeFs.mkdir(dir, { recursive: true });

        // Copy the file
        await nodeFs.copyFile(source_path, dest_path);

        Lib.Debug.performanceAuditLog('End', 'LocalFs copyFile', start_ms);

        // Return success envelope
        return {
          success: true,
          key: dest_key,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('LocalFs copyFile failed', {
          type: ERRORS.LOCAL_FS_COPY_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        Lib.Debug.performanceAuditLog('End', 'LocalFs copyFile', start_ms);

        // Return error envelope
        return {
          success: false,
          key: dest_key,
          error: error.code === 'ENOENT' ? ERRORS.LOCAL_FS_NOT_FOUND : ERRORS.LOCAL_FS_COPY_FAILED
        };

      }

    },


    /********************************************************************
    Move a file within the local filesystem. Copies then deletes the source.

    @param {Object} instance - Request instance
    @param {String} source_bucket - Source subdirectory
    @param {String} source_key - Source file path
    @param {String} dest_bucket - Destination subdirectory
    @param {String} dest_key - Destination file path
    @param {Boolean} is_public - Set file permissions (ignored on most platforms)

    @return {Promise<Object>} - { success, key, error }
    *********************************************************************/
    moveFile: async function (instance, source_bucket, source_key, dest_bucket, dest_key, is_public) { // eslint-disable-line no-unused-vars

      // Validate inputs - programmer error throws TypeError
      _LocalFs.validateFilePath(source_bucket, source_key);
      _LocalFs.validateFilePath(dest_bucket, dest_key);

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Resolve source and destination paths
      const source_path = _LocalFs.resolvePath(source_bucket, source_key);
      const dest_path = _LocalFs.resolvePath(dest_bucket, dest_key);

      try {

        // Ensure destination parent directories exist
        const dir = nodePath.dirname(dest_path);
        await nodeFs.mkdir(dir, { recursive: true });

        // Move the file (rename fails across devices, so use copy+unlink)
        await nodeFs.copyFile(source_path, dest_path);
        await nodeFs.unlink(source_path);

        Lib.Debug.performanceAuditLog('End', 'LocalFs moveFile', start_ms);

        // Return success envelope
        return {
          success: true,
          key: dest_key,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('LocalFs moveFile failed', {
          type: ERRORS.LOCAL_FS_MOVE_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        Lib.Debug.performanceAuditLog('End', 'LocalFs moveFile', start_ms);

        // Return error envelope
        return {
          success: false,
          key: dest_key,
          error: error.code === 'ENOENT' ? ERRORS.LOCAL_FS_NOT_FOUND : ERRORS.LOCAL_FS_MOVE_FAILED
        };

      }

    },


    // ~~~~~~~~~~~~~~~~~~~~ Listing ~~~~~~~~~~~~~~~~~~~~
    // List files in a bucket (subdirectory).

    /********************************************************************
    List files in a bucket (subdirectory) with an optional prefix filter.
    Returns an array of file keys relative to the bucket root.

    @param {Object} instance - Request instance
    @param {String} bucket - Storage container name (maps to a subdirectory under ROOT_DIRECTORY in local-fs)
    @param {String} prefix - Optional path prefix to filter by

    @return {Promise<Object>} - { success, keys, error }
    *********************************************************************/
    listFiles: async function (instance, bucket, prefix) {

      // Validate bucket is a non-empty string
      if (!Lib.Utils.isString(bucket) || Lib.Utils.isEmptyString(bucket)) {
        throw new TypeError('[helper-storage-local-fs] listFiles requires a non-empty string bucket');
      }

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Resolve the bucket path with path safety
      const bucket_path = _LocalFs.resolvePath(bucket, '');

      try {

        // Read the directory recursively
        const keys = await _LocalFs.listDirectory(bucket_path, prefix || '');

        Lib.Debug.performanceAuditLog('End', 'LocalFs listFiles', start_ms);

        // Return success envelope with file keys
        return {
          success: true,
          keys: keys,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('LocalFs listFiles failed', {
          type: ERRORS.LOCAL_FS_LIST_FAILED.type,
          message: error.message,
          stack: error.stack
        });

        Lib.Debug.performanceAuditLog('End', 'LocalFs listFiles', start_ms);

        // Return error envelope
        return {
          success: false,
          keys: [],
          error: error.code === 'ENOENT' ? ERRORS.LOCAL_FS_NOT_FOUND : ERRORS.LOCAL_FS_LIST_FAILED
        };

      }

    }


  };///////////////////////////Public Functions END//////////////////////////////



  //////////////////////////Private Functions START//////////////////////////////
  const _LocalFs = {

    /********************************************************************
    Validate a bucket and key pair. Throws TypeError on programmer error.

    @param {String} bucket - Storage container name (maps to a subdirectory under ROOT_DIRECTORY in local-fs)
    @param {String} key - File path
    *********************************************************************/
    validateFilePath: function (bucket, key) {

      // Bucket must be a non-empty string
      if (!Lib.Utils.isString(bucket) || Lib.Utils.isEmptyString(bucket)) {
        throw new TypeError('[helper-storage-local-fs] bucket must be a non-empty string');
      }

      // Key must be a non-empty string
      if (!Lib.Utils.isString(key) || Lib.Utils.isEmptyString(key)) {
        throw new TypeError('[helper-storage-local-fs] key must be a non-empty string');
      }

    },


    /********************************************************************
    Resolve a bucket and key to a full filesystem path with path traversal
    protection. Prevents directory traversal attacks by ensuring the
    resolved path stays within the root directory.

    @param {String} bucket - Storage container name (maps to a subdirectory under ROOT_DIRECTORY in local-fs)
    @param {String} key - File path relative to bucket

    @return {String} - Resolved absolute path
    *********************************************************************/
    resolvePath: function (bucket, key) {

      // Build the full path from root, bucket, and key
      const root = nodePath.resolve(CONFIG.ROOT_DIRECTORY);
      const full_path = nodePath.resolve(root, bucket, key);

      // Path safety: ensure the resolved path is within the root
      if (!full_path.startsWith(root + nodePath.sep) && full_path !== root) {
        throw new TypeError('[helper-storage-local-fs] path traversal detected: key escapes root directory');
      }

      // Return the safe resolved path
      return full_path;

    },


    /********************************************************************
    Recursively list files in a directory, returning keys relative to
    the bucket root. Filters by an optional prefix.

    @param {String} dir_path - Absolute directory path to list
    @param {String} prefix - Optional prefix to filter keys by

    @return {Promise<Array>} - Array of file key strings
    *********************************************************************/
    listDirectory: async function (dir_path, prefix) {

      const keys = [];

      // Read the directory entries
      const entries = await nodeFs.readdir(dir_path, { withFileTypes: true });

      for (let i = 0; i < entries.length; i++) {

        const entry = entries[i];
        const entry_path = nodePath.join(dir_path, entry.name);

        // Recurse into subdirectories
        if (entry.isDirectory()) {

          const sub_keys = await _LocalFs.listDirectory(entry_path, prefix);
          for (let j = 0; j < sub_keys.length; j++) {
            keys.push(sub_keys[j]);
          }

        } else if (entry.isFile()) {

          // Compute the key relative to the bucket root
          const bucket_root = _LocalFs.resolvePath('', '');
          const relative_key = nodePath.relative(bucket_root, entry_path);

          // Include if no prefix or key starts with prefix
          if (Lib.Utils.isEmptyString(prefix) || relative_key.startsWith(prefix)) {
            keys.push(relative_key);
          }

        }

      }

      // Return the list of file keys
      return keys;

    }

  };//////////////////////////Private Functions END//////////////////////////////



  // Return public interface
  return LocalFs;

};/////////////////////////// createInterface END //////////////////////////////
