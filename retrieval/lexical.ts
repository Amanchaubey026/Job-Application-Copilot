import type { CareerKnowledgeItem, RetrievalOptions, RetrievalResult } from "~types/knowledge";
import { DEFAULT_RETRIEVAL_MIN_SCORE, DEFAULT_RETRIEVAL_TOP_K } from "~types/knowledge";
import { normalizeText } from "~utils/normalize";
import { overlap, tokenSet } from "./tokenize";

export function lexicalSearch(
  items: CareerKnowledgeItem[],
  query: string,
  options: RetrievalOptions = {}
): RetrievalResult[] {
  const topK = options.topK ?? DEFAULT_RETRIEVAL_TOP_K;
  const minScore = options.minScore ?? DEFAULT_RETRIEVAL_MIN_SCORE;
  const queryTokens = tokenSet(query);
  const queryNorm = normalizeText(query);

  const scored = items
    .filter((item) => !options.types || options.types.includes(item.type))
    .map((item) => {
      const title = normalizeText(item.title);
      const content = normalizeText(item.content);
      const tags = (item.metadata.tags ?? []).map((tag) => normalizeText(tag));
      const techs = (item.metadata.technologies ?? []).map((tech) => normalizeText(tech));
      const meta = normalizeText(
        [item.metadata.company, item.metadata.role, item.metadata.project, item.metadata.institution]
          .filter(Boolean)
          .join(" ")
      );
      const blob = tokenSet([title, content, tags.join(" "), techs.join(" "), meta].join(" "));

      let score = overlap(queryTokens, blob) * 0.55;
      if (title && queryNorm.includes(title)) score += 0.35;
      else if (title && overlap(queryTokens, tokenSet(title)) > 0.4) score += 0.25;
      for (const tag of tags) {
        if (tag && queryNorm.includes(tag)) score += 0.12;
      }
      for (const tech of techs) {
        if (tech && queryNorm.includes(tech)) score += 0.16;
      }
      if (meta && overlap(queryTokens, tokenSet(meta)) > 0.3) score += 0.1;
      return {
        item,
        score: Math.min(1, score),
        retrievalMethod: "keyword" as const
      };
    })
    .filter((result) => result.score >= minScore)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}
