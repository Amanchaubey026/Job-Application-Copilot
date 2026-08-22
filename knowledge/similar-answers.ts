import type { AnswerLibraryItem, ApplicationAnswer, JobApplication } from "~types/application";
import { overlap, tokenSet } from "~retrieval/tokenize";

export function findSimilarAnswers(
  question: string,
  applications: JobApplication[],
  library: AnswerLibraryItem[] = []
): Array<{ question: string; answer: string; source: string }> {
  const query = tokenSet(question);
  const results: Array<{ question: string; answer: string; source: string; score: number }> = [];

  for (const app of applications) {
    for (const item of app.answers ?? []) {
      const score = overlap(query, tokenSet(item.question));
      if (score >= 0.45) {
        results.push({
          question: item.question,
          answer: item.answer,
          source: app.job.company || app.job.title || "Previous application",
          score
        });
      }
    }
  }

  for (const item of library) {
    const score = Math.max(overlap(query, tokenSet(item.question)), overlap(query, tokenSet(item.category)));
    if (score >= 0.45) {
      results.push({
        question: item.question,
        answer: item.answer,
        source: item.category,
        score
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ question: q, answer, source }) => ({ question: q, answer, source }));
}
