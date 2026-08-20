# Integration Testing with a Real Server

The test suite can run against a real Valkey or Redis server by setting environment variables.

## Setup

1. Ensure a Valkey or Redis OSS 7.2- server is reachable
2. Set the environment variables:

```bash
export VALKEY_HOST=your-server-host
export VALKEY_PORT=6379
```

3. Run the tests without the Docker lifecycle:

```bash
cd _test
npm install
node --test --test-timeout 120000 test.js
```

Skip `npm test` (which runs `pretest`/`posttest`) when pointing at a real server, as those scripts manage a local Docker container.

## TLS and Auth

For servers requiring TLS or AUTH, modify the `config_kv` object in `loader.js` to include the relevant config keys (`TLS: true`, `PASSWORD: '...'`, etc.).

## ElastiCache

ElastiCache with cluster mode disabled is supported. Point `VALKEY_HOST` and `VALKEY_PORT` at the primary endpoint, and enable TLS in the loader config. IAM auth is not supported by this module.
