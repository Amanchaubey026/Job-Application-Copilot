export type KnowledgeType =
  | "experience"
  | "project"
  | "skill"
  | "achievement"
  | "education"
  | "certification"
  | "responsibility"
  | "technology"
  | "metric"
  | "answer"
  | "other";

export type KnowledgeOrigin = "profile" | "manual";

export interface CareerKnowledgeItem {
  id: string;
  type: KnowledgeType;
  title: string;
  content: string;
  origin: KnowledgeOrigin;
  profileRef?: string;
  metadata: {
    company?: string;
    role?: string;
    project?: string;
    institution?: string;
    technologies?: string[];
    dates?: {
      start?: string;
      end?: string;
    };
    source?: string;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
  };
}

export interface KnowledgeEmbedding {
  knowledgeId: string;
  vector: number[];
  model: string;
  createdAt: string;
  contentHash: string;
}

export type RetrievalMethod = "keyword" | "semantic" | "hybrid";

export interface RetrievalResult {
  item: CareerKnowledgeItem;
  score: number;
  retrievalMethod: RetrievalMethod;
}

export interface RetrievalOptions {
  topK?: number;
  minScore?: number;
  types?: KnowledgeType[];
}

export interface CareerRetriever {
  search(query: string, options?: RetrievalOptions): Promise<RetrievalResult[]>;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
}

export const DEFAULT_RETRIEVAL_TOP_K = 5;
export const DEFAULT_RETRIEVAL_MIN_SCORE = 0.12;
