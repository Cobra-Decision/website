const limit = 100;
const cache = new Map<string, unknown>();

export function getCache(key: string) {
  const value = cache.get(key);
  if (value !== undefined) {
    cache.delete(key);
    cache.set(key, value);
  }
  return value;
}

export function setCache(key: string, value: unknown) {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > limit) cache.delete(cache.keys().next().value!);
}
