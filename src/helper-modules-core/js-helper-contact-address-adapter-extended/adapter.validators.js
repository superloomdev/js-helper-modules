// Info: All validators for helper-contact-address-adapter-extended.


let Lib; // eslint-disable-line no-unused-vars
let ERRORS; // eslint-disable-line no-unused-vars


/////////////////////////// Module-Loader START ////////////////////////////////
export default function loader (shared_libs, errors) {

  // Inject shared dependencies
  Lib = shared_libs;
  ERRORS = errors;

  // Return the Validators interface
  return Validators;

};///////////////////////////// Module-Loader END ///////////////////////////////



////////////////////////////// Public Functions START ////////////////////////
const Validators = {


  validateConfig: function (CONFIG) { // eslint-disable-line no-unused-vars

    // No required config for the extended adapter
    return;

  }


};////////////////////////////// Public Functions END //////////////////////////
