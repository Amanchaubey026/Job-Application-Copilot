import type { PageContext } from "~types/form";

const SIGNALS = [
  "application",
  "candidate",
  "resume",
  "employment",
  "education",
  "experience",
  "job application",
  "apply now",
  "applicant",
  "cover letter"
];

export function getPageContext(doc: Document = document): PageContext {
  const title = doc.title ?? "";
  const snippet = `${title} ${doc.body?.innerText?.slice(0, 4000) ?? ""}`.toLowerCase();
  const signals = SIGNALS.filter((signal) => snippet.includes(signal));
  return {
    title,
    url: typeof location !== "undefined" ? location.href : "",
    looksLikeJobApplication: signals.length >= 2,
    signals
  };
}
