# helper-storage-local-fs - AI Agent Reference

## Module Type
Server module (Class B - extended utility). Local filesystem storage using Node.js built-in `fs` and `path` modules. No third-party dependencies.

## Peer Dependencies
- `helper-utils` (injected as `Lib.Utils`)
- `helper-debug` (injected as `Lib.Debug`)

## Direct Dependencies
- `node:fs/promises` (Node.js built-in)
- `node:fs` (Node.js built-in)
- `node:path` (Node.js built-in)

## Loader Pattern (Factory)

```javascript
import localFs from 'helper-storage-local-fs';

Lib.LocalFs = localFs(Lib, {
  ROOT_DIRECTORY: '/var/app/storage'
});
```

Each loader call returns an independent LocalFs interface with its own Lib, CONFIG, ERRORS, and Validators. Stateless - no per-instance resources.

## Companion Files
- `local-fs.config.js` - default config (ROOT_DIRECTORY)
- `local-fs.errors.js` - frozen error catalog (8 error types)
- `local-fs.validators.js` - config validators singleton

## Exported Functions (8 total)

### uploadFile(instance, bucket, key, body, content_type, metadata, is_public) -> { success, key, error } | async:yes
Write a file. Creates parent directories. content_type/metadata/is_public ignored (no metadata storage).

### uploadFiles(instance, files) -> { success, results, error } | async:yes
Upload multiple files in parallel.

### getFile(instance, bucket, key, output_as_string) -> { success, body, error } | async:yes
Read a file as string (default) or Buffer.

### deleteFile(instance, bucket, key) -> { success, deleted_count, error } | async:yes
Delete a single file.

### deleteFiles(instance, bucket, keys) -> { success, deleted_count, error } | async:yes
Delete multiple files in parallel.

### copyFile(instance, source_bucket, source_key, dest_bucket, dest_key, is_public) -> { success, key, error } | async:yes
Copy a file within the filesystem.

### moveFile(instance, source_bucket, source_key, dest_bucket, dest_key, is_public) -> { success, key, error } | async:yes
Move a file (copy then delete source).

### listFiles(instance, bucket, prefix) -> { success, keys, error } | async:yes
List files in a bucket with optional prefix filter.

## Error Catalog

| Type | Message |
|---|---|
| LOCAL_FS_WRITE_FAILED | Failed to write file to local filesystem |
| LOCAL_FS_READ_FAILED | Failed to read file from local filesystem |
| LOCAL_FS_DELETE_FAILED | Failed to delete file from local filesystem |
| LOCAL_FS_COPY_FAILED | Failed to copy file within local filesystem |
| LOCAL_FS_MOVE_FAILED | Failed to move file within local filesystem |
| LOCAL_FS_LIST_FAILED | Failed to list files in local filesystem |
| LOCAL_FS_NOT_FOUND | File or directory not found |
| LOCAL_FS_PATH_TRAVERSAL | Path traversal detected: key escapes root directory |

## Testing

```bash
cd _test && npm install && npm test
```

Uses a temp directory under the system temp dir. Cleans up after all tests.
