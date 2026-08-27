# Integration Testing with Real ElastiCache

The local test suite uses a Valkey container and mocked IAM credentials. To test against a real ElastiCache cluster with IAM auth:

## Prerequisites

1. An AWS account with an ElastiCache cluster (Valkey 7.2+ or Redis OSS 7.0+)
2. Cluster mode **disabled** (single primary endpoint)
3. TLS enabled (in-transit encryption)
4. An ElastiCache user with `authentication-mode Type=iam`
5. An IAM policy granting `elasticache:Connect` on the cluster

## Manual Smoke Test

1. Set environment variables:

```bash
export VALKEY_HOST=your-cluster.xxxxxx.cache.amazonaws.com
export VALKEY_PORT=6379
```

2. Write a small script that constructs the module with IAM config:

```javascript
import kvAwsElasticache from '@superloomdev/js-server-helper-kv-aws-elasticache';

const KV = kvAwsElasticache(Lib, {
  HOST: process.env.VALKEY_HOST,
  PORT: parseInt(process.env.VALKEY_PORT, 10),
  TLS: true,
  IAM_USER_ID: 'your-elasticache-user-id',
  CACHE_NAME: 'your-cluster-name',
  AWS_KEY: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_REGION: 'us-east-1'
});

const instance = Lib.Instance.initialize();

// Test ping
KV.ping(instance).then(r => {
  console.log('Ping:', r);
  return KV.set(instance, 'test', 'hello');
}).then(() => {
  return KV.get(instance, 'test');
}).then(r => {
  console.log('Get:', r);
  return KV.close(instance);
}).catch(e => console.error('Error:', e));
```

3. Run the script with valid AWS credentials in your environment.

## Token Refresh

IAM tokens expire after 15 minutes (900 seconds). The module refreshes tokens `TOKEN_REFRESH_MARGIN_SECONDS` (default 60) before expiry. Long-lived connections auto-disconnect after 12 hours per AWS policy; a reconnect generates a fresh token.

## Limitations

- **MULTI/EXEC not supported** with IAM auth (AWS limitation)
- **Cluster mode enabled not supported** (this module is single-instance only)
- **Username must match IAM user ID** (AWS requirement for IAM auth)
