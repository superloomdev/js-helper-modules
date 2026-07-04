// Info: AWS Lambda + API Gateway adapter for helper-http-gateway.
// Normalizes API Gateway payload format v2.0 (HTTP API / Lambda Function URLs)
// into the standard instance.http_request shape consumed by the gateway.
//
// Fully independent: builds its own Lib, owns its own CONFIG, ERRORS, and
// Validators. Returns a ready-to-use adapter object that the parent
// consumes via CONFIG.Adapter.
//
// Adapter contract:
//   extractRequest(raw_request, raw_context, response_callback)
//   buildResponseEnvelope(status, headers, body)
//   getCountryCode(headers) -> String | null
//
// Reference: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
//
// Compatibility: Node.js 24+
'use strict';


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Thin loader. Builds own Lib and ERRORS from peer dependencies,
validates config via the Validators singleton, then delegates to
createInterface. Each call returns an independent Adapter instance.

@param {Object} config - Overrides merged over adapter config defaults
                         ({ LOG_LEVEL, ... } - adapter-specific)

@return {Object} - Adapter interface (the parent's adapter contract)
*********************************************************************/
module.exports = function loader (config) {

  // Merge overrides over adapter config defaults
  const CONFIG = Object.assign(
    {},
    require('./adapter.config'),
    config || {}
  );

  // Build own Lib container from aliased peer dependencies
  const Lib = {};
  Lib.Utils = require('helper-utils')(Lib, {});
  Lib.Debug = require('helper-debug')(Lib, { LOG_LEVEL: CONFIG.LOG_LEVEL });

  // Own frozen error catalog
  const ERRORS = require('./adapter.errors');

  // Load the validators singleton and inject Lib + ERRORS
  const Validators = require('./adapter.validators')(Lib, ERRORS);

  // Validate config - throws on misconfiguration
  Validators.validateConfig(CONFIG);

  // Build the public Adapter interface
  return createInterface(Lib, CONFIG, ERRORS, Validators);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Build the public Adapter interface closed over Lib, CONFIG, ERRORS,
and Validators. Statelessness means createInterface closes over nothing
beyond its four fixed slots.

@param {Object} Lib         - Dependency container (Utils, Debug)
@param {Object} _CONFIG     - Merged configuration (used at loader time only)
@param {Object} _ERRORS     - Frozen error catalog (used at loader time only)
@param {Object} _Validators - Validators singleton (used at loader time only)

@return {Object} - { extractRequest, buildResponseEnvelope, getCountryCode }
*********************************************************************/
const createInterface = function (Lib, _CONFIG, _ERRORS, _Validators) {

  ////////////////////////////// Public Functions START ////////////////////////
  const Adapter = {

    /********************************************************************
    Extract normalized HTTP request data from a raw API Gateway payload
    format v2.0 event (HTTP API or Lambda Function URLs).

    Returned fields:
    headers          {Object}   - Lowercase header key -> value map
    cookies          {Object}   - Parsed cookies map
    query            {Object}   - Query-string parameters
    body             {Object}   - Parsed body parameters
    params           {Object}   - Path parameters
    method           {String}   - HTTP method ('GET', 'POST', ...)
    url              {String}   - Request URL path with query string
    response_handler {Function} - Wraps the Lambda callback

    @param {Object}   raw_request       - Raw API Gateway v2.0 event
    @param {Object}   raw_context       - Lambda execution context (unused)
    @param {Function} response_callback - Lambda callback function(err, response)

    @return {Object} - Normalized request fields plus response_handler
    *********************************************************************/
    extractRequest: function (raw_request, _raw_context, response_callback) {

      const event = raw_request || {};

      const headers = _Adapter.lowercaseHeaders(event.headers);

      // Cookies: API Gateway payload format v2.0 delivers them as event.cookies array
      const cookies = Array.isArray(event.cookies)
        ? _Adapter.parseCookieHeader(event.cookies.join('; '))
        : {};

      // Query string parameters
      const get_params = event.queryStringParameters || {};

      // Path parameters
      const path_params = event.pathParameters || {};

      // HTTP method: v2 nests it under requestContext.http.method
      const method = (event.requestContext &&
                    event.requestContext.http &&
                    event.requestContext.http.method)
        ? event.requestContext.http.method.toUpperCase()
        : null;

      const post_params = _Adapter.parseBody(event, headers);

      // URL: rawPath + rawQueryString (API Gateway v2.0 payload)
      const raw_path = event.rawPath || '';
      const raw_qs = event.rawQueryString || '';
      const url = raw_qs ? raw_path + '?' + raw_qs : raw_path;

      // Build the response handler that wraps the Lambda callback
      const response_handler = function (err, response) {
        if (Lib.Utils.isFunction(response_callback)) {
          response_callback(err, response);
        }
      };

      return {
        headers: headers,
        cookies: cookies,
        query  : get_params,
        body   : post_params,
        params : path_params,
        method : method,
        url    : url,
        response_handler: response_handler
      };

    },


    /********************************************************************
    Build the API Gateway response envelope. API Gateway expects
    { statusCode, headers, body, isBase64Encoded }.

    Body normalization rules:
    null / undefined  -> ''
    Buffer            -> base64 string (isBase64Encoded = true)
    Object            -> JSON.stringify
    Anything else     -> String(value)

    @param {Integer} status  - HTTP status code
    @param {Object}  headers - Response headers map
    @param {*}       body    - Response body (string, object, Buffer, or null)

    @return {Object} - { statusCode, headers, body, isBase64Encoded }
    *********************************************************************/
    buildResponseEnvelope: function (status, headers, body) {

      // Initialize response envelope fields
      let normalized_body = '';
      let is_base64 = false;

      // Normalize body based on its type
      if (!Lib.Utils.isNullOrUndefined(body)) {

        // Buffer -> base64 encode
        if (Buffer.isBuffer(body)) {
          normalized_body = body.toString('base64');
          is_base64 = true;
        } else if (Lib.Utils.isObject(body)) {
          // Object -> JSON stringify
          normalized_body = JSON.stringify(body);
        } else {
          // Everything else -> string
          normalized_body = String(body);
        }

      }

      // Build the API Gateway response envelope
      return {
        statusCode     : status,
        headers        : headers || {},
        body           : normalized_body,
        isBase64Encoded: is_base64
      };

    },


    /********************************************************************
    Return the viewer country code if supplied by CloudFront via the
    CloudFront-Viewer-Country header (forwarded through API Gateway).
    Returns null when not present.

    @param {Object} headers - Lowercase request headers

    @return {String|null} - ISO 3166-1 alpha-2 country code, or null
    *********************************************************************/
    getCountryCode: function (headers) {

      if (
        !Lib.Utils.isNullOrUndefined(headers) &&
        !Lib.Utils.isNullOrUndefined(headers['cloudfront-viewer-country'])
      ) {
        return headers['cloudfront-viewer-country'];
      }

      return null;

    }

  };////////////////////////////// Public Functions END ////////////////////////



  ////////////////////////////// Private Functions START ///////////////////////
  const _Adapter = {

    /********************************************************************
    Parse a raw Cookie header string into a key/value map.
    Returns empty object on empty or missing input.

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

    },


    /********************************************************************
    Parse a URL-encoded body string (application/x-www-form-urlencoded)
    into a key/value map. Returns empty object on empty or missing input.

    @param {String} body - URL-encoded body string

    @return {Object} - { key: value, ... }
    *********************************************************************/
    parseUrlEncodedBody: function (body) {

      // Initialize empty result map
      const result = {};

      // Guard: return empty object for invalid input
      if (!body || !Lib.Utils.isString(body)) {
        return result;
      }

      // Parse URL-encoded string into key-value pairs
      const params = new URLSearchParams(body);

      // Transfer parsed values to result object
      params.forEach(function (value, key) {
        result[key] = value;
      });

      return result;

    },


    /********************************************************************
    Normalize all header keys to lowercase. API Gateway may deliver
    headers with mixed casing depending on version and origin.

    @param {Object} raw_headers - Headers object from the event

    @return {Object} - New object with all keys lowercased
    *********************************************************************/
    lowercaseHeaders: function (raw_headers) {

      // Guard: return empty object for invalid input
      if (!raw_headers || !Lib.Utils.isObject(raw_headers)) {
        return {};
      }

      // Initialize result object for lowercased headers
      const result = {};

      // Get all header keys from raw headers
      const keys = Object.keys(raw_headers);

      // Lowercase each header key and copy value
      for (let i = 0; i < keys.length; i++) {
        result[keys[i].toLowerCase()] = raw_headers[keys[i]];
      }

      return result;

    },


    /********************************************************************
    Parse the POST body from an API Gateway event. Detects content-type
    and parses accordingly. Returns empty object when body is absent.

    @param {Object} event   - Raw API Gateway event
    @param {Object} headers - Lowercase headers map (already normalized)

    @return {Object} - Parsed body as key/value map
    *********************************************************************/
    parseBody: function (event, headers) {

      // Extract raw body from event
      const raw_body = event.body;

      // Guard: return empty object when body is absent
      if (!raw_body) {
        return {};
      }

      // Decode base64 body if necessary
      const decoded_body = event.isBase64Encoded
        ? Buffer.from(raw_body, 'base64').toString('utf8')
        : raw_body;

      // Extract lowercase content-type header
      const content_type = (headers['content-type'] || '').toLowerCase();

      // Parse JSON content type
      if (content_type.includes('application/json')) {

        try {
          const parsed = JSON.parse(decoded_body);
          // Return parsed object only if it's a valid plain object (not array/null)
          return (!Lib.Utils.isNullOrUndefined(parsed) && Lib.Utils.isObject(parsed) && !Array.isArray(parsed))
            ? parsed
            : {};
        } catch {
          // Return empty object on JSON parse failure
          return {};
        }

      }

      // Parse URL-encoded content type
      if (content_type.includes('application/x-www-form-urlencoded')) {
        return _Adapter.parseUrlEncodedBody(decoded_body);
      }

      // Default: return empty object for unsupported content types
      return {};

    }

  };///////////////////////////// Private Functions END ////////////////////////

  return Adapter;

};///////////////////////////// createInterface END /////////////////////////////
