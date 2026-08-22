import type { AnswerLength, AnswerTone } from "~types/ai";
import type { ApplicationQuestion, JobContext, RelevantProfileContext } from "~types/job";
import { SYSTEM_ROLE, wrapTrusted, wrapUntrusted } from "./system";

const LENGTH_HINT: Record<AnswerLength, string> = {
  short: "Write 2-4 sentences.",
  medium: "Write one short paragraph (4-7 sentences).",
  detailed: "Write 2 short paragraphs."
};

const TONE_HINT: Record<AnswerTone, string> = {
  professional: "Use a professional tone.",
  conversational: "Use a clear, conversational tone.",
  concise: "Be concise and direct."
};

export function buildAnswerPrompt(input: {
  question: ApplicationQuestion;
  job: JobContext;
  profile: RelevantProfileContext;
  tone?: AnswerTone;
  length?: AnswerLength;
}): { systemPrompt: string; userPrompt: string } {
  const tone = input.tone ?? "professional";
  const length = input.length ?? "medium";
  const maxLength = input.question.maxLength ?? 800;

  const systemPrompt = `${SYSTEM_ROLE}

Write an application answer using only USER PROFILE.
Never invent employers, titles, years, technologies, achievements, metrics, projects, certifications, education, or dates.
If the profile cannot support an honest answer, return an empty answer and needsUserInput=true.

Return JSON:
{
  "answer": "",
  "confidence": 0.0,
  "sources": ["experience", "projects"],
  "needsUserInput": false,
  "missingInformation": []
}

sources must be profile paths such as experience, projects, skills, education, achievements.
The answer must be at most ${maxLength} characters.
${TONE_HINT[tone]} ${LENGTH_HINT[length]}`;

  const userPrompt = [
    wrapTrusted(
      "USER PROFILE",
      [
        `Skills: ${input.profile.skills.join(", ") || "(none)"}`,
        `Experience:\n${input.profile.experience.join("\n") || "(none)"}`,
        `Projects:\n${input.profile.projects.join("\n") || "(none)"}`,
        `Education:\n${input.profile.education.join("\n") || "(none)"}`,
        `Achievements:\n${input.profile.achievements.join("\n") || "(none)"}`
      ].join("\n")
    ),
    wrapUntrusted(
      "JOB INFORMATION",
      [
        `Title: ${input.job.title ?? "(unknown)"}`,
        `Company: ${input.job.company ?? "(unknown)"}`,
        `Location: ${input.job.location ?? "(unknown)"}`,
        `Description:\n${(input.job.description ?? "").slice(0, 4000)}`
      ].join("\n")
    ),
    wrapUntrusted("APPLICATION QUESTION", input.question.question),
    wrapTrusted(
      "TASK",
      `Answer the application question using only the profile. Maximum ${maxLength} characters. JSON only.`
    )
  ].join("\n\n");

  return { systemPrompt, userPrompt };
}
