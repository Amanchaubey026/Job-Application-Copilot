export function normalizeText(value?: string | null): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\be-?mail\b/g, "email")
    .replace(/[_./\\-]+/g, " ")
    .replace(/[^a-z0-9+#\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function containsPhrase(haystack: string, phrase: string): boolean {
  const h = normalizeText(haystack);
  const p = normalizeText(phrase);
  if (!h || !p) return false;
  if (h === p) return true;
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(h);
}

export function expandTerm(term: string): string[] {
  const normalized = normalizeText(term);
  if (!normalized) return [];
  const collapsed = normalized.replace(/\s+/g, "");
  return collapsed === normalized ? [normalized] : [normalized, collapsed];
}

export function normalizeAutocomplete(value?: string | null): string[] {
  if (!value) return [];
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/^section-.*$/, "").trim())
    .filter(Boolean)
    .map((token) => token.replace(/^new-|^current-|^shipping-|^billing-/, ""))
    .filter(Boolean);
}

export function uniqueStrings(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}
