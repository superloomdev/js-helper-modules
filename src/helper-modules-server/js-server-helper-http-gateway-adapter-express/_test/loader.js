// Info: Test loader for js-server-helper-http-gateway-adapter-express. Builds the
// base Lib container (Utils, Debug, Instance) used by all tests, then loads the
// http-gateway with this Express adapter injected. Returns both Lib and a
// ready-to-use gateway instance so tests can register Express routes that
// flow through the real adapter pipeline end-to-end.
import httpGatewayLoader from 'helper-http-gateway';
import httpGatewayAdapterExpressLoader from 'helper-http-gateway-adapter-express';
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import timeLoader from 'helper-time';
import instanceLoader from 'helper-instance';


/********************************************************************
Build the dependency container and a configured gateway for tests.
The gateway is wired with the Express adapter so registered Express
route handlers can invoke gateway methods directly.

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

  // HTTP Gateway (with this Express adapter injected)
  const ExpressAdapter = httpGatewayAdapterExpressLoader(Lib, {});
  const httpGateway = httpGatewayLoader(Lib, { Adapter: ExpressAdapter });

  return { Lib: Lib, httpGateway: httpGateway };

};
