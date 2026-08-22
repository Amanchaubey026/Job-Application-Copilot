import { normalizeText } from "~utils/normalize";

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
  "job",
  "role",
  "about",
  "tell",
  "describe"
]);

export function tokenize(text?: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length >= 2 && !STOP.has(token));
}

export function tokenSet(text?: string): Set<string> {
  return new Set(tokenize(text));
}

export function overlap(query: Set<string>, haystack: Set<string>): number {
  if (query.size === 0 || haystack.size === 0) return 0;
  let hits = 0;
  for (const token of query) {
    if (haystack.has(token)) hits += 1;
  }
  return hits / query.size;
}
