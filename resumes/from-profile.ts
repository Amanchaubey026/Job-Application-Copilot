import { resumeRepository } from "~storage/resume-repository";
import type { UserProfile } from "~types/profile";
import type { ResumeContent, ResumeVersion } from "~types/resume";
import { createId } from "~utils/id";

export function contentFromProfile(profile: UserProfile): ResumeContent {
  return {
    summary: [profile.experience[0]?.title, profile.personal.location]
      .filter(Boolean)
      .join(" · ") || undefined,
    skills: [...profile.skills],
    experience: profile.experience.map((item) => ({
      id: item.id,
      company: item.company,
      title: item.title,
      dates: [item.startDate, item.endDate].filter(Boolean).join(" – "),
      bullets: (item.description ?? "")
        .split(/\n+/)
        .map((line) => line.replace(/^[-•]\s*/, "").trim())
        .filter(Boolean)
    })),
    projects: profile.projects.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description
    })),
    education: profile.education.map((item) => ({
      id: item.id,
      institution: item.institution,
      degree: item.degree,
      field: item.field,
      dates: [item.startDate, item.endDate].filter(Boolean).join(" – ")
    })),
    certifications: (profile.certifications ?? []).map((item) => item.name ?? "").filter(Boolean),
    achievements: [...(profile.achievements ?? [])]
  };
}

export async function ensureMasterResume(profile: UserProfile): Promise<ResumeVersion[]> {
  const existing = await resumeRepository.list();
  if (existing.length) return existing;
  const now = new Date().toISOString();
  const master: ResumeVersion = {
    id: createId(),
    name: "Master Resume",
    isPrimary: true,
    content: contentFromProfile(profile),
    sourceProfileVersion: profile.metadata.version ?? 1,
    createdAt: now,
    updatedAt: now
  };
  await resumeRepository.save(master);
  return [master];
}
