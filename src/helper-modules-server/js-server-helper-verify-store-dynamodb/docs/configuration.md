# Configuration - helper-verify-store-dynamodb

## Loader Pattern

```js
import verifyStoreDynamodb from '@superloomdev/js-server-helper-verify-store-dynamodb';
import verify from '@superloomdev/js-server-helper-verify';

const Store = verifyStoreDynamodb(Lib, {
  TABLE_NAME: 'verification_codes'
});

Lib.Verify = verify(Lib, {
  Store: Store
});
```

## Configuration Keys

| Key | Type | Required | Description |
|-----|------|----------|--------------|
| `TABLE_NAME` | `String` | Yes | Name of the DynamoDB table. |

## Dependencies

| Package | Type | Purpose |
|---------|------|---------|
| `helper-utils` | Injected via `shared_libs.Utils` | Type checks |
| `helper-debug` | Injected via `shared_libs.Debug` | Structured debug logging |
| `helper-nosql-aws-dynamodb` | Injected via `shared_libs.DynamoDB` | DynamoDB driver wrapper |

## Environment Variables

Consumed only by `_test/loader.js` - never read by the adapter itself.

| Variable | Default | Description |
|----------|---------|-------------|
| `DYNAMO_ENDPOINT` | `http://127.0.0.1:8002` | DynamoDB endpoint (DynamoDB Local for tests) |
| `AWS_REGION` | `us-east-1` | AWS region |

The test script also sets `AWS_ACCESS_KEY_ID=local` and `AWS_SECRET_ACCESS_KEY=local` to prevent the AWS SDK from walking the EC2 credential chain (which causes a 1-2 second timeout per call in non-EC2 environments).

## Testing Tier

| Tier | Runtime | Notes |
|------|---------|-------|
| Contract + Integration | DynamoDB Local via Docker Compose | `pretest`/`posttest` manage the Docker lifecycle |

```bash
npm install && npm test  # run from _test/
```

The `pretest` script runs `docker compose down -v` then `docker compose up -d --wait`. Never start Docker manually before running tests.

## Post-Deployment Step

After `setupNewStore` provisions the table, enable TTL on `expires_at` out-of-band:

```bash
aws dynamodb update-time-to-live \
  --table-name verification_codes \
  --time-to-live-specification "Enabled=true, AttributeName=expires_at"
```

Or via CloudFormation / CDK - see [`docs/schema.md`](./schema.md) for the IaC snippet.
