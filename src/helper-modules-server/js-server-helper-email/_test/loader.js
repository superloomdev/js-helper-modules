// Info: Test loader for helper-email
// Mirrors the main project loader pattern: loads dependencies from environment
// process.env is ONLY read here - nowhere else in test code
import utilsLoader from 'helper-utils';
import debugLoader from 'helper-debug';
import cryptoLoader from 'helper-crypto';
import emailLoader from 'helper-email';


/********************************************************************
Load all test dependencies, build Lib container

@return {Object} result - Runtime objects for testing
@return {Object} result.Lib - Dependency container
*********************************************************************/
export default function loader () {

  // ========================= CONFIGURATION ========================= //

  const config_debug = {
    LOG_LEVEL: 'error'
  };


  // ==================== DEPENDENCY CONTAINER ======================= //

  const Lib = {};


  // ==================== HELPER MODULES ============================= //

  Lib.Utils = utilsLoader(Lib, {});
  Lib.Debug = debugLoader(Lib, config_debug);
  Lib.Crypto = cryptoLoader(Lib, {});


  // ==================== SERVER HELPER MODULES ====================== //

  // Stub adapter for testing - records calls and returns canned results
  const stubAdapter = {
    sent_messages: [],
    next_result: null,
    send: async function (instance, message) {
      this.sent_messages.push(message);
      if (this.next_result) {
        const result = this.next_result;
        this.next_result = null;
        return result;
      }
      return {
        success: true,
        message_id: 'test-message-id-' + this.sent_messages.length,
        accepted: [].concat(message.to || [], message.cc || [], message.bcc || []),
        rejected: []
      };
    }
  };

  Lib.Email = emailLoader(Lib, {
    Adapter: stubAdapter,
    DEFAULT_FROM: 'noreply@test.local',
    UNSUBSCRIBE_SECRET: 'test-secret-key-for-hmac'
  });

  // Expose stub adapter for test assertions
  Lib.Email._stubAdapter = stubAdapter;


  // Return runtime objects
  return { Lib };

}
