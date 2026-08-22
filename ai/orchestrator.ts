import type { AIProvider, AiSettings, GeneratedAnswer, JobAnalysis } from "~types/ai";
import type { ApplicationQuestion, JobContext } from "~types/job";
import type { ResumeContent, ResumeTailoring, TailoringChange } from "~types/resume";
import type { UserProfile } from "~types/profile";
import { analyzeJobMatch, classifyAmbiguousField, generateAnswerWithAi, retrieveEvidence } from "./services";
import { generateValidated } from "./generate";
import { parseResumeTailoring } from "./schemas";
import { buildResumeTailoringPrompt, RESUME_TAILORING_PROMPT_VERSION } from "~prompts/resume-tailoring";
import { validateTailoring } from "~resumes/validate-tailoring";
import { changesFromTailoring } from "~resumes/diff";
import { buildRetrievalQuery } from "~retrieval/query";
import { AppError } from "~types/errors";

export class AIOrchestrator {
  constructor(
    private readonly provider: AIProvider,
    private readonly settings: AiSettings
  ) {}

  async analyzeJob(job: JobContext, profile: UserProfile): Promise<JobAnalysis> {
    const result = await analyzeJobMatch({
      provider: this.provider,
      settings: this.settings,
      job,
      profile
    });
    return result.analysis;
  }

  async generateAnswer(input: {
    question: ApplicationQuestion;
    job: JobContext;
    profile: UserProfile;
  }): Promise<GeneratedAnswer> {
    return generateAnswerWithAi({
      provider: this.provider,
      settings: this.settings,
      ...input
    });
  }

  async classifyField(
    field: Parameters<typeof classifyAmbiguousField>[0]["field"],
    profile: UserProfile
  ) {
    return classifyAmbiguousField({
      provider: this.provider,
      settings: this.settings,
      field,
      profile
    });
  }

  async tailorResume(input: {
    job: JobContext;
    profile: UserProfile;
    resume: ResumeContent;
  }): Promise<ResumeTailoring> {
    if (!this.settings.model) throw new AppError("AI_NO_MODEL");
    const evidence = await retrieveEvidence({
      settings: this.settings,
      query: buildRetrievalQuery({ job: input.job }),
      profile: input.profile
    });
    const prompt = buildResumeTailoringPrompt({
      job: input.job,
      resume: input.resume,
      evidenceTitles: evidence.map((item) => item.item.title)
    });
    const parsed = await generateValidated(
      this.provider,
      {
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        model: this.settings.model,
        temperature: 0.15
      },
      parseResumeTailoring
    );
    const validated = validateTailoring(
      {
        ...parsed,
        changes: []
      },
      input.profile
    );
    const changes: TailoringChange[] = changesFromTailoring({
      current: input.resume,
      summaryRecommendation: validated.summaryRecommendation,
      skillsToEmphasize: validated.skillsToEmphasize,
      projectsToEmphasize: validated.projectsToEmphasize,
      experiencePointsToEmphasize: validated.experiencePointsToEmphasize
    });
    return { ...validated, changes };
  }
}

export function createOrchestrator(provider: AIProvider, settings: AiSettings): AIOrchestrator {
  return new AIOrchestrator(provider, settings);
}

void RESUME_TAILORING_PROMPT_VERSION;
