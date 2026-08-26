// Info: Frozen error catalog for helper-auth-store-sqlite.
// Every error object is frozen so callers cannot mutate them.


export default Object.freeze({

  SERVICE_UNAVAILABLE: Object.freeze({
    type: 'AUTH_STORE_SQLITE_SERVICE_UNAVAILABLE',
    message: 'SQLite backend unavailable'
  })

});
