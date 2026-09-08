// Info: Test loader for js-client-helper-themer-template-carbon
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';


/********************************************************************
Load all test dependencies and build the Lib container.

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container (Utils, Debug)
*********************************************************************/
export default function loader () {

  const Config = {};
  const Lib = {};

  Lib.Utils = utilsLoader(Lib, {});
  Lib.Debug = debugLoader(Lib, {});

  return { Lib, Config };

}
