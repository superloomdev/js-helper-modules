// Info: Auth-ID and session-key utilities. Pure functions over the
// canonical wire format and the internal composite key format.
//
// Wire format (what the client sends in cookie / Authorization header):
//   auth_id = "{actor_id}-{token_key}-{token_secret}"
//
// Composite session key (used inside DynamoDB sort key and MongoDB _id):
//   session_key = "{actor_id}\u001F{token_key}\u001F{token_secret_hash}"
//
// Reserved characters:
//   '\u001F' (ASCII Unit Separator) separates composite key parts.
//     It is a non-printable control character that cannot appear in any
//     human-readable identifier, so the constraint on actor_id and
//     tenant_id is vacuous in practice but enforced as belt-and-braces.
//     This follows the precedent set by helper-distinct-queue-store-dynamodb.
//   '-' separates auth_id parts on the wire, but actor_id may contain '-'
//   (e.g. a standard UUID). parseAuthId uses fixed-width right-anchored
//   parsing: token_secret is the last 48 chars, token_key is the 16 chars
//   before that, and actor_id is everything remaining. Both token segments
//   are drawn from TOKEN_CHARSET (alphanumeric only), so the parse is
//   unambiguous regardless of what actor_id contains.



// Charset for token_key and token_secret. Drawn from a controlled set so
// neither '-' nor '\u001F' can ever appear in a generated token.
const TOKEN_CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Length of the random portion of a session credential. The total wire
// auth_id length is roughly len(actor_id) + 2 + 2*TOKEN_LENGTH.
const TOKEN_KEY_LENGTH = 16;
const TOKEN_SECRET_LENGTH = 48;


/////////////////////////// Module-Loader START ////////////////////////////////

/********************************************************************
Factory loader. Returns one independent AuthId part bound to the
caller's Lib container. Pure token-format logic - no I/O, no state,
so the loader has nothing to validate and just delegates to
createInterface.

@param {Object} Lib - Dependency container (Utils, Crypto)
@param {Object} CONFIG - Merged module configuration (unused here)
@param {Object} ERRORS - Error catalog for this module (unused here)

@return {Object} - Public AuthId interface
*********************************************************************/
export default function loader (Lib, CONFIG, ERRORS) {

  // No per-instance validation or state for this part.
  return createInterface(Lib, CONFIG, ERRORS);

};///////////////////////////// Module-Loader END ///////////////////////////////



/////////////////////////// createInterface START //////////////////////////////

