import { z } from "zod";
import { sanitizeProfileSources } from "./allowlist";

const confidence = z.number().min(0).max(1);

export const fieldClassificationSchema = z.object({
  intent: z.string().min(1).max(80),
  profileSources: z.array(z.string().min(1).max(80)).max(12),
  confidence
});

export const generatedAnswerSchema = z.object({
  answer: z.string().max(8000),
  confidence,
  sources: z.array(z.string().min(1).max(80)).max(20),
  needsUserInput: z.boolean(),
  missingInformation: z.array(z.string().max(200)).max(20).optional()
});

export const jobAnalysisSchema = z.object({
  matchScore: confidence,
  matchingSkills: z.array(z.string().max(80)).max(30),
  matchingExperience: z.array(z.string().max(200)).max(20),
  relevantProjects: z.array(z.string().max(200)).max(20),
  missingSkills: z.array(z.string().max(80)).max(30),
  summary: z.string().max(2000)
});

export function parseClassification(value: unknown) {
  const parsed = fieldClassificationSchema.parse(value);
  return {
    ...parsed,
    profileSources: sanitizeProfileSources(parsed.profileSources)
  };
}

export function parseGeneratedAnswer(value: unknown) {
  const parsed = generatedAnswerSchema.parse(value);
  return {
    ...parsed,
    sources: sanitizeProfileSources(parsed.sources)
  };
}

export function parseJobAnalysis(value: unknown) {
  return jobAnalysisSchema.parse(value);
}

export const ragAnswerSchema = z.object({
  answer: z.string().max(8000),
  confidence,
  sourceIds: z.array(z.string().min(1).max(120)).max(20),
  needsUserInput: z.boolean(),
  missingInformation: z.array(z.string().max(200)).max(20).optional()
});

export const jobRequirementsSchema = z.object({
  requirements: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        category: z.enum(["technical", "experience", "education", "soft_skill", "other"]),
        importance: z.enum(["required", "preferred", "unknown"])
      })
    )
    .max(40)
});

export function parseRagAnswer(value: unknown) {
  return ragAnswerSchema.parse(value);
}

export function parseJobRequirements(value: unknown) {
  return jobRequirementsSchema.parse(value);
}
