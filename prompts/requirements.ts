import type { JobContext } from "~types/job";
import { SYSTEM_ROLE, wrapTrusted, wrapUntrusted } from "./system";

export function buildRequirementPrompt(job: JobContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = `${SYSTEM_ROLE}

Extract hiring requirements from the job description. Use only the job text. Do not invent tools.
Return JSON:
{
  "requirements": [
    { "name": "React", "category": "technical", "importance": "required" }
  ]
}

category is technical | experience | education | soft_skill | other.
importance is required | preferred | unknown.`;

  const userPrompt = [
    wrapUntrusted(
      "JOB INFORMATION",
      [
        `Title: ${job.title ?? "(unknown)"}`,
        `Company: ${job.company ?? "(unknown)"}`,
        `Description:\n${(job.description ?? "").slice(0, 5000)}`
      ].join("\n")
    ),
    wrapTrusted("TASK", "Extract requirements. JSON only.")
  ].join("\n\n");

  return { systemPrompt, userPrompt };
}
