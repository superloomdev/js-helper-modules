// Info: Configuration file for helper-instance
'use strict';


module.exports = {

  // Whether process-scoped teardown runs at the end of every request.
  //
  // false - A persistent deployment (Express in Docker, EC2, a VM).
  //         A resource registered through addProcessCleanupRoutine is held
  //         open and shared by every later request, and is closed once by
  //         runProcessCleanup() on SIGTERM.
  //
  // true  - A deployment whose runtime must not be left holding handles
  //         between requests, such as AWS Lambda. A resource registered
  //         through addProcessCleanupRoutine is closed by the request that
  //         opened it. An open handle keeps such a runtime alive and billable
  //         until the function times out, and marks that worker busy so it
  //         refuses new requests meanwhile.
  //
  // The deployment's entry point supplies this. This module never reads the
  // environment to guess it.
  CLOSE_ON_CLEANUP: false

};
