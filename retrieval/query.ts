import type { JobContext } from "~types/job";
import { uniqueStrings } from "~utils/normalize";

const TECH_HINTS = [
  "react",
  "next.js",
  "node.js",
  "typescript",
  "javascript",
  "python",
  "java",
  "go",
  "mongodb",
  "postgres",
  "sql",
  "aws",
  "docker",
  "kubernetes",
  "graphql",
  "ai",
  "llm",
  "chatbot"
];

export function buildRetrievalQuery(input: {
  question?: string;
  job?: JobContext;
}): string {
  const description = input.job?.description ?? "";
  const techs = TECH_HINTS.filter((hint) => description.toLowerCase().includes(hint));
  return uniqueStrings([
    input.job?.title,
    input.job?.company,
    input.question,
    techs.join(" "),
    description.slice(0, 400)
  ]).join("\n");
}
