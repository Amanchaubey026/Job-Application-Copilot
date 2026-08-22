import type { CareerKnowledgeItem } from "~types/knowledge";
import { KNOWLEDGE_STORE, withStore, withTransaction } from "./db";

export const knowledgeRepository = {
  async list(): Promise<CareerKnowledgeItem[]> {
    const items = await withStore(
      KNOWLEDGE_STORE,
      "readonly",
      (store) => store.getAll() as IDBRequest<CareerKnowledgeItem[]>
    );
    return items ?? [];
  },

  async get(id: string): Promise<CareerKnowledgeItem | null> {
    const item = await withStore(
      KNOWLEDGE_STORE,
      "readonly",
      (store) => store.get(id) as IDBRequest<CareerKnowledgeItem | undefined>
    );
    return item ?? null;
  },

  async save(item: CareerKnowledgeItem): Promise<void> {
    await withStore(KNOWLEDGE_STORE, "readwrite", (store) => store.put(item));
  },

  async saveMany(items: CareerKnowledgeItem[]): Promise<void> {
    await withTransaction(KNOWLEDGE_STORE, "readwrite", (store) => {
      for (const item of items) store.put(item);
    });
  },

  async delete(id: string): Promise<void> {
    await withStore(KNOWLEDGE_STORE, "readwrite", (store) => store.delete(id));
  },

  async replaceDerived(nextDerived: CareerKnowledgeItem[]): Promise<void> {
    const existing = await this.list();
    const keep = existing.filter((item) => item.origin === "manual");
    await withTransaction(KNOWLEDGE_STORE, "readwrite", (store) => {
      store.clear();
      for (const item of [...keep, ...nextDerived]) store.put(item);
    });
  }
};
