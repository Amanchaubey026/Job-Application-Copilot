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

export interface FollowUp {
  id: string;
  applicationId: string;
  dueAt: string;
  note: string;
  completed: boolean;
}

export interface ApplicationStep {
  id: string;
  index: number;
  title?: string;
  status: "current" | "completed" | "upcoming" | "unknown";
}

export interface ApplicationCompleteness {
  totalRequired: number;
  completedRequired: number;
  missingRequired: number;
  percentage: number;
}

export interface ApplicationSnapshot {
  id: string;
  applicationId: string;
  url: string;
  capturedAt: string;
  step?: ApplicationStep;
  detectedFieldIds: string[];
  completedFields: string[];
  unansweredQuestions: string[];
  selectedResumeId?: string;
}

export interface JobApplication {
  id: string;
  job: JobContext;
  appliedAt?: string;
  status: ApplicationStatus;
  notes?: string;
  recruiter?: string;
  match?: JobMatch;
  answers?: ApplicationAnswer[];
  selectedResumeId?: string;
  steps?: ApplicationStep[];
  completeness?: ApplicationCompleteness;
  followUps?: FollowUp[];
  createdAt: string;
  updatedAt: string;
}

export interface AnswerLibraryItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  sourceIds: string[];
  usedCount?: number;
  usefulVotes?: number;
  notUsefulVotes?: number;
  createdAt: string;
  updatedAt: string;
}
