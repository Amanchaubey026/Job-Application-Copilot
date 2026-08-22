import type {
  AIProvider,
  AiSettings,
  AnswerLength,
  AnswerTone,
  GeneratedAnswer,
  JobAnalysis
} from "~types/ai";
import type { ApplicationQuestion, JobContext } from "~types/job";
import type { SerializableFormField } from "~types/form";
import type { FieldMatch } from "~types/matching";
import type { UserProfile } from "~types/profile";
import { AppError } from "~types/errors";
import { buildFieldClassificationPrompt } from "~prompts/field-classification";
import { buildJobAnalysisPrompt } from "~prompts/job-analysis";
import { buildAnswerPrompt } from "~prompts/answer-generation";
import { buildRelevantProfileContext, formatSourcesAsValue } from "~lib/profile-context";
import { aiCacheRepository } from "~storage/ai-cache-repository";
import { parseClassification, parseGeneratedAnswer, parseJobAnalysis } from "./schemas";
import { generateValidated } from "./generate";
import { buildCacheKey } from "./cache-key";
import { groundGeneratedAnswer, groundJobAnalysis } from "./ground";
import { logAiError } from "./logger";

async function cached<T>(
  kind: string,
  profileUpdatedAt: string,
  parts: Record<string, unknown>,
  compute: () => Promise<T>,
  skipCache = false
): Promise<T> {
  const key = await buildCacheKey({ kind, ...parts });
  if (!skipCache) {
    try {
      const hit = await aiCacheRepository.get<T>(key, profileUpdatedAt);
      if (hit) return hit;
    } catch {
      // Cache is optional; continue without it.
    }
  }
  const value = await compute();
  try {
    await aiCacheRepository.set({
      key,
      kind,
      value,
      profileUpdatedAt,
      createdAt: new Date().toISOString()
    });
  } catch {
    // Ignore cache write failures.
  }
  return value;
}

export async function classifyAmbiguousField(input: {
  provider: AIProvider;
  settings: AiSettings;
  field: SerializableFormField;
  profile: UserProfile;
}): Promise<FieldMatch | null> {
  if (!input.settings.model) return null;
  const prompt = buildFieldClassificationPrompt(input.field);

  try {
    const classification = await cached(
      "classify",
      input.profile.metadata.updatedAt,
      {
        model: input.settings.model,
        temperature: input.settings.temperature,
        field: {
          label: input.field.label,
          name: input.field.name,
          placeholder: input.field.placeholder,
          type: input.field.inputType
        }
      },
      () =>
        generateValidated(
          input.provider,
          {
            systemPrompt: prompt.systemPrompt,
            userPrompt: prompt.userPrompt,
            model: input.settings.model,
            temperature: input.settings.temperature
          },
          parseClassification
        )
    );

    if (!classification.profileSources.length || classification.confidence < 0.5) {
      return null;
    }

    const value = formatSourcesAsValue(input.profile, classification.profileSources);
    return {
      profilePath: classification.profileSources[0] ?? "experience",
      value,
      confidence: classification.confidence,
      reason: `AI classification: ${classification.intent}`,
      source: "ai",
      profileSources: classification.profileSources
    };
  } catch (error) {
    logAiError("classify", error);
    if (error instanceof AppError && error.code === "AI_INVALID") throw error;
    return null;
  }
}

export async function analyzeJobWithAi(input: {
  provider: AIProvider;
  settings: AiSettings;
  job: JobContext;
  profile: UserProfile;
}): Promise<JobAnalysis> {
  if (!input.settings.model) throw new AppError("AI_NO_MODEL");
  const profileContext = buildRelevantProfileContext({
    job: input.job,
    profile: input.profile
  });
  const prompt = buildJobAnalysisPrompt({ job: input.job, profile: profileContext });

  const analysis = await cached(
    "job-analysis",
    input.profile.metadata.updatedAt,
    {
      model: input.settings.model,
      temperature: input.settings.temperature,
      url: input.job.url,
      title: input.job.title,
      company: input.job.company,
      description: input.job.description?.slice(0, 2000)
    },
    () =>
      generateValidated(
        input.provider,
        {
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt,
          model: input.settings.model,
          temperature: input.settings.temperature
        },
        parseJobAnalysis
      )
  );

  return groundJobAnalysis(analysis, input.profile);
}

export async function generateAnswerWithAi(input: {
  provider: AIProvider;
  settings: AiSettings;
  question: ApplicationQuestion;
  job: JobContext;
  profile: UserProfile;
  tone?: AnswerTone;
  length?: AnswerLength;
  skipCache?: boolean;
}): Promise<GeneratedAnswer> {
  if (!input.settings.model) throw new AppError("AI_NO_MODEL");
  const profileContext = buildRelevantProfileContext({
    question: input.question.question,
    job: input.job,
    profile: input.profile
  });
  const prompt = buildAnswerPrompt({
    question: input.question,
    job: input.job,
    profile: profileContext,
    tone: input.tone,
    length: input.length
  });

  const answer = await cached(
    "answer",
    input.profile.metadata.updatedAt,
    {
      model: input.settings.model,
      temperature: input.settings.temperature,
      question: input.question.question,
      maxLength: input.question.maxLength,
      tone: input.tone ?? "professional",
      length: input.length ?? "medium",
      title: input.job.title,
      company: input.job.company,
      description: input.job.description?.slice(0, 2000)
    },
    () =>
      generateValidated(
        input.provider,
        {
          systemPrompt: prompt.systemPrompt,
          userPrompt: prompt.userPrompt,
          model: input.settings.model,
          temperature: 0.15
        },
        parseGeneratedAnswer
      ),
    input.skipCache
  );

  return groundGeneratedAnswer(answer, input.profile, input.question.maxLength ?? 800);
}
