import type { KnowledgeEmbedding } from "~types/knowledge";
import { EMBEDDING_STORE, withStore, withTransaction } from "./db";

export const embeddingRepository = {
  async list(): Promise<KnowledgeEmbedding[]> {
    const items = await withStore(
      EMBEDDING_STORE,
      "readonly",
      (store) => store.getAll() as IDBRequest<KnowledgeEmbedding[]>
    );
    return items ?? [];
  },

  async get(knowledgeId: string): Promise<KnowledgeEmbedding | null> {
    const item = await withStore(
      EMBEDDING_STORE,
      "readonly",
      (store) => store.get(knowledgeId) as IDBRequest<KnowledgeEmbedding | undefined>
    );
    return item ?? null;
  },

  async save(item: KnowledgeEmbedding): Promise<void> {
    await withStore(EMBEDDING_STORE, "readwrite", (store) => store.put(item));
  },

  async delete(knowledgeId: string): Promise<void> {
    await withStore(EMBEDDING_STORE, "readwrite", (store) => store.delete(knowledgeId));
  },

  async clear(): Promise<void> {
    await withTransaction(EMBEDDING_STORE, "readwrite", (store) => {
      store.clear();
    });
  }
};
