import type { JobApplication } from "~types/application";
import { APPLICATION_STORE, withStore } from "./db";

export const applicationRepository = {
  async list(): Promise<JobApplication[]> {
    const items = await withStore(
      APPLICATION_STORE,
      "readonly",
      (store) => store.getAll() as IDBRequest<JobApplication[]>
    );
    return (items ?? []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async get(id: string): Promise<JobApplication | null> {
    const item = await withStore(
      APPLICATION_STORE,
      "readonly",
      (store) => store.get(id) as IDBRequest<JobApplication | undefined>
    );
    return item ?? null;
  },

  async save(item: JobApplication): Promise<void> {
    await withStore(APPLICATION_STORE, "readwrite", (store) => store.put(item));
  },

  async delete(id: string): Promise<void> {
    await withStore(APPLICATION_STORE, "readwrite", (store) => store.delete(id));
  }
};
