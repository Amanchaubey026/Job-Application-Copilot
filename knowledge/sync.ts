import { hashPayload } from "~ai/cache-key";
import { OllamaEmbeddingProvider } from "~ai/ollama-embeddings";
import { logAiError } from "~ai/logger";
import { embeddingRepository } from "~storage/embedding-repository";
import { knowledgeRepository } from "~storage/knowledge-repository";
import type { AiSettings } from "~types/ai";
import type { CareerKnowledgeItem } from "~types/knowledge";
import type { UserProfile } from "~types/profile";
import { extractKnowledgeFromProfile } from "./extract";

export async function syncKnowledgeFromProfile(profile: UserProfile): Promise<CareerKnowledgeItem[]> {
  const derived = extractKnowledgeFromProfile(profile);
  await knowledgeRepository.replaceDerived(derived);
  return knowledgeRepository.list();
}

export async function ensureKnowledgeForProfile(
  profile: UserProfile
): Promise<CareerKnowledgeItem[]> {
  const existing = await knowledgeRepository.list();
  if (existing.length > 0) return existing;
  return syncKnowledgeFromProfile(profile);
}

export function knowledgeIndexText(item: CareerKnowledgeItem): string {
  return [
    item.title,
    item.content,
    item.metadata.company,
    item.metadata.role,
    item.metadata.project,
    ...(item.metadata.technologies ?? []),
    ...(item.metadata.tags ?? [])
  ]
    .filter(Boolean)
    .join(" ");
}

export async function rebuildEmbeddings(
  items: CareerKnowledgeItem[],
  settings: AiSettings,
  onProgress?: (done: number, total: number) => void
): Promise<{ indexed: number; failed: number }> {
  if (!settings.embeddingModel) {
    return { indexed: 0, failed: 0 };
  }
  const embedder = new OllamaEmbeddingProvider(
    settings.ollamaUrl,
    settings.embeddingModel,
    Math.min(settings.timeoutMs, 20_000)
  );
  const existing = await embeddingRepository.list();
  const byId = new Map(existing.map((record) => [record.knowledgeId, record]));
  let indexed = 0;
  let failed = 0;
  const concurrency = 2;
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (!item) continue;
      try {
        const contentHash = await hashPayload({
          title: item.title,
          content: item.content,
          model: settings.embeddingModel
        });
        const current = byId.get(item.id);
        if (current && current.contentHash === contentHash && current.model === settings.embeddingModel) {
          indexed += 1;
          onProgress?.(indexed + failed, items.length);
          continue;
        }
        const vector = await embedder.embed(knowledgeIndexText(item));
        await embeddingRepository.save({
          knowledgeId: item.id,
          vector,
          model: settings.embeddingModel,
          createdAt: new Date().toISOString(),
          contentHash
        });
        indexed += 1;
      } catch (error) {
        failed += 1;
        logAiError("embed", error);
      }
      onProgress?.(indexed + failed, items.length);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { indexed, failed };
}

export async function indexStatus(embeddingModel?: string): Promise<{
  knowledge: number;
  embeddings: number;
  stale: boolean;
}> {
  const [items, embeddings] = await Promise.all([
    knowledgeRepository.list(),
    embeddingRepository.list()
  ]);
  const relevant = embeddingModel
    ? embeddings.filter((record) => record.model === embeddingModel)
    : embeddings;
  return {
    knowledge: items.length,
    embeddings: relevant.length,
    stale: Boolean(embeddingModel) && items.length > 0 && relevant.length < items.length
  };
}
