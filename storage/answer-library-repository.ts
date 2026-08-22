import type { AnswerLibraryItem } from "~types/application";
import { ANSWER_LIBRARY_STORE, withStore } from "./db";

export const answerLibraryRepository = {
  async list(): Promise<AnswerLibraryItem[]> {
    const items = await withStore(
      ANSWER_LIBRARY_STORE,
      "readonly",
      (store) => store.getAll() as IDBRequest<AnswerLibraryItem[]>
    );
    return items ?? [];
  },

  async save(item: AnswerLibraryItem): Promise<void> {
    await withStore(ANSWER_LIBRARY_STORE, "readwrite", (store) => store.put(item));
  }
};
