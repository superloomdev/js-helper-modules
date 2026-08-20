# Local Valkey Setup

The test suite uses a Valkey container managed by Docker Compose.

## Prerequisites

- Docker and Docker Compose installed
- Port 6379 available on localhost

## Running Tests

Tests are fully automated via npm scripts:

```bash
cd _test
npm install
npm test
```

The `pretest` script starts the Valkey container, `test` runs the suite, and `posttest` tears it down. No manual container management is needed.

## Container Details

- Image: `valkey/valkey:latest`
- Port binding: `127.0.0.1:6379:6379` (localhost only)
- Health check: `valkey-cli ping`
- Data is ephemeral: lost on container stop

## Manual Container Access

If you need to inspect the Valkey instance during a test run:

```bash
docker exec -it superloom-test-valkey valkey-cli
```
