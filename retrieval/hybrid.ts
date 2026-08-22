import type {
  CareerKnowledgeItem,
  CareerRetriever,
  EmbeddingProvider,
  KnowledgeEmbedding,
  RetrievalOptions,
  RetrievalResult
} from "~types/knowledge";
import { DEFAULT_RETRIEVAL_MIN_SCORE, DEFAULT_RETRIEVAL_TOP_K } from "~types/knowledge";
import { lexicalSearch } from "./lexical";
import { cosineSimilarity } from "./vector";

function normalizeScores(results: RetrievalResult[]): RetrievalResult[] {
  const max = Math.max(...results.map((result) => result.score), 0.0001);
  return results.map((result) => ({ ...result, score: result.score / max }));
}

export class HybridCareerRetriever implements CareerRetriever {
  constructor(
    private readonly items: CareerKnowledgeItem[],
    private readonly embeddings: KnowledgeEmbedding[] = [],
    private readonly embedder?: EmbeddingProvider
  ) {}

  async search(query: string, options: RetrievalOptions = {}): Promise<RetrievalResult[]> {
    const topK = options.topK ?? DEFAULT_RETRIEVAL_TOP_K;
    const minScore = options.minScore ?? DEFAULT_RETRIEVAL_MIN_SCORE;
    const keyword = lexicalSearch(this.items, query, { ...options, topK: topK * 3, minScore: 0 });

    let semantic: RetrievalResult[] = [];
    if (this.embedder && this.embeddings.length) {
      try {
        const queryVector = await this.embedder.embed(query);
        const byId = new Map(this.items.map((item) => [item.id, item]));
        const scored: RetrievalResult[] = [];
        for (const record of this.embeddings) {
          const item = byId.get(record.knowledgeId);
          if (!item) continue;
          if (options.types && !options.types.includes(item.type)) continue;
          scored.push({
            item,
            score: cosineSimilarity(queryVector, record.vector),
            retrievalMethod: "semantic"
          });
        }
        semantic = scored.sort((a, b) => b.score - a.score).slice(0, topK * 3);
      } catch {
        semantic = [];
      }
    }

    if (!semantic.length) {
      return keyword.filter((result) => result.score >= minScore).slice(0, topK);
    }

    const keywordNorm = normalizeScores(keyword);
    const semanticNorm = normalizeScores(semantic);
    const merged = new Map<string, RetrievalResult>();

    const add = (result: RetrievalResult, weight: number) => {
      const current = merged.get(result.item.id);
      const nextScore = (current?.score ?? 0) + result.score * weight;
      merged.set(result.item.id, {
        item: result.item,
        score: nextScore,
        retrievalMethod: current ? "hybrid" : result.retrievalMethod
      });
    };

    for (const result of keywordNorm) add(result, 0.45);
    for (const result of semanticNorm) add(result, 0.55);

    return [...merged.values()]
      .sort((a, b) => b.score - a.score)
      .filter((result) => result.score >= minScore)
      .slice(0, topK);
  }
}

export function createRetriever(
  items: CareerKnowledgeItem[],
  embeddings: KnowledgeEmbedding[] = [],
  embedder?: EmbeddingProvider
): HybridCareerRetriever {
  return new HybridCareerRetriever(items, embeddings, embedder);
}
