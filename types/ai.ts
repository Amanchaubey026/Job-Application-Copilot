export interface AIModel {
  name: string;
  size?: number;
  modifiedAt?: string;
}

export interface StructuredGenerationRequest {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  temperature?: number;
  schema?: unknown;
}

export interface AIProvider {
  isAvailable(): Promise<boolean>;
  listModels(): Promise<AIModel[]>;
  generateStructured<T>(request: StructuredGenerationRequest): Promise<T>;
}

export interface AiSettings {
  id: string;
  ollamaUrl: string;
  model: string;
  embeddingModel: string;
  temperature: number;
  timeoutMs: number;
  maxContext?: number;
  responseStyle?: "professional" | "conversational" | "concise";
}

export interface AIFieldClassification {
  intent: string;
  profileSources: string[];
  confidence: number;
}

export interface AIFieldMatch {
  profileSources: string[];
  confidence: number;
  reason?: string;
}

export type AnswerTone = "professional" | "conversational" | "concise";
export type AnswerLength = "short" | "medium" | "detailed";

export interface AnswerCitation {
  knowledgeId: string;
  title: string;
}

export interface GeneratedAnswer {
  answer: string;
  confidence: number;
  sources: string[];
  sourceIds?: string[];
  citations?: AnswerCitation[];
  needsUserInput: boolean;
  missingInformation?: string[];
}

export interface JobAnalysis {
  matchScore: number;
  matchingSkills: string[];
  matchingExperience: string[];
  relevantProjects: string[];
  missingSkills: string[];
  summary: string;
}

export const DEFAULT_OLLAMA_URL = "http://localhost:11434";
export const DEFAULT_TEMPERATURE = 0.2;
export const DEFAULT_AI_TIMEOUT_MS = 60_000;
export const PROMPT_VERSION = "4.0.0";
