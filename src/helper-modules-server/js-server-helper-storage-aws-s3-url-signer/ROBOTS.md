# @superloomdev/js-server-helper-storage-aws-s3-url-signer

S3 presigned URL signer for direct browser uploads and downloads. Lazy-loaded SDK v3. Explicit credentials.

## Type
Server helper. Service-dependent (needs Docker/MinIO for emulated, AWS for integration).

## Peer Dependencies
- `@superloomdev/js-helper-utils` - injected as `Lib.Utils`
- `@superloomdev/js-helper-debug` - injected as `Lib.Debug`
- `@superloomdev/js-server-helper-instance` - injected as `Lib.Instance`

## Direct Dependencies
- `@aws-sdk/client-s3` - S3 client + command constructors
- `@aws-sdk/s3-request-presigner` - Presigned URL generation

## Companion Files
- `s3-url-signer.config.js` - default config (REGION, KEY, SECRET, ENDPOINT, FORCE_PATH_STYLE, UPLOAD_URL_EXPIRY, DOWNLOAD_URL_EXPIRY)
- `s3-url-signer.errors.js` - frozen error catalog (STORAGE_URL_GENERATION_FAILED)
- `s3-url-signer.validators.js` - config validators singleton

## Loader Pattern (Factory)

```javascript
Lib.S3UrlSigner = require('@superloomdev/js-server-helper-storage-aws-s3-url-signer')(Lib, { /* config overrides */ });
```

Returns an independent S3 URL signer interface with its own `Lib`, `CONFIG`, and S3 client instance.

## Config Keys
| Key | Type | Default | Required |
|---|---|---|---|
| REGION | String | 'us-east-1' | yes |
| KEY | String | undefined | yes (AWS access key) |
| SECRET | String | undefined | yes (AWS secret key) |
| ENDPOINT | String | undefined | no (set for MinIO/LocalStack) |
| FORCE_PATH_STYLE | Boolean | false | no (set true for MinIO) |
| UPLOAD_URL_EXPIRY | Number | 900 | no (15 minutes) |
| DOWNLOAD_URL_EXPIRY | Number | 3600 | no (1 hour) |

## Exported Functions (3 total)

generateUploadUrlPut(bucket, key, contentType, options?) → { success, url, fields, error } | async:yes
  Generate presigned PUT URL for upload. Default 15 min expiry. Returns empty fields object for PUT uploads.

generateUploadUrlPost(bucket, key, contentType, options?) → { success, url, fields, error } | async:yes
  Generate presigned POST URL for upload with form fields. Default 15 min expiry. Returns populated fields object.

generateDownloadUrlGet(bucket, key, options?) → { success, url, error } | async:yes
  Generate presigned GET URL for download. Default 1 hour expiry. Supports responseContentDisposition override.

## Patterns
- Factory pattern: each loader call returns an independent interface with its own S3 client
- Lazy loading: SDK loaded on first function call via initSDK
- Explicit credentials: KEY + SECRET via config, not implicit env chain
- MinIO compatibility: CONFIG.FORCE_PATH_STYLE=true enables path-style addressing
- Error handling: returns { success: false, error: { type, message } } - never throws
- URL expiry: configurable per call via options.expiresIn
- Response headers: download URLs support Content-Disposition override
- Consistent return shapes: all functions return { success, ..., error } objects
