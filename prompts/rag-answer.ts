import type { AnswerLength, AnswerTone } from "~types/ai";
import type { ApplicationQuestion, JobContext } from "~types/job";
import type { RetrievalResult } from "~types/knowledge";
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

export function formatEvidence(results: RetrievalResult[]): string {
  if (!results.length) return "(none)";
  return results
    .map((result) => {
      const meta = [
        result.item.metadata.company,
        result.item.metadata.role,
        result.item.type
      ]
        .filter(Boolean)
        .join(" · ");
      return `[${result.item.id}] ${result.item.title}\n${meta}\n${result.item.content}`;
    })
    .join("\n\n");
}

export function buildRagAnswerPrompt(input: {
  question: ApplicationQuestion;
  job: JobContext;
  evidence: RetrievalResult[];
  tone?: AnswerTone;
  length?: AnswerLength;
}): { systemPrompt: string; userPrompt: string } {
  const tone = input.tone ?? "professional";
  const length = input.length ?? "medium";
  const maxLength = input.question.maxLength ?? 800;
  const allowedIds = input.evidence.map((result) => result.item.id);

  const systemPrompt = `${SYSTEM_ROLE}

Write an application answer using only CAREER EVIDENCE.
Never invent employers, titles, years, technologies, achievements, metrics, projects, certifications, education, or dates.
Every claim must be supported by the evidence blocks.
Cite sourceIds using only these IDs: ${allowedIds.join(", ") || "(none)"}.
If evidence is insufficient, return an empty answer and needsUserInput=true.

Return JSON:
{
  "answer": "",
  "confidence": 0.0,
  "sourceIds": [],
  "needsUserInput": false,
  "missingInformation": []
}

The answer must be at most ${maxLength} characters.
${TONE_HINT[tone]} ${LENGTH_HINT[length]}`;

  const userPrompt = [
    wrapTrusted("CAREER EVIDENCE", formatEvidence(input.evidence)),
    wrapUntrusted(
      "JOB INFORMATION",
      [
        `Title: ${input.job.title ?? "(unknown)"}`,
        `Company: ${input.job.company ?? "(unknown)"}`,
        `Location: ${input.job.location ?? "(unknown)"}`,
        `Description:\n${(input.job.description ?? "").slice(0, 3000)}`
      ].join("\n")
    ),
    wrapUntrusted("APPLICATION QUESTION", input.question.question),
    wrapTrusted(
      "TASK",
      `Answer using only CAREER EVIDENCE. Maximum ${maxLength} characters. JSON only.`
    )
  ].join("\n\n");

  return { systemPrompt, userPrompt };
}
