import type { ResumeTailoring } from "~types/resume";
import type { UserProfile } from "~types/profile";
import { normalizeText } from "~utils/normalize";

export function validateTailoring(
  tailoring: ResumeTailoring,
  profile: UserProfile
): ResumeTailoring {
  const owned = new Set(profile.skills.map((skill) => normalizeText(skill)));
  const projectNames = new Set(profile.projects.map((item) => normalizeText(item.name)));
  const skillsToEmphasize = tailoring.skillsToEmphasize.filter((skill) =>
    owned.has(normalizeText(skill))
  );
  const projectsToEmphasize = tailoring.projectsToEmphasize.filter((name) =>
    projectNames.has(normalizeText(name))
  );
  const notFound = tailoring.skillsNotFoundInProfile.filter(
    (skill) => !owned.has(normalizeText(skill))
  );
  return {
    ...tailoring,
    skillsToEmphasize,
    projectsToEmphasize,
    skillsNotFoundInProfile: notFound
  };
}
