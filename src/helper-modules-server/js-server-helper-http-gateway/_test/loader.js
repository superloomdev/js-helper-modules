// Info: Test loader for helper-http-gateway. Builds the base Lib
// container (Utils, Debug, Instance, Time) used by all gateway tests.
// No adapter packages are loaded here - tests use the in-process
// stub adapter (stub-adapter.js).

import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import timeLoader from 'helper-time';
import instanceLoader from 'helper-instance';


/********************************************************************
Build the dependency container for gateway tests.

No environment variables are read here - the gateway's own tests
use only the in-process stub adapter (stub-adapter.js).

@return {Object} - { Lib }
*********************************************************************/
export default function loader () {

  // Debug config (empty - level controlled by injected Debug)

  // Dependencies for this instance
  const Lib = {};

  // Foundation modules
  Lib.Utils = utilsLoader(Lib, {});
  Lib.Debug = debugLoader(Lib, {});
  Lib.Time = timeLoader(Lib, {});

  // Server helper modules
  Lib.Instance = instanceLoader(Lib, {});


  return { Lib: Lib };

};
