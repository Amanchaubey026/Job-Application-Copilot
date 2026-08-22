import type { JobContext } from "./job";
import type { RetrievalResult } from "./knowledge";

export type RequirementCategory =
  | "technical"
  | "experience"
  | "education"
  | "soft_skill"
  | "other";

export type RequirementImportance = "required" | "preferred" | "unknown";

export interface JobRequirement {
  name: string;
  category: RequirementCategory;
  importance: RequirementImportance;
}

export interface JobRequirementMatch {
  requirement: JobRequirement;
  score: number;
  evidenceTitles: string[];
}

export interface JobMatch {
  score: number;
  matchedRequirements: JobRequirementMatch[];
  unmatchedRequirements: JobRequirement[];
  evidence: RetrievalResult[];
  summary: string;
}

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "interview"
  | "rejected"
  | "offer"
  | "withdrawn"
  | "unknown";

export interface ApplicationAnswer {
  id: string;
  question: string;
  answer: string;
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface JobApplication {
  id: string;
  job: JobContext;
  appliedAt?: string;
  status: ApplicationStatus;
  notes?: string;
  match?: JobMatch;
  answers?: ApplicationAnswer[];
  createdAt: string;
  updatedAt: string;
}

export interface AnswerLibraryItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  sourceIds: string[];
  createdAt: string;
  updatedAt: string;
}
