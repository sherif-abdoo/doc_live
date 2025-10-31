const cache = new Map();

// store with TTL (optional)
function setCache(key, value, ttlInSeconds ) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlInSeconds * 1000,
  });
}

function getCache(key) {
  const cached = cache.get(key);
  if (!cached) return null;

  if (cached.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return cached.value;
}

function deleteCache(key) {
  cache.delete(key);
}

module.exports = { setCache, getCache, deleteCache };
