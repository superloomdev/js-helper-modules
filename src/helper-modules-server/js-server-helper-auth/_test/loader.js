// Info: Test loader for helper-auth. Builds the base Lib
// container (Utils, Debug, Crypto, Instance) used by pure and JWT tests.
// No database drivers are loaded here - auth's own tests use the in-process
// memory store (memory-store.js). Backend integration tests live in the
// standalone store adapter modules.

import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import cryptoLoader from 'helper-crypto';
import instanceLoader from 'helper-instance';


/********************************************************************
Build the dependency container for pure + JWT tests.

No environment variables are read here - auth's own tests use only
the in-process memory store (memory-store.js).

@return {Object} - { Lib }
*********************************************************************/
export default function loader () {

  const config_debug = { LOG_LEVEL: 'error' };


  // ==================== DEPENDENCY CONTAINER ======================= //

  const Lib = {};


  // ==================== FOUNDATION MODULES ========================= //

  Lib.Utils = utilsLoader(Lib, {});
  Lib.Debug = debugLoader(Lib, config_debug);


  // ==================== SERVER HELPER MODULES ====================== //

  Lib.Crypto = cryptoLoader(Lib, {});
  Lib.Instance = instanceLoader(Lib, {});

  // Stub gateway - auth tests only need buildCookie; real serialization
  // is tested inside js-server-helper-http-gateway's own test suite.
  Lib.HttpGateway = {
    buildCookie: function (existing, name, value, ttl) {
      const descriptor = existing ? Object.assign({}, existing) : {};
      descriptor[name] = { value: value, ttl: ttl, options: {} };
      return descriptor;
    }
  };


  return { Lib: Lib };

};
