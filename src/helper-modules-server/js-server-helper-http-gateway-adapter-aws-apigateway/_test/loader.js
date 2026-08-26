// Info: Test loader for helper-http-gateway-adapter-aws-apigateway.
// Builds the base Lib container (Utils, Debug, Instance) and loads the
// http-gateway with this AWS API Gateway adapter injected. Tests can then
// feed real AWS event fixtures through the full pipeline (adapter -> gateway)
// and inspect both the populated instance and the Lambda response envelope.
import httpGatewayLoader from 'helper-http-gateway';
import httpGatewayAdapterAwsApiGatewayLoader from 'helper-http-gateway-adapter-aws-apigateway';
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import timeLoader from 'helper-time';
import instanceLoader from 'helper-instance';


/********************************************************************
Build the dependency container and a configured gateway for tests.
The gateway is wired with the AWS API Gateway adapter so test
handlers can invoke gateway methods directly against real API
Gateway v2.0 event fixtures.

@return {Object} - { Lib, httpGateway }
*********************************************************************/
export default function loader () {

  // Dependencies for this instance
  const Lib = {};

  // Foundation modules
  Lib.Utils = utilsLoader(Lib, {});
  Lib.Debug = debugLoader(Lib, {});
  Lib.Time = timeLoader(Lib, {});

  // Server helper modules
  Lib.Instance = instanceLoader(Lib, {});

  // HTTP Gateway (with this AWS API Gateway adapter injected)
  const AwsAdapter = httpGatewayAdapterAwsApiGatewayLoader(Lib, {});
  const httpGateway = httpGatewayLoader(Lib, { Adapter: AwsAdapter });

  return { Lib: Lib, httpGateway: httpGateway };

};
