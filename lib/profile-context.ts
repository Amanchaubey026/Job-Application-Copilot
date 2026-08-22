import type { JobContext, RelevantProfileContext } from "~types/job";
import type { UserProfile } from "~types/profile";
import { normalizeText } from "~utils/normalize";
import { getProfileValue } from "~utils/profile-path";

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "you",
  "your",
  "this",
  "that",
  "from",
  "have",
  "will",
  "are",
  "was",
  "were",
  "our",
  "role",
  "job",
  "about",
  "tell",
  "describe",
  "what",
  "why",
  "how"
]);

function tokens(...parts: Array<string | undefined>): Set<string> {
  const set = new Set<string>();
  for (const part of parts) {
    for (const word of normalizeText(part).split(" ")) {
      if (word.length < 3 || STOP.has(word)) continue;
      set.add(word);
    }
  }
  return set;
}

function overlapScore(haystack: string, query: Set<string>): number {
  if (query.size === 0) return 0;
  const words = tokens(haystack);
  let hits = 0;
  for (const word of query) {
    if (words.has(word)) hits += 1;
  }
  return hits;
}

function formatExperience(profile: UserProfile): string[] {
  return profile.experience.map((item, index) => {
    const bits = [
      item.title,
      item.company ? `at ${item.company}` : undefined,
      item.startDate || item.endDate
        ? `(${item.startDate ?? ""} – ${item.endDate ?? ""})`
        : undefined,
      item.description
    ].filter(Boolean);
    return `[experience[${index}]] ${bits.join(" ")}`.trim();
  });
}

function formatProjects(profile: UserProfile): string[] {
  return profile.projects.map((item, index) => {
    return `[projects[${index}]] ${[item.name, item.description].filter(Boolean).join(" — ")}`;
  });
}

function formatEducation(profile: UserProfile): string[] {
  return profile.education.map((item, index) => {
    return `[education[${index}]] ${[item.degree, item.field, item.institution].filter(Boolean).join(", ")}`;
  });
}

export function buildRelevantProfileContext(input: {
  question?: string;
  job?: JobContext;
  profile: UserProfile;
}): RelevantProfileContext {
  const query = tokens(
    input.question,
    input.job?.title,
    input.job?.company,
    input.job?.description?.slice(0, 2000)
  );

  const experience = formatExperience(input.profile)
    .map((text) => ({ text, score: overlapScore(text, query) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.text);

  const projects = formatProjects(input.profile)
    .map((text) => ({ text, score: overlapScore(text, query) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.text);

  const skills = input.profile.skills.filter((skill) => {
    if (query.size === 0) return true;
    return overlapScore(skill, query) > 0 || query.has(normalizeText(skill));
  });

  return {
    experience: experience.length ? experience : formatExperience(input.profile).slice(0, 3),
    projects: projects.length ? projects : formatProjects(input.profile).slice(0, 3),
    skills: skills.length ? skills : input.profile.skills.slice(0, 16),
    achievements: (input.profile.achievements ?? []).slice(0, 6),
    education: formatEducation(input.profile),
    summary: [
      input.profile.personal.fullName,
      input.profile.personal.location,
      input.profile.experience[0]
        ? `${input.profile.experience[0].title ?? ""} at ${input.profile.experience[0].company ?? ""}`
        : ""
    ]
      .filter(Boolean)
      .join(" · ")
  };
}

export function formatSourcesAsValue(profile: UserProfile, sources: string[]): string {
  const chunks: string[] = [];
  for (const source of sources) {
    if (source === "experience") {
      chunks.push(...formatExperience(profile));
      continue;
    }
    if (source === "projects") {
      chunks.push(...formatProjects(profile));
      continue;
    }
    if (source === "education") {
      chunks.push(...formatEducation(profile));
      continue;
    }
    if (source === "skills") {
      if (profile.skills.length) chunks.push(profile.skills.join(", "));
      continue;
    }
    if (source === "achievements") {
      chunks.push(...(profile.achievements ?? []));
      continue;
    }
    if (source === "certifications") {
      chunks.push(
        ...(profile.certifications ?? []).map((item) =>
          [item.name, item.issuer].filter(Boolean).join(" — ")
        )
      );
      continue;
    }
    if (source === "languages") {
      chunks.push(
        ...(profile.languages ?? []).map((item) =>
          [item.name, item.proficiency].filter(Boolean).join(" ")
        )
      );
      continue;
    }
    const value = getProfileValue(profile, source);
    if (value) chunks.push(value);
  }
  return chunks.filter(Boolean).join("\n").trim();
}
