// Info: Configuration defaults for js-server-helper-http-gateway.
// Adapter is required at construction time as a ready-to-use object.
// The loader throws if Adapter is still null at startup.
'use strict';


module.exports = {

  // Ready-to-use adapter object. Pass the result of calling the chosen
  // adapter package with its config:
  //   Adapter: require('@superloomdev/js-server-helper-http-gateway-adapter-aws-apigateway')(adapter_config)
  //   Adapter: require('@superloomdev/js-server-helper-http-gateway-adapter-express')(adapter_config)
  // Required.
  Adapter: null

};
