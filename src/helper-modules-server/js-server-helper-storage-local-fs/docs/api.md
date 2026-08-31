# API Reference - helper-storage-local-fs

## Overview

Local filesystem storage module for Node.js. Wraps `node:fs/promises` with path safety, error mapping, and an API that mirrors the S3 storage module. No metadata storage.

## Loader Pattern (Factory)

```javascript
import localFs from 'helper-storage-local-fs';

Lib.LocalFs = localFs(Lib, {
  ROOT_DIRECTORY: '/var/app/storage'
});
```

Each loader call returns an independent LocalFs interface with its own Lib, CONFIG, ERRORS, and Validators. Stateless - no per-instance resources.

## Peer Dependencies

- `helper-utils` (injected as `Lib.Utils`)
- `helper-debug` (injected as `Lib.Debug`)

## Direct Dependencies

- `node:fs/promises` (Node.js built-in)
- `node:fs` (Node.js built-in)
- `node:path` (Node.js built-in)

## Exported Functions

### uploadFile(instance, bucket, key, body, content_type, metadata, is_public)

Write a file to the local filesystem. Creates parent directories as needed. The bucket parameter maps to a subdirectory under the root directory. content_type, metadata, and is_public are accepted for API compatibility with the S3 module but are ignored (no metadata storage).

| Parameter | Type | Required | Description |
|---|---|---|---|
| instance | Object | yes | Request instance |
| bucket | String | yes | Subdirectory under root |
| key | String | yes | File path relative to bucket |
| body | Buffer or String | yes | File content |
| content_type | String | no | MIME type (ignored) |
| metadata | Object | no | Custom metadata (ignored) |
| is_public | Boolean | no | Set file permissions (ignored) |

**Returns:** `Promise<Object>` - `{ success, key, error }`

**Throws:** `TypeError` for empty bucket/key or path traversal

### uploadFiles(instance, files)

Upload multiple files in parallel.

| Parameter | Type | Required | Description |
|---|---|---|---|
| instance | Object | yes | Request instance |
| files | Array | yes | Array of file descriptors (same fields as uploadFile) |

**Returns:** `Promise<Object>` - `{ success, results, error }`

### getFile(instance, bucket, key, output_as_string)

Read a file from the local filesystem.

| Parameter | Type | Required | Description |
|---|---|---|---|
| instance | Object | yes | Request instance |
| bucket | String | yes | Subdirectory under root |
| key | String | yes | File path relative to bucket |
| output_as_string | Boolean | no | Return content as string (default true) |

**Returns:** `Promise<Object>` - `{ success, body, error }`

### deleteFile(instance, bucket, key)

Delete a file from the local filesystem.

**Returns:** `Promise<Object>` - `{ success, deleted_count, error }`

### deleteFiles(instance, bucket, keys)

Delete multiple files from the local filesystem.

**Returns:** `Promise<Object>` - `{ success, deleted_count, error }`

### copyFile(instance, source_bucket, source_key, dest_bucket, dest_key, is_public)

Copy a file within the local filesystem.

**Returns:** `Promise<Object>` - `{ success, key, error }`

### moveFile(instance, source_bucket, source_key, dest_bucket, dest_key, is_public)

Move a file within the local filesystem. Copies then deletes the source.

**Returns:** `Promise<Object>` - `{ success, key, error }`

### listFiles(instance, bucket, prefix)

List files in a bucket (subdirectory) with an optional prefix filter. Returns file keys relative to the bucket root.

**Returns:** `Promise<Object>` - `{ success, keys, error }`

## Error Catalog

| Error Type | Message |
|---|---|
| `LOCAL_FS_WRITE_FAILED` | Failed to write file to local filesystem |
| `LOCAL_FS_READ_FAILED` | Failed to read file from local filesystem |
| `LOCAL_FS_DELETE_FAILED` | Failed to delete file from local filesystem |
| `LOCAL_FS_COPY_FAILED` | Failed to copy file within local filesystem |
| `LOCAL_FS_MOVE_FAILED` | Failed to move file within local filesystem |
| `LOCAL_FS_LIST_FAILED` | Failed to list files in local filesystem |
| `LOCAL_FS_NOT_FOUND` | File or directory not found |
| `LOCAL_FS_PATH_TRAVERSAL` | Path traversal detected: key escapes root directory |

## Relationship to helper-storage-aws-s3

This module mirrors the S3 storage module's API (`uploadFile`, `getFile`, `deleteFile`, `copyFile`, `moveFile`, `listFiles`) so applications can switch between local filesystem and S3 by changing one loader line. The `bucket` parameter maps to a subdirectory under `ROOT_DIRECTORY` in the local module and an S3 bucket in the S3 module.
