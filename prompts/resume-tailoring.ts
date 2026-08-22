import type { JobContext } from "~types/job";
import type { ResumeContent } from "~types/resume";
import { RESUME_TAILORING_PROMPT_VERSION } from "~types/resume";
import { SYSTEM_ROLE, wrapTrusted, wrapUntrusted } from "./system";

export { RESUME_TAILORING_PROMPT_VERSION };

export function buildResumeTailoringPrompt(input: {
  job: JobContext;
  resume: ResumeContent;
  evidenceTitles: string[];
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `${SYSTEM_ROLE}

Recommend how to present an existing resume for this job.
You may emphasize, reorder, condense, or rewrite wording from the resume.
You must not invent skills, companies, projects, metrics, or experience.
skillsToEmphasize must already appear in the resume skills list.
skillsNotFoundInProfile are job skills that are absent from the resume.

Return JSON:
{
  "summaryRecommendation": "",
  "skillsToEmphasize": [],
  "projectsToEmphasize": [],
  "experiencePointsToEmphasize": [],
  "skillsNotFoundInProfile": []
}

Prompt version: ${RESUME_TAILORING_PROMPT_VERSION}`;

  const userPrompt = [
    wrapTrusted(
      "MASTER RESUME",
      JSON.stringify(
        {
          summary: input.resume.summary,
          skills: input.resume.skills,
          experience: input.resume.experience,
          projects: input.resume.projects
        },
        null,
        2
      )
    ),
    wrapTrusted("CAREER EVIDENCE TITLES", input.evidenceTitles.join("\n") || "(none)"),
    wrapUntrusted(
      "JOB INFORMATION",
      [
        `Title: ${input.job.title ?? "(unknown)"}`,
        `Company: ${input.job.company ?? "(unknown)"}`,
        `Description:\n${(input.job.description ?? "").slice(0, 4000)}`
      ].join("\n")
    ),
    wrapTrusted("TASK", "Recommend truthful tailoring. JSON only.")
  ].join("\n\n");

  return { systemPrompt, userPrompt };
}
