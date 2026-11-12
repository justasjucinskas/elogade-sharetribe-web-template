/**
 * Wrap an async loader so its last accepted result is reused for `ttlMs`, and
 * calls made while a load is already running share that one load instead of
 * starting their own.
 *
 * The cache lives in the module that creates the loader. On the server that
 * module stays loaded for the whole Node process, so the cache is shared by
 * every server-side render — only use it for data that is the same for every
 * visitor (never anything tied to the signed-in user).
 *
 * @param {Function} load - (...args) => Promise; the arguments of the call that
 * misses the cache are passed through.
 * @param {Object} options
 * @param {number} options.ttlMs - how long an accepted result is reused
 * @param {Function} [options.shouldCache] - result => boolean; a result it
 * rejects is still returned to the caller but not reused
 * @param {Function} [options.now] - clock, injectable for tests
 * @returns {Function} (...args) => Promise, with a `clear()` method
 */
export const createCachedLoader = (load, options) => {
  const { ttlMs, shouldCache = () => true, now = () => Date.now() } = options;
  let cached = null; // { value, expiresAt }
  let inFlight = null;

  const cachedLoad = (...args) => {
    if (cached && now() < cached.expiresAt) {
      return Promise.resolve(cached.value);
    }
    if (!inFlight) {
      const pending = Promise.resolve()
        .then(() => load(...args))
        .then(value => {
          // After a clear() during the load, this result is no longer wanted.
          if (inFlight === pending && shouldCache(value)) {
            cached = { value, expiresAt: now() + ttlMs };
          }
          return value;
        })
        .finally(() => {
          // A clear() during the load may already have let a newer load start.
          if (inFlight === pending) {
            inFlight = null;
          }
        });
      inFlight = pending;
    }
    return inFlight;
  };

  cachedLoad.clear = () => {
    cached = null;
    inFlight = null;
  };

  return cachedLoad;
};
