// Info: Test loader for helper-http-gateway-adapter-aws-apigateway.
// Builds the base Lib container (Utils, Debug, Instance) and loads the
// http-gateway with this AWS API Gateway adapter injected. Tests can then
// feed real AWS event fixtures through the full pipeline (adapter -> gateway)
// and inspect both the populated instance and the Lambda response envelope.
'use strict';


const HttpGateway                  = require('helper-http-gateway');
const HttpGatewayAdapterAwsApiGateway = require('helper-http-gateway-adapter-aws-apigateway');


/********************************************************************
Build the dependency container and a configured gateway for tests.
The gateway is wired with the AWS API Gateway adapter so test
handlers can invoke gateway methods directly against real API
Gateway v2.0 event fixtures.

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

  // HTTP Gateway (with this AWS API Gateway adapter injected)
  const AwsAdapter = HttpGatewayAdapterAwsApiGateway(Lib, {});
  const httpGateway = HttpGateway(Lib, { Adapter: AwsAdapter });

  return { Lib: Lib, httpGateway: httpGateway };

};
