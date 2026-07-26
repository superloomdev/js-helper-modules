# Cleanup - helper-distinct-queue-store-mongodb

## No TTL

This store has no TTL behavior and no cleanup function. Queue records do not carry an `expires_at` field. There is no expired-record accumulation by design.

## How Records Leave the Store

The parent `helper-distinct-queue` module manages the lifecycle of queue records. The deletion path is:

1. **`claim`** calls `queryByResourceId` to find the latest record for a `(tenant_id, resource_id)` pair.
2. If a record is found and claimed, `claim` calls `deleteByDataVersionLte` to remove all records for that pair whose `data_version` is less than or equal to the claimed record's `data_version`. This removes the claimed record and any older duplicates in a single atomic pass.
3. If no record is found, nothing is deleted.

Records are never left behind. Every successful `claim` cleans up the pair it claimed from. The only way records accumulate is if `claim` is never called for a given `(tenant_id, resource_id)` pair - which is a consumer-side bug, not a store-side cleanup gap.

## No Scheduled Cleanup Needed

There is no `cleanupExpiredRecords` method on this store and no equivalent to schedule. The distinct-queue pattern is append-on-write, delete-on-claim; records do not expire, they are consumed.

## MongoDB Index Considerations

The `deleteByDataVersionLte` method uses a filter on `(tenant_id, resource_id, data_version)`. Ensure the collection has a compound index covering these three fields for efficient range deletes. See [Schema](schema.md) for the index specification.
