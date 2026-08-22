import type { JobMatch, JobRequirement, JobRequirementMatch } from "~types/application";
import type { CareerKnowledgeItem, RetrievalResult } from "~types/knowledge";
import { lexicalSearch } from "~retrieval/lexical";
import { normalizeText } from "~utils/normalize";

export function matchRequirements(
  requirements: JobRequirement[],
  items: CareerKnowledgeItem[]
): JobMatch {
  const matched: JobRequirementMatch[] = [];
  const unmatched: JobRequirement[] = [];
  const evidence: RetrievalResult[] = [];

  for (const requirement of requirements) {
    const hits = lexicalSearch(items, requirement.name, { topK: 3, minScore: 0.18 });
    if (hits.length) {
      matched.push({
        requirement,
        score: hits[0]?.score ?? 0,
        evidenceTitles: hits.map((hit) => hit.item.title)
      });
      for (const hit of hits) evidence.push(hit);
    } else {
      unmatched.push(requirement);
    }
  }

  const required = requirements.filter((item) => item.importance === "required");
  const requiredHits = matched.filter((item) => item.requirement.importance === "required").length;
  const score =
    requirements.length === 0
      ? 0
      : required.length
        ? (requiredHits / required.length) * 0.7 + (matched.length / requirements.length) * 0.3
        : matched.length / requirements.length;

  const seen = new Set<string>();
  const uniqueEvidence = evidence.filter((item) => {
    if (seen.has(item.item.id)) return false;
    seen.add(item.item.id);
    return true;
  });

  return {
    score: Math.min(1, score),
    matchedRequirements: matched,
    unmatchedRequirements: unmatched,
    evidence: uniqueEvidence.slice(0, 8),
    summary: unmatched.length
      ? `${matched.length} requirements appear in your career knowledge. ${unmatched.length} were not found in your profile.`
      : `${matched.length} requirements appear in your career knowledge.`
  };
}

export function fallbackRequirementsFromText(
  text: string,
  catalog: string[]
): JobRequirement[] {
  const blob = normalizeText(text);
  return catalog
    .filter((name) => blob.includes(normalizeText(name)))
    .map((name) => ({
      name,
      category: "technical" as const,
      importance: "unknown" as const
    }));
}
