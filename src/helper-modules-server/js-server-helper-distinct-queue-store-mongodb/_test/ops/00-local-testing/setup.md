# Local Testing Setup - helper-distinct-queue-store-mongodb

## Prerequisites

- Docker and Docker Compose installed
- Node.js 24+ installed

## Quick Start

```bash
cd _test

# Start MongoDB container
docker compose up -d

# Install dependencies
npm install

# Run tests
npm test

# Stop MongoDB container
docker compose down
```

## Environment Variables

The loader reads these environment variables (with defaults):

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URL` | `mongodb://127.0.0.1:27020/?directConnection=true` | MongoDB connection URI |
| `MONGO_DATABASE` | `test_db` | Database name |

## Troubleshooting

### Connection refused

Ensure MongoDB container is running:

```bash
docker compose ps
docker compose logs mongodb
```

### Port already in use

Change the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "27018:27017"  # Use 27018 on host
```

Then update the connection string:

```bash
export MONGO_URL="mongodb://localhost:27018/?directConnection=true"
```

### Permission errors on Linux

Ensure your user is in the `docker` group:

```bash
sudo usermod -aG docker $USER
# Log out and back in
```