/********************************************************************
Build the public AuthId interface. All public methods close over the
provided Lib. CONFIG and ERRORS are part of the uniform parts-factory
signature; this part doesn't consume them today.

@param {Object} Lib - Dependency container (Utils, Crypto)
@param {Object} CONFIG - Merged module configuration
@param {Object} ERRORS - Error catalog for this module

@return {Object} - Public AuthId interface
*********************************************************************/
const createInterface = function (Lib, CONFIG, ERRORS) { // eslint-disable-line no-unused-vars


  ///////////////////////////Public Functions START//////////////////////////////
  const AuthId = {

    /********************************************************************
    Build the wire-format auth_id from its three parts. The client
    receives this string and sends it back on subsequent requests.

    @param {Object} parts
    @param {String} parts.actor_id - Actor identifier (project-supplied)
    @param {String} parts.token_key - Random key portion (module-generated)
    @param {String} parts.token_secret - Random secret portion (module-generated)

    @return {String} - The wire-format auth_id
    *********************************************************************/
    createAuthId: function (parts) {

      // Validate all three parts before composing the wire format
      _AuthId.assertNonEmptyString(parts.actor_id, 'actor_id');
      _AuthId.assertNonEmptyString(parts.token_key, 'token_key');
      _AuthId.assertNonEmptyString(parts.token_secret, 'token_secret');
      _AuthId.assertNoUnitSeparator(parts.actor_id, 'actor_id');

      // Compose and return the wire-format string
      return parts.actor_id + '-' + parts.token_key + '-' + parts.token_secret;

    },


    /********************************************************************
    Parse a wire-format auth_id back into its three parts. Returns null
    if the shape is wrong (caller treats this as INVALID_TOKEN).

    @param {String} auth_id - The wire-format string

    @return {Object|null} - { actor_id, token_key, token_secret } or null
    *********************************************************************/
    parseAuthId: function (auth_id) {

      // Reject non-strings and empty strings before any parsing
      if (
        !Lib.Utils.isString(auth_id) ||
        Lib.Utils.isEmptyString(auth_id)
      ) {
        return null;
      }

      // Minimum length: 1 char actor_id + '-' + TOKEN_KEY_LENGTH + '-' + TOKEN_SECRET_LENGTH
      if (auth_id.length < TOKEN_KEY_LENGTH + TOKEN_SECRET_LENGTH + 3) {
        return null;
      }

      // Parse from the right using fixed-width segments.
      // token_secret is the last TOKEN_SECRET_LENGTH chars.
      const secret_end = auth_id.length;
      const secret_start = secret_end - TOKEN_SECRET_LENGTH;
      const token_secret = auth_id.slice(secret_start, secret_end);

      // The char before token_secret must be '-'
      if (auth_id[secret_start - 1] !== '-') {
        return null;
      }

      // token_key is the TOKEN_KEY_LENGTH chars before that '-'
      const key_end = secret_start - 1;
      const key_start = key_end - TOKEN_KEY_LENGTH;
      const token_key = auth_id.slice(key_start, key_end);

      // The char before token_key must be '-'
      if (auth_id[key_start - 1] !== '-') {
        return null;
      }

      // actor_id is everything remaining before that '-'
      const actor_id = auth_id.slice(0, key_start - 1);

      // Reject if actor_id is empty
      if (Lib.Utils.isEmptyString(actor_id)) {
        return null;
      }

      // Reject if token_key or token_secret contains any character
      // outside TOKEN_CHARSET. This is what makes the parse unambiguous
      // rather than merely positional.
      for (let i = 0; i < token_key.length; i++) {
        if (TOKEN_CHARSET.indexOf(token_key[i]) === -1) {
          return null;
        }
      }
      for (let i = 0; i < token_secret.length; i++) {
        if (TOKEN_CHARSET.indexOf(token_secret[i]) === -1) {
          return null;
        }
      }

      // Return the parsed parts
      return {
        actor_id: actor_id,
        token_key: token_key,
        token_secret: token_secret
      };

    },


    /********************************************************************
    Generate a fresh random token_key. Uses the controlled charset so
    neither '-' nor '\u001F' ever appears.

    @return {String} - Random token_key of TOKEN_KEY_LENGTH chars
    *********************************************************************/
    generateTokenKey: function () {

      return Lib.Crypto.generateRandomString(TOKEN_CHARSET, TOKEN_KEY_LENGTH);

    },


    /********************************************************************
    Generate a fresh random token_secret. Uses the controlled charset.

    @return {String} - Random token_secret of TOKEN_SECRET_LENGTH chars
    *********************************************************************/
    generateTokenSecret: function () {

      return Lib.Crypto.generateRandomString(TOKEN_CHARSET, TOKEN_SECRET_LENGTH);

    },


    /********************************************************************
    Hash a token_secret. The store keeps only the hash; the secret itself
    is never persisted. SHA-256 HMAC for fast, deterministic verification.
    The salt argument lets the project bind hashes to a per-actor or
    per-instance secret (defense in depth).

    @param {String} token_secret - The raw secret
    @param {String} [salt] - Optional HMAC key. Default '' (no salt).

    @return {String} - Hex-encoded HMAC-SHA256 hash (64 chars)
    *********************************************************************/
    hashTokenSecret: function (token_secret, salt) {

      // Validate the secret before hashing
      _AuthId.assertNonEmptyString(token_secret, 'token_secret');

      // Hash with optional salt; default to empty string (no salt)
      return Lib.Crypto.sha256String(token_secret, salt || '');

    },


    /********************************************************************
    Build the composite session_key used inside DynamoDB sort key and
    MongoDB _id. SQL doesn't use this - SQL has separate columns for
    actor_id, token_key, and token_secret_hash.

    @param {String} actor_id
    @param {String} token_key
    @param {String} token_secret_hash

    @return {String} - "{actor_id}\u001F{token_key}\u001F{token_secret_hash}"
    *********************************************************************/
    composeSessionKey: function (actor_id, token_key, token_secret_hash) {

      // Validate all three parts before composing the composite key
      _AuthId.assertNonEmptyString(actor_id, 'actor_id');
      _AuthId.assertNonEmptyString(token_key, 'token_key');
      _AuthId.assertNonEmptyString(token_secret_hash, 'token_secret_hash');
      _AuthId.assertNoUnitSeparator(actor_id, 'actor_id');

      // Compose and return the composite session key
      return actor_id + '\u001F' + token_key + '\u001F' + token_secret_hash;

    },


    /********************************************************************
    The actor-prefix used for begins_with / anchored-regex queries.
    Returns "{actor_id}\u001F" - the prefix that all session_keys for this
    actor share.

    @param {String} actor_id

    @return {String} - "{actor_id}\u001F"
    *********************************************************************/
    composeActorPrefix: function (actor_id) {

      // Validate actor_id before composing the prefix
      _AuthId.assertNonEmptyString(actor_id, 'actor_id');
      _AuthId.assertNoUnitSeparator(actor_id, 'actor_id');

      // Append the '\u001F' separator to create the actor-scoped prefix
      return actor_id + '\u001F';

    },


    /********************************************************************
    The MongoDB _id format. Includes tenant_id as the leading segment
    so anchored-regex queries scoped by tenant + actor use the _id
    index directly (mirrors the DynamoDB single-table design).

    @param {String} tenant_id
    @param {String} actor_id
    @param {String} token_key
    @param {String} token_secret_hash

    @return {String} - "{tenant_id}\u001F{actor_id}\u001F{token_key}\u001F{token_secret_hash}"
    *********************************************************************/
    composeMongoId: function (tenant_id, actor_id, token_key, token_secret_hash) {

      // Validate tenant_id separately (may contain '-' but not '\u001F')
      _AuthId.assertNonEmptyString(tenant_id, 'tenant_id');
      _AuthId.assertNoUnitSeparator(tenant_id, 'tenant_id');

      // Prepend tenant_id to the standard session key
      return tenant_id + '\u001F' + AuthId.composeSessionKey(actor_id, token_key, token_secret_hash);

    },


    /********************************************************************
    The MongoDB tenant+actor prefix. Used in anchored-regex listSessions.

    @param {String} tenant_id
    @param {String} actor_id

    @return {String} - "{tenant_id}\u001F{actor_id}\u001F"
    *********************************************************************/
    composeMongoActorPrefix: function (tenant_id, actor_id) {

      // Validate tenant_id separately (may contain '-' but not '\u001F')
      _AuthId.assertNonEmptyString(tenant_id, 'tenant_id');
      _AuthId.assertNoUnitSeparator(tenant_id, 'tenant_id');

      // Prepend tenant_id to the standard actor prefix
      return tenant_id + '\u001F' + AuthId.composeActorPrefix(actor_id);

    }

  };///////////////////////////Public Functions END////////////////////////////////


  ///////////////////////////Private Functions START/////////////////////////////
  const _AuthId = {


    /********************************************************************
    Throw TypeError if the value isn't a non-empty string. Used by every
    composer / parser to catch bad inputs at the source.

    @param {*} value - Value to check
    @param {String} name - Field name (for error message)

    @return {void}
    *********************************************************************/
    assertNonEmptyString: function (value, name) {

      // Throw if the value is absent, non-string, or empty
      if (
        Lib.Utils.isNullOrUndefined(value) ||
        !Lib.Utils.isString(value) ||
        Lib.Utils.isEmptyString(value)
      ) {
        throw new TypeError('[helper-auth] ' + name + ' must be a non-empty string');
      }

    },


    /********************************************************************
    Throw TypeError if the value contains the '\u001F' (ASCII Unit
    Separator) composite-key separator. Used for tenant_id and actor_id,
    both of which may contain '-' but must not contain '\u001F' because
    that would break the MongoDB _id composite and the DynamoDB sort-key
    composite. For actor_id, '\u001F' would also break prefix-query
    isolation: the prefix for actor `a` would also match actor `a\u001Fb`.
    The constraint is vacuous in practice because '\u001F' is a
    non-printable control character that cannot appear in any
    human-readable identifier, but it is enforced as belt-and-braces.

    @param {String} value - Value to check
    @param {String} name - Field name (for error message)

    @return {void}
    *********************************************************************/
    assertNoUnitSeparator: function (value, name) {

      // Throw if the value contains the '\u001F' composite-key separator
      if (value.indexOf('\u001F') !== -1) {
        throw new TypeError('[helper-auth] ' + name + ' must not contain "\\u001F" (reserved as composite key separator)');
      }

    }


  };///////////////////////////Private Functions END///////////////////////////////


  return AuthId;

};/////////////////////////// createInterface END ////////////////////////////////

