import type { ResumeRevision, ResumeVersion } from "~types/resume";
import { RESUME_STORE, REVISION_STORE, withStore } from "./db";

export const resumeRepository = {
  async list(): Promise<ResumeVersion[]> {
    const items = await withStore(
      RESUME_STORE,
      "readonly",
      (store) => store.getAll() as IDBRequest<ResumeVersion[]>
    );
    return (items ?? []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async get(id: string): Promise<ResumeVersion | null> {
    const item = await withStore(
      RESUME_STORE,
      "readonly",
      (store) => store.get(id) as IDBRequest<ResumeVersion | undefined>
    );
    return item ?? null;
  },

  async save(item: ResumeVersion): Promise<void> {
    await withStore(RESUME_STORE, "readwrite", (store) => store.put(item));
  },

  async delete(id: string): Promise<void> {
    await withStore(RESUME_STORE, "readwrite", (store) => store.delete(id));
  },

  async listRevisions(resumeId: string): Promise<ResumeRevision[]> {
    const items = await withStore(
      REVISION_STORE,
      "readonly",
      (store) => store.getAll() as IDBRequest<ResumeRevision[]>
    );
    return (items ?? [])
      .filter((item) => item.resumeId === resumeId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async saveRevision(item: ResumeRevision): Promise<void> {
    await withStore(REVISION_STORE, "readwrite", (store) => store.put(item));
  }
};
