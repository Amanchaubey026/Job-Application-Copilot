import { aiCacheRepository } from "~storage/ai-cache-repository";
import { answerLibraryRepository } from "~storage/answer-library-repository";
import { applicationRepository } from "~storage/application-repository";
import { embeddingRepository } from "~storage/embedding-repository";
import { knowledgeRepository } from "~storage/knowledge-repository";
import { profileRepository } from "~storage/profile-repository";
import { resumeRepository } from "~storage/resume-repository";
import { settingsRepository } from "~storage/settings-repository";
import { snapshotRepository } from "~storage/snapshot-repository";
import {
  ANSWER_LIBRARY_STORE,
  APPLICATION_STORE,
  AI_CACHE_STORE,
  EMBEDDING_STORE,
  KNOWLEDGE_STORE,
  PROFILE_STORE,
  RESUME_STORE,
  REVISION_STORE,
  SETTINGS_STORE,
  SNAPSHOT_STORE,
  withTransaction
} from "~storage/db";
import type { JobApplication } from "~types/application";
import type { CareerKnowledgeItem } from "~types/knowledge";
import type { UserProfile } from "~types/profile";
import type { ResumeVersion } from "~types/resume";
import type { AnswerLibraryItem } from "~types/application";

export const BACKUP_SCHEMA_VERSION = 4;

export interface LocalBackup {
  schemaVersion: number;
  exportedAt: string;
  profile: UserProfile | null;
  knowledge: CareerKnowledgeItem[];
  resumeVersions: ResumeVersion[];
  applications: JobApplication[];
  answers: AnswerLibraryItem[];
}

export interface ImportConflict {
  collection: string;
  id: string;
  existingUpdatedAt?: string;
  importedUpdatedAt?: string;
}

export async function exportBackup(): Promise<LocalBackup> {
  const [profile, knowledge, resumeVersions, applications, answers] = await Promise.all([
    profileRepository.getProfile(),
    knowledgeRepository.list(),
    resumeRepository.list(),
    applicationRepository.list(),
    answerLibraryRepository.list()
  ]);
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
    knowledge,
    resumeVersions,
    applications,
    answers
  };
}

export function parseBackup(raw: unknown): LocalBackup {
  if (!raw || typeof raw !== "object") {
    throw new Error("Backup file is not valid JSON.");
  }
  const data = raw as Partial<LocalBackup>;
  if (data.schemaVersion !== BACKUP_SCHEMA_VERSION && data.schemaVersion !== 3) {
    throw new Error("Unsupported backup schema.");
  }
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: typeof data.exportedAt === "string" ? data.exportedAt : new Date().toISOString(),
    profile: data.profile ?? null,
    knowledge: Array.isArray(data.knowledge) ? data.knowledge : [],
    resumeVersions: Array.isArray(data.resumeVersions) ? data.resumeVersions : [],
    applications: Array.isArray(data.applications) ? data.applications : [],
    answers: Array.isArray(data.answers) ? data.answers : []
  };
}

export async function findConflicts(backup: LocalBackup): Promise<ImportConflict[]> {
  const conflicts: ImportConflict[] = [];
  const existingApps = await applicationRepository.list();
  const appIds = new Set(existingApps.map((item) => item.id));
  for (const item of backup.applications) {
    if (appIds.has(item.id)) {
      const existing = existingApps.find((row) => row.id === item.id);
      conflicts.push({
        collection: "applications",
        id: item.id,
        existingUpdatedAt: existing?.updatedAt,
        importedUpdatedAt: item.updatedAt
      });
    }
  }
  const existingResumes = await resumeRepository.list();
  const resumeIds = new Set(existingResumes.map((item) => item.id));
  for (const item of backup.resumeVersions) {
    if (resumeIds.has(item.id)) {
      const existing = existingResumes.find((row) => row.id === item.id);
      conflicts.push({
        collection: "resumeVersions",
        id: item.id,
        existingUpdatedAt: existing?.updatedAt,
        importedUpdatedAt: item.updatedAt
      });
    }
  }
  return conflicts;
}

export async function importBackup(
  backup: LocalBackup,
  resolveConflict: "keep" | "imported" | "both" = "keep"
): Promise<void> {
  if (backup.profile) {
    const existing = await profileRepository.getProfile();
    if (!existing || resolveConflict !== "keep") {
      await profileRepository.saveProfile(backup.profile);
    }
  }
  for (const item of backup.knowledge) {
    const current = await knowledgeRepository.get(item.id);
    if (!current || resolveConflict === "imported") await knowledgeRepository.save(item);
    if (current && resolveConflict === "both") {
      await knowledgeRepository.save({ ...item, id: `${item.id}-imported` });
    }
  }
  for (const item of backup.resumeVersions) {
    const current = await resumeRepository.get(item.id);
    if (!current || resolveConflict === "imported") await resumeRepository.save(item);
    if (current && resolveConflict === "both") {
      await resumeRepository.save({ ...item, id: `${item.id}-imported`, name: `${item.name} (imported)` });
    }
  }
  for (const item of backup.applications) {
    const current = await applicationRepository.get(item.id);
    if (!current || resolveConflict === "imported") await applicationRepository.save(item);
    if (current && resolveConflict === "both") {
      await applicationRepository.save({ ...item, id: `${item.id}-imported` });
    }
  }
  for (const item of backup.answers) {
    await answerLibraryRepository.save(item);
  }
}

export async function deleteAllLocalData(): Promise<void> {
  const stores = [
    PROFILE_STORE,
    KNOWLEDGE_STORE,
    EMBEDDING_STORE,
    APPLICATION_STORE,
    ANSWER_LIBRARY_STORE,
    AI_CACHE_STORE,
    SETTINGS_STORE,
    RESUME_STORE,
    REVISION_STORE,
    SNAPSHOT_STORE
  ];
  for (const store of stores) {
    await withTransaction(store, "readwrite", (objectStore) => {
      objectStore.clear();
    });
  }
}

export async function clearAiCacheOnly(): Promise<void> {
  await aiCacheRepository.clear();
}
