const LINKEDIN_SLUG_RE = /linkedin\.com\/in\/([A-Za-z0-9_-]+)/i;
const GITHUB_SLUG_RE = /github\.com\/([A-Za-z0-9_-]+)/i;

export function normalizeLinkedInUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(LINKEDIN_SLUG_RE);
  const slug = match?.[1];
  if (!slug) return undefined;
  return `https://www.linkedin.com/in/${slug}`;
}

export function normalizeGitHubUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(GITHUB_SLUG_RE);
  const slug = match?.[1];
  if (!slug) return undefined;
  if (["features", "topics", "about", "login", "pricing"].includes(slug.toLowerCase())) {
    return undefined;
  }
  return `https://github.com/${slug}`;
}

export function looksLikeUrl(value: string): boolean {
  return /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(value.trim());
}
