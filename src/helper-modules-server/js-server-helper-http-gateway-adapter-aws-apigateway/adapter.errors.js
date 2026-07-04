// Info: Error catalog for helper-http-gateway-adapter-aws-apigateway.
// Transport adapters typically do not return error envelopes (the parent
// gateway handles errors). This catalog carries a single construction-time
// type for future use. Frozen to prevent accidental mutation.
'use strict';


module.exports = Object.freeze({

  ADAPTER_ERROR: Object.freeze({
    type: 'HTTP_GATEWAY_ADAPTER_AWS_APIGATEWAY_ERROR',
    message: 'AWS API Gateway adapter encountered an error'
  })

});
