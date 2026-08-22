import type { ApplicationSnapshot } from "~types/application";
import { SNAPSHOT_STORE, withStore } from "./db";

export const snapshotRepository = {
  async list(): Promise<ApplicationSnapshot[]> {
    const items = await withStore(
      SNAPSHOT_STORE,
      "readonly",
      (store) => store.getAll() as IDBRequest<ApplicationSnapshot[]>
    );
    return items ?? [];
  },

  async save(item: ApplicationSnapshot): Promise<void> {
    await withStore(SNAPSHOT_STORE, "readwrite", (store) => store.put(item));
  }
};
