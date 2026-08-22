import type {
  AIProvider,
  AiSettings,
  AnswerLength,
  AnswerTone,
  GeneratedAnswer,
  JobAnalysis
} from "~types/ai";
import type { JobMatch, JobRequirement } from "~types/application";
import type { ApplicationQuestion, JobContext } from "~types/job";
import type { SerializableFormField } from "~types/form";
import type { FieldMatch } from "~types/matching";
import type { RetrievalResult } from "~types/knowledge";
import type { UserProfile } from "~types/profile";
import { AppError } from "~types/errors";
import { buildFieldClassificationPrompt } from "~prompts/field-classification";
import { buildJobAnalysisPrompt } from "~prompts/job-analysis";
import { buildAnswerPrompt } from "~prompts/answer-generation";
import { buildRagAnswerPrompt } from "~prompts/rag-answer";
import { buildRequirementPrompt } from "~prompts/requirements";
import { buildRelevantProfileContext, formatSourcesAsValue } from "~lib/profile-context";
import { aiCacheRepository } from "~storage/ai-cache-repository";
import { knowledgeRepository } from "~storage/knowledge-repository";
import { embeddingRepository } from "~storage/embedding-repository";
import { OllamaEmbeddingProvider } from "./ollama-embeddings";
import { createRetriever } from "~retrieval/hybrid";
import { buildRetrievalQuery } from "~retrieval/query";
import {
  fallbackRequirementsFromText,
  matchRequirements
} from "~knowledge/match-requirements";
import { ensureKnowledgeForProfile } from "~knowledge/sync";
import {
  parseClassification,
  parseGeneratedAnswer,
  parseJobAnalysis,
  parseJobRequirements,
  parseRagAnswer
} from "./schemas";
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

export async function retrieveEvidence(input: {
  settings: AiSettings;
  query: string;
  profile?: UserProfile;
}): Promise<RetrievalResult[]> {
  const items = input.profile
    ? await ensureKnowledgeForProfile(input.profile)
    : await knowledgeRepository.list();
  if (!items.length) return [];
  const embeddings = input.settings.embeddingModel
    ? await embeddingRepository.list()
    : [];
  const embedder = input.settings.embeddingModel
    ? new OllamaEmbeddingProvider(
        input.settings.ollamaUrl,
        input.settings.embeddingModel,
        Math.min(input.settings.timeoutMs, 15_000)
      )
    : undefined;
  const retriever = createRetriever(items, embeddings, embedder);
  return retriever.search(input.query);
}

export async function extractJobRequirements(input: {
  provider: AIProvider;
  settings: AiSettings;
  job: JobContext;
  profile: UserProfile;
}): Promise<JobRequirement[]> {
  const prompt = buildRequirementPrompt(input.job);
  try {
    const parsed = await cached(
      "job-requirements",
      input.profile.metadata.updatedAt,
      {
        model: input.settings.model,
        title: input.job.title,
        description: input.job.description?.slice(0, 2000)
      },
      () =>
        generateValidated(
          input.provider,
          {
            systemPrompt: prompt.systemPrompt,
            userPrompt: prompt.userPrompt,
            model: input.settings.model,
            temperature: 0.1
          },
          parseJobRequirements
        )
    );
    return parsed.requirements;
  } catch (error) {
    logAiError("requirements", error);
    const catalog = [
      ...input.profile.skills,
      "React",
      "TypeScript",
      "Node.js",
      "Python",
      "AWS",
      "Docker",
      "Kubernetes"
    ];
    return fallbackRequirementsFromText(input.job.description ?? "", catalog);
  }
}

export async function analyzeJobMatch(input: {
  provider: AIProvider;
  settings: AiSettings;
  job: JobContext;
  profile: UserProfile;
}): Promise<{ analysis: JobAnalysis; match: JobMatch; evidence: RetrievalResult[] }> {
  const analysis = await analyzeJobWithAi(input);
  const items = await ensureKnowledgeForProfile(input.profile);
  const requirements = input.settings.model
    ? await extractJobRequirements(input)
    : fallbackRequirementsFromText(input.job.description ?? "", input.profile.skills);
  const match = matchRequirements(requirements, items);
  const evidence = await retrieveEvidence({
    settings: input.settings,
    query: buildRetrievalQuery({ job: input.job }),
    profile: input.profile
  });
  return {
    analysis: {
      ...analysis,
      matchingSkills: match.matchedRequirements
        .filter((item) => item.requirement.category === "technical")
        .map((item) => item.requirement.name),
      missingSkills: match.unmatchedRequirements.map((item) => item.name),
      matchingExperience: match.evidence
        .filter((item) => item.item.type === "experience")
        .map((item) => item.item.title),
      relevantProjects: match.evidence
        .filter((item) => item.item.type === "project")
        .map((item) => item.item.title)
    },
    match: { ...match, evidence },
    evidence
  };
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

  const evidence = await retrieveEvidence({
    settings: input.settings,
    query: buildRetrievalQuery({ question: input.question.question, job: input.job }),
    profile: input.profile
  });

  if (evidence.length) {
    const allowed = new Set(evidence.map((item) => item.item.id));
    const prompt = buildRagAnswerPrompt({
      question: input.question,
      job: input.job,
      evidence,
      tone: input.tone,
      length: input.length
    });
    const rag = await cached(
      "rag-answer",
      input.profile.metadata.updatedAt,
      {
        model: input.settings.model,
        question: input.question.question,
        maxLength: input.question.maxLength,
        tone: input.tone ?? "professional",
        length: input.length ?? "medium",
        evidenceIds: evidence.map((item) => item.item.id),
        title: input.job.title
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
          parseRagAnswer
        ),
      input.skipCache
    );

    const validIds = rag.sourceIds.filter((id) => allowed.has(id));
    if (rag.sourceIds.length && validIds.length !== rag.sourceIds.length) {
      throw new AppError("AI_INVALID", "AI returned an unknown evidence source.");
    }
    if (!rag.answer.trim() || rag.needsUserInput) {
      return {
        answer: "",
        confidence: 0,
        sources: [],
        sourceIds: [],
        citations: [],
        needsUserInput: true,
        missingInformation: rag.missingInformation?.length
          ? rag.missingInformation
          : ["No strong evidence found."]
      };
    }

    const citations = evidence
      .filter((item) => validIds.includes(item.item.id) || validIds.length === 0)
      .slice(0, 6)
      .map((item) => ({ knowledgeId: item.item.id, title: item.item.title }));

    return groundGeneratedAnswer(
      {
        answer: rag.answer,
        confidence: rag.confidence,
        sources: citations.map((item) => item.title),
        sourceIds: citations.map((item) => item.knowledgeId),
        citations,
        needsUserInput: false,
        missingInformation: rag.missingInformation
      },
      input.profile,
      input.question.maxLength ?? 800
    );
  }

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
