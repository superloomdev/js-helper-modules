// Info: Express (Docker) adapter for js-server-helper-http-gateway.
// Reads from the Express req object and returns normalized request data.
// getCountryCode always returns null - Express has no CDN layer.
// Projects fronting Express with CloudFront can override via a custom adapter.
//
// Standalone module. Builds its own Lib, defines its own ERRORS, validates
// its own config. Returns a ready-to-use adapter object.
//
// Adapter contract:
//   extractRequest(raw_request, raw_context, response_callback)
//   buildResponseEnvelope(status, headers, body)
//   getCountryCode(headers) -> String | null
//
// Compatibility: Node.js 24+
'use strict';


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Standalone adapter loader. One call = one independent adapter instance
closed over its own Lib and ERRORS. The adapter builds its own dependencies
and validates its own config.

@param {Object} config - Adapter configuration (none required for Express)

@return {Object} - Ready-to-use adapter: { extractRequest, buildResponseEnvelope, getCountryCode }
*********************************************************************/
module.exports = function loader (config) {

  // ==================== BUILD OWN LIB ======================= //

  const Lib = {};

  Lib.Utils = require('@superloomdev/js-helper-utils')(Lib, {});
  Lib.Debug = require('@superloomdev/js-helper-debug')(Lib, { LOG_LEVEL: 'error' });


  // ==================== DEFINE OWN ERRORS ======================= //

  const ERRORS = Object.freeze({
    ADAPTER_ERROR: {
      type: 'HTTP_GATEWAY_ADAPTER_EXPRESS_ERROR',
      message: 'Express adapter encountered an error'
    }
  });


  // ==================== VALIDATE CONFIG ======================= //

  // Express adapter requires no configuration
  if (config && !Lib.Utils.isObject(config)) {
    throw new Error('[js-server-helper-http-gateway-adapter-express] config must be an object or null/undefined');
  }


  // ==================== RETURN READY ADAPTER ======================= //

  return createInterface(Lib, ERRORS);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Build the public Adapter interface closed over Lib and ERRORS.

@param {Object} Lib     - Dependency container (Utils, Debug)
@param {Object} _ERRORS - Frozen error catalog (reserved for future error reporting)

@return {Object} - { extractRequest, buildResponseEnvelope, getCountryCode }
*********************************************************************/
const createInterface = function (Lib, _ERRORS) {

  ////////////////////////////// Public Functions START ////////////////////////
  const Adapter = {

    /********************************************************************
    Extract normalized HTTP request data from an Express req object.
    Reads headers, query, body, params, cookies, and method directly
    from the Express request object.

    Express is expected to be configured with:
    - express.json() or express.urlencoded() middleware for body parsing
    - cookie-parser middleware for req.cookies (optional; falls back to
      parsing the raw Cookie header if req.cookies is absent)

    Returned fields:
    headers          {Object} - Lowercase header key -> value map
    cookies          {Object} - Parsed cookies map
    query            {Object} - Query-string parameters (req.query)
    body             {Object} - Request body (req.body)
    params           {Object} - Path parameters (req.params)
    method           {String} - HTTP method ('GET', 'POST', ...)
    url              {String} - Request URL path with query string
    response_handler {Function} - Wraps Express res

    @param {Object}   raw_request       - Express req object
    @param {Object}   raw_context       - Unused (no execution context in Express)
    @param {Object}   response_callback - Express res object

    @return {Object} - Normalized request fields plus response_handler
    *********************************************************************/
    extractRequest: function (raw_request, _raw_context, response_callback) {

      const req = raw_request || {};

      // Express already lowercases header keys
      const headers = (req.headers && Lib.Utils.isObject(req.headers))
        ? req.headers
        : {};

      // Prefer pre-parsed req.cookies (cookie-parser); fall back to raw header
      let cookies;

      if (req.cookies && Lib.Utils.isObject(req.cookies)) {
        cookies = req.cookies;
      } else {
        cookies = _Adapter.parseCookieHeader(headers['cookie'] || '');
      }

      // Build the response handler that wraps Express res
      const response_handler = function (_err, response) {

        // Guard: response_callback must be a valid Express res object
        if (!response_callback || !Lib.Utils.isFunction(response_callback.status)) {
          return;
        }

        const res = response_callback;
        const status_code = response.statusCode || 200;
        const headers_map = response.headers || {};
        const body = response.body;

        // Set HTTP status code
        res.status(status_code);

        // Apply response headers
        const header_keys = Object.keys(headers_map);

        for (let i = 0; i < header_keys.length; i++) {
          res.set(header_keys[i], headers_map[header_keys[i]]);
        }

        // Send response body
        res.send(body);

      };

      // Build and return the normalized request object
      return {
        headers: headers,
        cookies: cookies,
        query  : (req.query && Lib.Utils.isObject(req.query)) ? req.query : {},
        body   : (req.body && Lib.Utils.isObject(req.body)) ? req.body : {},
        params : (req.params && Lib.Utils.isObject(req.params)) ? req.params : {},
        method : req.method ? req.method.toUpperCase() : null,
        url    : req.originalUrl || req.url || '',
        response_handler: response_handler
      };

    },


    /********************************************************************
    Build the Express-compatible response envelope. Produces a plain
    object with statusCode, headers, and body - the same shape used by
    the gateway's returnHttpResponse logic. The actual send is performed
    by the response_handler returned from extractRequest.

    Body normalization rules:
    null / undefined  -> ''
    Buffer            -> base64 string
    Object            -> JSON.stringify
    Anything else     -> String(value)

    @param {Integer} status  - HTTP status code
    @param {Object}  headers - Response headers map
    @param {*}       body    - Response body (string, object, Buffer, or null)

    @return {Object} - { statusCode, headers, body }
    *********************************************************************/
    buildResponseEnvelope: function (status, headers, body) {

      // Initialize response body
      let normalized_body = '';

      // Normalize body based on its type
      if (!Lib.Utils.isNullOrUndefined(body)) {

        // Buffer -> base64 encode
        if (Buffer.isBuffer(body)) {
          normalized_body = body.toString('base64');
        } else if (Lib.Utils.isObject(body)) {
          // Object -> JSON stringify
          normalized_body = JSON.stringify(body);
        } else {
          // Everything else -> string
          normalized_body = String(body);
        }

      }

      // Build the Express response envelope
      return {
        statusCode: status,
        headers   : headers || {},
        body      : normalized_body
      };

    },


    /********************************************************************
    Express has no CDN layer - always returns null.
    Projects fronting Express with CloudFront can implement a custom
    adapter that reads the CloudFront-Viewer-Country forwarded header.

    @param {Object} _headers - Request headers (unused)

    @return {null}
    *********************************************************************/
    getCountryCode: function (_headers) {
      return null;
    }

  };////////////////////////////// Public Functions END ////////////////////////



  ////////////////////////////// Private Functions START ///////////////////////
  const _Adapter = {

    /********************************************************************
    Parse a raw Cookie header string into a key/value map.
    Used as fallback when cookie-parser middleware is not installed.

    @param {String} cookie_header - Raw value of the Cookie header

    @return {Object} - { name: value, ... }
    *********************************************************************/
    parseCookieHeader: function (cookie_header) {

      // Initialize empty result map
      const result = {};

      // Guard: return empty object for invalid input
      if (!cookie_header || !Lib.Utils.isString(cookie_header)) {
        return result;
      }

      // Split header into name=value pairs
      const pairs = cookie_header.split(';');

      // Parse each pair
      for (let i = 0; i < pairs.length; i++) {

        const pair = pairs[i].trim();
        const eq_idx = pair.indexOf('=');

        // Skip malformed pairs without an equals sign
        if (eq_idx < 1) {
          continue;
        }

        // Extract key and value
        const key = pair.slice(0, eq_idx).trim();
        const val = pair.slice(eq_idx + 1).trim();

        // Store decoded cookie value
        if (key) {
          result[key] = decodeURIComponent(val);
        }

      }

      return result;

    }

  };///////////////////////////// Private Functions END ////////////////////////

  return Adapter;

};///////////////////////////// createInterface END /////////////////////////////
