type CacheEntry<V> = {
  value: V;
  expiresAt: number;
};

/**
 * Small TTL cache with naive LRU eviction using Map insertion order.
 */
export class SimpleTtlCache<V> {
  private readonly store = new Map<string, CacheEntry<V>>();

  constructor(private readonly options: { ttlMs: number; maxEntries?: number }) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    // refresh LRU order by re-inserting
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value;
  }

  set(key: string, value: V): void {
    const { ttlMs, maxEntries } = this.options;

    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });

    if (typeof maxEntries === 'number' && maxEntries > 0) {
      while (this.store.size > maxEntries) {
        const oldestKey = this.store.keys().next().value;

        if (typeof oldestKey === 'undefined') {
          break;
        }

        this.store.delete(oldestKey);
      }
    }
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
