export const PROFILE_SOURCE_ALLOWLIST = [
  "personal.firstName",
  "personal.lastName",
  "personal.fullName",
  "personal.email",
  "personal.phone",
  "personal.location",
  "personal.address.city",
  "personal.address.state",
  "personal.address.postalCode",
  "personal.address.country",
  "personal.address.fullAddress",
  "links.linkedin",
  "links.github",
  "links.portfolio",
  "links.website",
  "experience",
  "education",
  "skills",
  "projects",
  "achievements",
  "certifications",
  "languages"
] as const;

export type AllowedProfileSource = (typeof PROFILE_SOURCE_ALLOWLIST)[number];

const ALLOWED = new Set<string>(PROFILE_SOURCE_ALLOWLIST);

const INDEXED_SOURCE_RE =
  /^(experience|education|projects|certifications|languages)\[\d+\](?:\.[A-Za-z]+)?$/;

export function isAllowedProfileSource(source: string): boolean {
  const trimmed = source.trim();
  if (ALLOWED.has(trimmed)) return true;
  return INDEXED_SOURCE_RE.test(trimmed);
}

export function sanitizeProfileSources(sources: string[]): string[] {
  const unique: string[] = [];
  for (const source of sources) {
    const trimmed = source.trim();
    if (!isAllowedProfileSource(trimmed)) continue;
    if (unique.includes(trimmed)) continue;
    unique.push(trimmed);
  }
  return unique;
}

export const IDENTITY_PROFILE_PATHS = new Set([
  "personal.email",
  "personal.phone",
  "personal.firstName",
  "personal.lastName",
  "personal.fullName",
  "links.linkedin",
  "links.github"
]);
