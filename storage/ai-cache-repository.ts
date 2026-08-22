import { AI_CACHE_STORE, withStore } from "./db";

export interface AiCacheRecord {
  key: string;
  kind: string;
  value: unknown;
  profileUpdatedAt: string;
  createdAt: string;
}

export const aiCacheRepository = {
  async get<T>(key: string, profileUpdatedAt: string): Promise<T | null> {
    const record = await withStore(
      AI_CACHE_STORE,
      "readonly",
      (store) => store.get(key) as IDBRequest<AiCacheRecord | undefined>
    );
    if (!record) return null;
    if (record.profileUpdatedAt !== profileUpdatedAt) return null;
    return record.value as T;
  },

  async set(record: AiCacheRecord): Promise<void> {
    await withStore(AI_CACHE_STORE, "readwrite", (store) => store.put(record));
  },

  async clear(): Promise<void> {
    await withStore(AI_CACHE_STORE, "readwrite", (store) => store.clear());
  },

  async count(): Promise<number> {
    const value = await withStore(AI_CACHE_STORE, "readonly", (store) => store.count());
    return value ?? 0;
  }
};
