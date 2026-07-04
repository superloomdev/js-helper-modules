// Info: Test loader for js-server-helper-http-gateway-adapter-express. Builds the
// base Lib container (Utils, Debug, Instance) used by all tests, then loads the
// http-gateway with this Express adapter injected. Returns both Lib and a
// ready-to-use gateway instance so tests can register Express routes that
// flow through the real adapter pipeline end-to-end.
'use strict';


const HttpGateway                   = require('helper-http-gateway');
const HttpGatewayAdapterExpressHttp = require('helper-http-gateway-adapter-express');


/********************************************************************
Build the dependency container and a configured gateway for tests.
The gateway is wired with the Express adapter so registered Express
route handlers can invoke gateway methods directly.

@return {Object} - { Lib, httpGateway }
*********************************************************************/
module.exports = function loader () {

  // Dependencies for this instance
  const Lib = {};

  // Foundation modules
  Lib.Utils = require('helper-utils')(Lib, {});
  Lib.Debug = require('helper-debug')(Lib, {});
  Lib.Time = require('helper-time')(Lib, {});

  // Server helper modules
  Lib.Instance = require('helper-instance')(Lib, {});

  // HTTP Gateway (with this Express adapter injected)
  const ExpressAdapter = HttpGatewayAdapterExpressHttp(Lib, {});
  const httpGateway = HttpGateway(Lib, { Adapter: ExpressAdapter });

  return { Lib: Lib, httpGateway: httpGateway };

};
