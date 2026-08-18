// Info: AWS DynamoDB admin wrapper with table and TTL provisioning operations. Lazy-loaded SDK v3.
// Server-only: uses '@aws-sdk/client-dynamodb' with elevated IAM credentials.
//
// Compatibility: Node.js 24+.
//
// Factory pattern: each loader call returns an independent DynamoDB admin interface
// with its own Lib, CONFIG, and per-instance DynamoDBClient.
//
// Lazy-loaded AWS SDK v3 client (stateless, shared across instances):
//   - '@aws-sdk/client-dynamodb' -> DynamoDBClient class + control-plane commands
'use strict';

// Shared stateless AWS SDK v3 client (module-level - require() is cached anyway).
let DynamoDBClient = null;
let DynamoDBCommands = null;



/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. One call = one independent instance with its own
Lib, CONFIG, and DynamoDB admin client.

@param {Object} shared_libs - Lib container with Utils, Debug, Instance
@param {Object} config - Overrides merged over module config defaults

@return {Object} - Public interface for this module
*********************************************************************/
module.exports = function loader (shared_libs, config) {

  // Dependencies for this instance
  const Lib = {
    Utils: shared_libs.Utils,
    Debug: shared_libs.Debug,
    Instance: shared_libs.Instance
  };

  // Merge overrides over defaults
  const CONFIG = Object.assign(
    {},
    require('./dynamodb-admin.config'),
    config || {}
  );

  // Error catalog (frozen, owned by the main module)
  const ERRORS = require('./dynamodb-admin.errors');

  // Validators singleton - Lib, ERRORS, and any static data injected here
  const Validators = require('./dynamodb-admin.validators')(Lib, ERRORS);

  // Validate config immediately so misconfiguration fails at startup
  Validators.validateConfig(CONFIG);

  // Mutable per-instance state (DynamoDBClient lives here)
  const state = {
    client: null
  };

  return createInterface(Lib, CONFIG, ERRORS, Validators, state);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Builds the public interface for one instance. Public and private
functions close over the provided Lib, CONFIG, ERRORS, Validators,
and state.

@param {Object} Lib - Dependency container (Utils, Debug, Instance)
@param {Object} CONFIG - Merged configuration for this instance
@param {Object} ERRORS - Frozen error catalog for this module
@param {Object} Validators - Validators singleton (Lib + ERRORS injected)
@param {Object} state - Mutable state holder (DynamoDBClient reference)

@return {Object} - Public interface for this module
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS, Validators, state) {

  ///////////////////////////Public Functions START//////////////////////////////
  const DynamoDBAdmin = {

    // ~~~~~~~~~~~~~~~~~~~~ Table Management ~~~~~~~~~~~~~~~~~~~~
    // Create, delete, and describe tables with idempotent semantics.

    /********************************************************************
    Create a DynamoDB table. Idempotent: if the table already exists,
    returns success with data.created set to false.

@param {Object} instance - Request instance
@param {Object} options - Function options
@param {String} options.table_name - Name of the table to create
@param {Array} options.attribute_definitions - Attribute definitions [{ name, type: 'S'|'N'|'B' }]
@param {Array} options.key_schema - Key schema [{ name, type: 'HASH'|'RANGE' }]
@param {String} [options.billing_mode] - 'PAY_PER_REQUEST' (default) or 'PROVISIONED'
@param {Array} [options.global_secondary_indexes] - GSI list
@param {Object} [options.provisioned_throughput] - Required if billing_mode is PROVISIONED

@return {Promise<Object>} - { success, data, error }
    *********************************************************************/
    createTable: async function (instance, options) {

      // Validate options (throws TypeError on programmer error)
      Validators.validateCreateTable(options);

      // Ensure DynamoDB admin client is initialized
      await _DynamoDBAdmin.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Transform caller-friendly attribute definitions into AWS SDK format
        const attribute_definitions = options.attribute_definitions.map(function (a) {

          return { AttributeName: a.name, AttributeType: a.type };

        });

        // Transform caller-friendly key schema into AWS SDK format
        const key_schema = options.key_schema.map(function (k) {

          return { AttributeName: k.name, KeyType: k.type };

        });

        // Build base CreateTable params with table name, attributes, and key schema
        const service_params = {
          TableName: options.table_name,
          AttributeDefinitions: attribute_definitions,
          KeySchema: key_schema,
          BillingMode: options.billing_mode || 'PAY_PER_REQUEST'
        };

        // Add global secondary indexes if provided
        if (!Lib.Utils.isEmpty(options.global_secondary_indexes)) {

          service_params.GlobalSecondaryIndexes = options.global_secondary_indexes.map(function (gsi) {

            return {
              IndexName: gsi.name,
              KeySchema: gsi.key_schema.map(function (k) {

                return { AttributeName: k.name, KeyType: k.type };

              }),
              Projection: { ProjectionType: gsi.projection_type || 'ALL' }
            };

          });

        }

        // Add provisioned throughput if billing mode is PROVISIONED
        if (!Lib.Utils.isNullOrUndefined(options.provisioned_throughput)) {

          service_params.ProvisionedThroughput = options.provisioned_throughput;

        }

        // Execute CreateTable command
        const command = new DynamoDBCommands.CreateTableCommand(service_params);
        await state.client.send(command);

        Lib.Debug.performanceAuditLog('End', 'DynamoDBAdmin createTable', start_ms);

        // Return successful response with created flag
        return {
          success: true,
          data: { created: true },
          error: null
        };

      } catch (error) {

        // DynamoDB returns ResourceInUseException when the table already exists
        if (error.name === 'ResourceInUseException') {

          Lib.Debug.performanceAuditLog('End', 'DynamoDBAdmin createTable', start_ms);

          // Table already exists - idempotent success without creating
          return {
            success: true,
            data: { created: false },
            error: null
          };

        }

        Lib.Debug.debug('DynamoDBAdmin createTable failed', {
          type: ERRORS.ADMIN_OPERATION_FAILED.type,
          table: options.table_name,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          data: { created: false },
          error: ERRORS.ADMIN_OPERATION_FAILED
        };

      }

    },


    /********************************************************************
    Wait for a table to reach ACTIVE state. Polls DescribeTable
    until the table is ACTIVE or the timeout expires.

@param {Object} instance - Request instance
@param {Object} options - Function options
@param {String} options.table_name - Name of the table to wait for
@param {Number} [options.timeout_seconds] - Max wait time (default: config WAIT_TIMEOUT_SECONDS)

@return {Promise<Object>} - { success, data, error }
    *********************************************************************/
    waitForTableActive: async function (instance, options) {

      // Validate options (throws TypeError on programmer error)
      Validators.validateWaitForTableActive(options);

      // Ensure DynamoDB admin client is initialized
      await _DynamoDBAdmin.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Determine timeout: explicit override or config default
      const timeout_seconds = options.timeout_seconds || CONFIG.WAIT_TIMEOUT_SECONDS;

      // Calculate deadline as a Unix timestamp for comparison
      const deadline = Math.floor(Date.now() / 1000) + timeout_seconds;

      try {

        // Poll DescribeTable until ACTIVE or timeout
        while (true) {

          // Send DescribeTable command to check current table status
          const command = new DynamoDBCommands.DescribeTableCommand({ TableName: options.table_name });
          const response = await state.client.send(command);

          // Check if table has reached ACTIVE state
          const table_status = response.Table.TableStatus;

          if (table_status === 'ACTIVE') {

            Lib.Debug.performanceAuditLog('End', 'DynamoDBAdmin waitForTableActive', start_ms);

            // Table is active - return success
            return {
              success: true,
              data: { table_name: options.table_name, status: 'ACTIVE' },
              error: null
            };

          }

          // Check if timeout has expired
          const now = Math.floor(Date.now() / 1000);

          if (now >= deadline) {

            Lib.Debug.debug('DynamoDBAdmin waitForTableActive timeout', {
              type: ERRORS.ADMIN_WAIT_TIMEOUT.type,
              table: options.table_name,
              last_status: table_status
            });

            // Return timeout error response
            return {
              success: false,
              data: { table_name: options.table_name, status: table_status },
              error: ERRORS.ADMIN_WAIT_TIMEOUT
            };

          }

          // Sleep 2 seconds before next poll to avoid throttling
          await new Promise(function (resolve) {

            global.setTimeout(resolve, 2000);

          });

        }

      } catch (error) {

        Lib.Debug.debug('DynamoDBAdmin waitForTableActive failed', {
          type: ERRORS.ADMIN_OPERATION_FAILED.type,
          table: options.table_name,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          data: { table_name: options.table_name, status: null },
          error: ERRORS.ADMIN_OPERATION_FAILED
        };

      }

    },


    /********************************************************************
    Enable TTL on a DynamoDB table. Idempotent: if TTL is already
    enabled on the same attribute, returns success with data.enabled
    set to false. If TTL is enabled on a DIFFERENT attribute, returns
    an ADMIN_TTL_CONFLICT error.

@param {Object} instance - Request instance
@param {Object} options - Function options
@param {String} options.table_name - Name of the table
@param {String} options.attribute_name - Attribute to use for TTL

@return {Promise<Object>} - { success, data, error }
    *********************************************************************/
    enableTtl: async function (instance, options) {

      // Validate options (throws TypeError on programmer error)
      Validators.validateEnableTtl(options);

      // Ensure DynamoDB admin client is initialized
      await _DynamoDBAdmin.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Check current TTL configuration before modifying
        const describe_command = new DynamoDBCommands.DescribeTimeToLiveCommand({ TableName: options.table_name });
        const describe_response = await state.client.send(describe_command);

        // Extract current TTL status and attribute from the response
        const ttl_description = describe_response.TimeToLiveDescription;
        const current_status = ttl_description ? ttl_description.TimeToLiveStatus : 'DISABLED';
        const current_attribute = ttl_description ? ttl_description.AttributeName : null;

        // TTL already enabled on the same attribute - idempotent success
        if (current_status === 'ENABLED' && current_attribute === options.attribute_name) {

          Lib.Debug.performanceAuditLog('End', 'DynamoDBAdmin enableTtl', start_ms);

          // TTL already enabled on requested attribute - idempotent success
          return {
            success: true,
            data: { enabled: false },
            error: null
          };

        }

        // TTL enabled on a DIFFERENT attribute - operational conflict
        if (current_status === 'ENABLED' && current_attribute !== options.attribute_name) {

          Lib.Debug.debug('DynamoDBAdmin enableTtl TTL conflict', {
            type: ERRORS.ADMIN_TTL_CONFLICT.type,
            table: options.table_name,
            existing_attribute: current_attribute,
            requested_attribute: options.attribute_name
          });

          // Return conflict error response
          return {
            success: false,
            data: { enabled: false },
            error: ERRORS.ADMIN_TTL_CONFLICT
          };

        }

        // No TTL enabled yet (or being disabled) - enable it on the requested attribute
        const update_command = new DynamoDBCommands.UpdateTimeToLiveCommand({
          TableName: options.table_name,
          TimeToLiveSpecification: {
            AttributeName: options.attribute_name,
            Enabled: true
          }
        });
        await state.client.send(update_command);

        Lib.Debug.performanceAuditLog('End', 'DynamoDBAdmin enableTtl', start_ms);

        // Return successful response with enabled flag
        return {
          success: true,
          data: { enabled: true },
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('DynamoDBAdmin enableTtl failed', {
          type: ERRORS.ADMIN_OPERATION_FAILED.type,
          table: options.table_name,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          data: { enabled: false },
          error: ERRORS.ADMIN_OPERATION_FAILED
        };

      }

    },


    /********************************************************************
    Delete a DynamoDB table. Idempotent: if the table does not exist,
    returns success with data.deleted set to false.

@param {Object} instance - Request instance
@param {Object} options - Function options
@param {String} options.table_name - Name of the table to delete

@return {Promise<Object>} - { success, data, error }
    *********************************************************************/
    deleteTable: async function (instance, options) {

      // Validate options (throws TypeError on programmer error)
      Validators.validateDeleteTable(options);

      // Ensure DynamoDB admin client is initialized
      await _DynamoDBAdmin.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Execute DeleteTable command
        const command = new DynamoDBCommands.DeleteTableCommand({ TableName: options.table_name });
        await state.client.send(command);

        Lib.Debug.performanceAuditLog('End', 'DynamoDBAdmin deleteTable', start_ms);

        // Return successful response with deleted flag
        return {
          success: true,
          data: { deleted: true },
          error: null
        };

      } catch (error) {

        // DynamoDB returns ResourceNotFoundException when the table does not exist
        if (error.name === 'ResourceNotFoundException') {

          Lib.Debug.performanceAuditLog('End', 'DynamoDBAdmin deleteTable', start_ms);

          // Table does not exist - idempotent success without deleting
          return {
            success: true,
            data: { deleted: false },
            error: null
          };

        }

        Lib.Debug.debug('DynamoDBAdmin deleteTable failed', {
          type: ERRORS.ADMIN_OPERATION_FAILED.type,
          table: options.table_name,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          data: { deleted: false },
          error: ERRORS.ADMIN_OPERATION_FAILED
        };

      }

    },


    /********************************************************************
    Describe a DynamoDB table. Returns a normalized subset of the
    table description: status, key schema, and TTL status.

@param {Object} instance - Request instance
@param {Object} options - Function options
@param {String} options.table_name - Name of the table to describe

@return {Promise<Object>} - { success, data, error }
    *********************************************************************/
    describeTable: async function (instance, options) {

      // Validate options (throws TypeError on programmer error)
      Validators.validateDescribeTable(options);

      // Ensure DynamoDB admin client is initialized
      await _DynamoDBAdmin.initIfNot();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Execute DescribeTable command
        const command = new DynamoDBCommands.DescribeTableCommand({ TableName: options.table_name });
        const response = await state.client.send(command);

        // Normalize the table description into a consumer-friendly subset
        const table = response.Table;
        const normalized = {
          table_name: table.TableName,
          status: table.TableStatus,
          key_schema: table.KeySchema.map(function (k) {

            return { name: k.AttributeName, type: k.KeyType };

          }),
          billing_mode: table.BillingModeSummary ? table.BillingModeSummary.BillingMode : 'PROVISIONED',
          item_count: table.ItemCount || 0,
          creation_date: table.CreationDateTime || null
        };

        Lib.Debug.performanceAuditLog('End', 'DynamoDBAdmin describeTable', start_ms);

        // Return successful response with normalized table description
        return {
          success: true,
          data: { table: normalized },
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('DynamoDBAdmin describeTable failed', {
          type: ERRORS.ADMIN_OPERATION_FAILED.type,
          table: options.table_name,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          data: { table: null },
          error: ERRORS.ADMIN_OPERATION_FAILED
        };

      }

    },


    // ~~~~~~~~~~~~~~~~~~~~ Lifecycle ~~~~~~~~~~~~~~~~~~~~
    // Connection health check and graceful teardown.

    /********************************************************************
    Ping the DynamoDB service with admin credentials. Uses ListTables
    with a limit of 1 to verify the connection is alive and the
    credentials are valid.

@param {Object} instance - Request instance

@return {Promise<Object>} - { success, data, error }
    *********************************************************************/
    ping: async function (instance) { // eslint-disable-line no-unused-vars

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Initialize inside try: a failed connection is an operational
        // outcome for a health check, not an exception to propagate
        await _DynamoDBAdmin.initIfNot();

        // Execute ListTables command with limit 1 to verify connectivity
        const command = new DynamoDBCommands.ListTablesCommand({ Limit: 1 });
        await state.client.send(command);

        Lib.Debug.performanceAuditLog('End', 'DynamoDBAdmin ping', start_ms);

        // Return successful response - connection alive, credentials valid
        return {
          success: true,
          data: { ok: true },
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('DynamoDBAdmin ping failed', {
          type: ERRORS.ADMIN_CONNECTION_FAILED.type,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          data: { ok: false },
          error: ERRORS.ADMIN_CONNECTION_FAILED
        };

      }

    },


    /********************************************************************
    Close the DynamoDB admin connection for this instance. Destroys
    the underlying client. Idempotent: closing an already-closed
    connection succeeds.

@param {Object} instance - Request instance

@return {Promise<Object>} - { success, error }
    *********************************************************************/
    close: async function (instance) { // eslint-disable-line no-unused-vars

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      try {

        // Destroy only if a client was ever created (idempotent on repeat calls)
        if (!Lib.Utils.isNullOrUndefined(state.client)) {

          // Release the connection and clear cached reference so a
          // subsequent call re-initializes from scratch
          state.client.destroy();
          state.client = null;

        }

        Lib.Debug.performanceAuditLog('End', 'DynamoDBAdmin close', start_ms);

        // Return successful response
        return {
          success: true,
          error: null
        };

      } catch (error) {

        Lib.Debug.debug('DynamoDBAdmin close failed', {
          type: ERRORS.ADMIN_CONNECTION_FAILED.type,
          message: error.message,
          code: error.code || null,
          stack: error.stack
        });

        // Return error response
        return {
          success: false,
          error: ERRORS.ADMIN_CONNECTION_FAILED
        };

      }

    }

  };///////////////////////////Public Functions END//////////////////////////////



  //////////////////////////Private Functions START//////////////////////////////
  const _DynamoDBAdmin = {

    /********************************************************************
    Lazy-load the AWS SDK v3 DynamoDB client and commands. Shared
    across every instance because the SDK modules themselves are
    stateless - only the DynamoDBClient holds per-instance state.

@return {void}
    *********************************************************************/
    ensureAdapter: function () {

      // DynamoDBClient class (shared across instances)
      if (Lib.Utils.isNullOrUndefined(DynamoDBClient)) {
        const sdk = require('@aws-sdk/client-dynamodb');
        DynamoDBClient = sdk.DynamoDBClient;
        DynamoDBCommands = {
          CreateTableCommand: sdk.CreateTableCommand,
          DeleteTableCommand: sdk.DeleteTableCommand,
          DescribeTableCommand: sdk.DescribeTableCommand,
          DescribeTimeToLiveCommand: sdk.DescribeTimeToLiveCommand,
          UpdateTimeToLiveCommand: sdk.UpdateTimeToLiveCommand,
          ListTablesCommand: sdk.ListTablesCommand
        };
      }

    },


    /********************************************************************
    Create this instance's DynamoDBClient on first use. Connects to
    the DynamoDB service with admin credentials and caches the client
    reference in state.

@return {Promise<void>}
    *********************************************************************/
    initIfNot: async function () {

      // Already built
      if (!Lib.Utils.isNullOrUndefined(state.client)) {
        return;
      }

      // Adapter must be loaded before client creation
      _DynamoDBAdmin.ensureAdapter();

      const start_ms = Lib.Utils.getUnixTimeInMilliSeconds();

      // Build client options with region
      const client_options = {
        region: CONFIG.AWS_REGION
      };

      // Inject explicit credentials if provided via config
      if (!Lib.Utils.isNullOrUndefined(CONFIG.AWS_ACCESS_KEY_ID) && !Lib.Utils.isNullOrUndefined(CONFIG.AWS_SECRET_ACCESS_KEY)) {

        client_options.credentials = {
          accessKeyId: CONFIG.AWS_ACCESS_KEY_ID,
          secretAccessKey: CONFIG.AWS_SECRET_ACCESS_KEY
        };

      }

      // Set custom endpoint for DynamoDB Local (emulated testing)
      if (!Lib.Utils.isNullOrUndefined(CONFIG.ENDPOINT)) {

        client_options.endpoint = CONFIG.ENDPOINT;

      }

      // Build DynamoDB client with admin credentials
      state.client = new DynamoDBClient(client_options);

      Lib.Debug.performanceAuditLog('End', 'DynamoDBAdmin Client', start_ms);
      Lib.Debug.info('DynamoDBAdmin Client Initialized', {
        region: CONFIG.AWS_REGION,
        endpoint: CONFIG.ENDPOINT || null
      });

    }

  };//////////////////////////Private Functions END/////////////////////////////



  // Return public interface
  return DynamoDBAdmin;

};/////////////////////////// createInterface END ///////////////////////////////
