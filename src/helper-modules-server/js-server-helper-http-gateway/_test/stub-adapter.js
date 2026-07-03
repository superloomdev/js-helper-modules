// Info: Stub adapter for helper-http-gateway tests.
// Satisfies the 3-method adapter contract with minimal fixed-output behavior
// so http-gateway.js can be tested without any real runtime (Lambda or Express).
// This is not a simulation of API Gateway or Express internals - it only
// fulfills the contract signature and returns valid-shaped dummy output.
// Each function operates on the data it is given with no side effects.
//
// Adapter contract:
//   extractRequest(raw_request, raw_context, response_callback)
//   buildResponseEnvelope(status, headers, body)
//   getCountryCode(headers) -> String | null
'use strict';


/********************************************************************
Create a new stub adapter. Returns a ready-to-use adapter object
plus a `sent` array for capturing outbound responses.

Each call produces an independent adapter with its own `sent` array
so tests can run in isolation.

@return {Object} - { adapter, sent }
  adapter {Object} - Ready-to-use adapter with 3-method contract
  sent    {Array}  - Array of { status, headers, body } for each response sent
*********************************************************************/
module.exports = function makeStubAdapter () {

  const sent = [];

  const adapter = {

    /****************************************************************
    Populate instance with normalized HTTP request data from a plain
    raw_request object. The raw_request shape mirrors what real adapters
    produce after normalization - tests pass it pre-normalized so they
    can focus on gateway logic, not wire-format parsing.

    raw_request shape (all keys optional; defaults to empty):
      headers  {Object} - Lowercase header key -> value map
      query    {Object} - Query-string parameters
      body     {Object} - Request body parameters
      params   {Object} - Path parameters
      cookies  {Object} - Parsed cookies
      method   {String} - 'GET' | 'POST' | ...
      url      {String} - Request URL path with query string

    @param {Object}   raw_request       - Pre-normalized request data
    @param {Object}   raw_context       - Ignored by this adapter
    @param {Function} response_callback - Runtime callback wrapper target

    @return {Object} - Normalized request payload + response_handler
    ****************************************************************/
    extractRequest: function (raw_request, _raw_context, response_callback) {

      const req = raw_request || {};

      return {
        headers: req.headers || {},
        cookies: req.cookies || {},
        query  : req.query   || {},
        body   : req.body    || {},
        params : req.params  || {},
        method : req.method  || null,
        url    : req.url     || '',
        response_handler: function (err, response) {

          if (typeof response_callback === 'function') {
            response_callback(err, response);
          }

          sent.push(response);

        }
      };

    },


    /****************************************************************
    Build a response envelope. Returns a plain object that mirrors the
    shape real adapters produce, suitable for test assertions.

    @param {Integer} status  - HTTP status code
    @param {Object}  headers - Response headers map
    @param {*}       body    - Response body (string, object, or Buffer)

    @return {Object} - { status, headers, body }
    ****************************************************************/
    buildResponseEnvelope: function (status, headers, body) {

      // Normalize body to string (same rule as AWS adapter)
      let normalized_body = '';

      if (body !== null && body !== undefined) {

        if (Buffer.isBuffer(body)) {
          normalized_body = body.toString('base64');
        }
        else if (typeof body === 'object') {
          normalized_body = JSON.stringify(body);
        }
        else {
          normalized_body = String(body);
        }

      }

      return {
        status : status,
        headers: headers || {},
        body   : normalized_body
      };

    },


    /****************************************************************
    Return the viewer country code if the adapter can supply it.
    The stub adapter never has this information - returns null.

    @param {Object} _headers - Request headers (unused)

    @return {null}
    ****************************************************************/
    getCountryCode: function (_headers) {
      return null;
    }

  };


  return { adapter: adapter, sent: sent };

};
