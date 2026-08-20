# Local Valkey Setup for ElastiCache Module Testing

The test suite uses a Valkey container (same as kv-valkey tests). IAM auth is tested with mocked credentials - no real AWS calls are made.

## Prerequisites

- Docker and Docker Compose installed
- Port 6379 available on localhost

## Running Tests

```bash
cd _test
npm install
npm test
```

The `pretest` script starts the Valkey container, `test` runs the suite, `posttest` tears it down.

## What Is Tested

- **Passthrough mode**: All 17 kv-valkey functions work through the wrapper without IAM auth
- **IAM token generation**: SigV4 signing logic with mocked credentials
- **Config validation**: IAM config keys, required-field checks
- **Wrapper purity**: No AWS SDK or ioredis wording in error objects

## What Is NOT Tested

- **Real IAM auth against ElastiCache**: Requires an AWS account and a provisioned ElastiCache cluster. See `01-integration-testing/elasticache-integration-setup.md` for manual smoke test instructions.
- **Token refresh on live connection**: Requires a real ElastiCache endpoint with IAM auth configured.
