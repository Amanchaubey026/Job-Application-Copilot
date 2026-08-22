import type { JobContext, RelevantProfileContext } from "~types/job";
import { SYSTEM_ROLE, wrapTrusted, wrapUntrusted } from "./system";

export function buildJobAnalysisPrompt(input: {
  job: JobContext;
  profile: RelevantProfileContext;
}): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `${SYSTEM_ROLE}

Compare the job to the supplied profile. matchScore is profile relevance between 0 and 1, not a hiring probability.
matchingSkills must be skills that actually appear in the profile.
missingSkills are job-required skills that do not appear in the profile.
Do not invent employers, projects, or skills.

Return JSON:
{
  "matchScore": 0.0,
  "matchingSkills": [],
  "matchingExperience": [],
  "relevantProjects": [],
  "missingSkills": [],
  "summary": "two or three sentences grounded in the profile"
}`;

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
        `Description:\n${(input.job.description ?? "").slice(0, 6000)}`
      ].join("\n")
    ),
    wrapTrusted("TASK", "Analyze profile relevance. JSON only.")
  ].join("\n\n");

  return { systemPrompt, userPrompt };
}
