// Info: Error catalog for helper-http-gateway-adapter-express.
// Transport adapters typically do not return error envelopes (the parent
// gateway handles errors). This catalog carries a single construction-time
// type for future use. Frozen to prevent accidental mutation.


export default Object.freeze({

  ADAPTER_ERROR: Object.freeze({
    type: 'HTTP_GATEWAY_ADAPTER_EXPRESS_ERROR',
    message: 'Express adapter encountered an error'
  })

});
