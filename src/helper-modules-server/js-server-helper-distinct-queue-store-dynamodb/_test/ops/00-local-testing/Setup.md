# Local Testing Setup — DynamoDB Adapter

## Prerequisites

- Docker and Docker Compose installed
- Node.js 24+ installed
- npm 10+ installed

## Quick Start

```bash
cd _test
npm install
npm test
```

The `npm test` command handles everything:
1. `pretest` — Starts DynamoDB Local via Docker Compose (port 8000)
2. `test` — Runs the test suite against the local DynamoDB instance
3. `posttest` — Stops and removes the Docker containers

## Manual Docker Management

If you prefer to manage Docker manually:

```bash
cd _test

# Start DynamoDB Local
docker compose up -d

# Wait for healthcheck
docker compose ps

# Run tests
cd _test && npm test

# Stop and clean up
docker compose down -v --remove-orphans
```

## Environment Variables

The test suite uses these defaults:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DYNAMODB_ENDPOINT` | `http://127.0.0.1:8000` | DynamoDB Local endpoint |
| `AWS_REGION` | `us-east-1` | AWS region (required by SDK) |
| `AWS_ACCESS_KEY_ID` | `local` | Dummy credentials for local testing |
| `AWS_SECRET_ACCESS_KEY` | `local` | Dummy credentials for local testing |

Override any variable for custom setups:

```bash
DYNAMODB_ENDPOINT=http://custom-host:8000 npm test
```

## Troubleshooting

### Port Already in Use

If port 8000 is occupied, either stop the conflicting service or modify `docker-compose.yml`:

```yaml
ports:
  - "127.0.0.1:8001:8000"  # Use port 8001 instead
```

Then update the endpoint:

```bash
DYNAMODB_ENDPOINT=http://127.0.0.1:8001 npm test
```

### Docker Not Running

The tests require Docker. If you see connection errors, ensure Docker Desktop or Docker Engine is running.

### Slow Tests

First test run downloads the `amazon/dynamodb-local` image. Subsequent runs reuse the cached image.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    npm test                              │
├─────────────────────────────────────────────────────────┤
│  pretest:  docker compose up -d                          │
│            (starts DynamoDB Local on :8000)             │
├─────────────────────────────────────────────────────────┤
│  test:     node --test test.js                           │
│            - Contract suite (4-method validation)         │
│            - Adapter-specific tests                       │
│            - Core integration (enqueue/claim)           │
├─────────────────────────────────────────────────────────┤
│  posttest: docker compose down -v                        │
│            (removes containers and volumes)             │
└─────────────────────────────────────────────────────────┘
```
