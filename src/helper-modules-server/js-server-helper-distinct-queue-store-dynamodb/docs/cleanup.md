# Cleanup - helper-distinct-queue-store-dynamodb

## No TTL

This store has no TTL behavior and no cleanup function. Queue records do not carry an `expires_at` field. There is no expired-record accumulation by design.

## How Records Leave the Store

The parent `helper-distinct-queue` module manages the lifecycle of queue records. The deletion path is:

1. **`claim`** calls `queryByResourceId` to find the latest record for a `(tenant_id, resource_id)` pair.
2. If a record is found and claimed, `claim` calls `deleteByDataVersionLte` to remove all records for that pair whose `data_version` is less than or equal to the claimed record's `data_version`. This removes the claimed record and any older duplicates.
3. If no record is found, nothing is deleted.

Records are never left behind. Every successful `claim` cleans up the pair it claimed from. The only way records accumulate is if `claim` is never called for a given `(tenant_id, resource_id)` pair - which is a consumer-side bug, not a store-side cleanup gap.

## No Scheduled Cleanup Needed

There is no `cleanupExpiredRecords` method on this store and no equivalent to schedule. The distinct-queue pattern is append-on-write, delete-on-claim; records do not expire, they are consumed.

## DynamoDB Range Delete Implementation

DynamoDB does not support a native range delete (no `DELETE WHERE` equivalent). The `deleteByDataVersionLte` method:

1. Queries all records for the `(tenant_id, resource_id)` pair with `data_version` less than or equal to the boundary.
2. Collects the primary keys `(pk, sk)` of the matching records.
3. Issues a `BatchWriteItem` with `DeleteRequest` entries for each key.

This is a two-step operation (query then batch delete). For pairs with many stale records, the batch delete is paginated in chunks of 25 (the DynamoDB `BatchWriteItem` limit). See [Schema](schema.md) for the table structure and key design.
