// Info: Configuration file for helper-crypto


export default {

  // Character set for base-36 conversion
  BASE36_CHARSET: '0123456789abcdefghijklmnopqrstuvwxyz',

  // Password hashing (scrypt) parameters.
  // These are defaults; a project may override them at loader time.
  // The output format is self-describing (scrypt$N$r$p$salt$digest),
  // so raising N later does not break verification of old hashes.
  PASSWORD_HASH_COST_N:            16384,
  PASSWORD_HASH_BLOCK_SIZE_R:      8,
  PASSWORD_HASH_PARALLELIZATION_P: 1,
  PASSWORD_HASH_KEY_LENGTH_BYTES:  64,
  PASSWORD_HASH_SALT_LENGTH_BYTES: 16

};
