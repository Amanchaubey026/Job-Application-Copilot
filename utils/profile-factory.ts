import type { UserProfile } from "~types/profile";
import { createId } from "./id";

export function createEmptyProfile(
  overrides: Partial<UserProfile> = {}
): UserProfile {
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? createId(),
    personal: { ...overrides.personal },
    links: { ...overrides.links },
    experience: overrides.experience ?? [],
    education: overrides.education ?? [],
    skills: overrides.skills ?? [],
    projects: overrides.projects ?? [],
    certifications: overrides.certifications ?? [],
    achievements: overrides.achievements ?? [],
    languages: overrides.languages ?? [],
    rawResumeText: overrides.rawResumeText,
    metadata: {
      createdAt: overrides.metadata?.createdAt ?? now,
      updatedAt: overrides.metadata?.updatedAt ?? now,
      sourceFileName: overrides.metadata?.sourceFileName
    }
  };
}

export function touchProfile(profile: UserProfile): UserProfile {
  return {
    ...profile,
    metadata: {
      ...profile.metadata,
      updatedAt: new Date().toISOString()
    }
  };
}
