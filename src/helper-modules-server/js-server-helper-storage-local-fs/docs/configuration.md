# Configuration - helper-storage-local-fs

## Loader Pattern

```javascript
import localFs from 'helper-storage-local-fs';

Lib.LocalFs = localFs(Lib, {
  ROOT_DIRECTORY: '/var/app/storage'
});
```

Each loader call returns an independent LocalFs interface. The module is stateless - no per-instance resources are held.

## Config Keys

| Key | Type | Default | Required | Description |
|---|---|---|---|---|
| ROOT_DIRECTORY | String | './storage' | no | Root directory for all file operations. All bucket and key paths are resolved relative to this directory. Path traversal outside this root is blocked at resolve time. |

## Peer Dependencies

| Package | Alias | Injected As |
|---|---|---|
| `@superloomdev/js-helper-utils` | `helper-utils` | `Lib.Utils` |
| `@superloomdev/js-helper-debug` | `helper-debug` | `Lib.Debug` |

## Direct Dependencies

None. Uses only Node.js built-in modules:
- `node:fs/promises` - file operations (read, write, delete, copy, mkdir, readdir)
- `node:fs` - synchronous type checking (Dirent)
- `node:path` - path resolution and traversal protection

## Runtime Requirements

- Node.js 24+
- Read/write access to the ROOT_DIRECTORY

## Path Safety

All file paths are resolved relative to ROOT_DIRECTORY using `node.path.resolve`. Before any file operation, the resolved path is checked to ensure it starts with the root directory path. A path that escapes the root (e.g. `../../../etc/passwd`) throws a TypeError synchronously.

## No Metadata Storage

This module does not store file metadata (content type, custom metadata, ACL). The `content_type`, `metadata`, and `is_public` parameters on `uploadFile` and `copyFile` are accepted for API compatibility with the S3 storage module but are ignored. An application that needs metadata storage should use the S3 module or maintain a separate metadata database.
