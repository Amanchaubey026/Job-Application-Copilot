import type { ApplicationStep } from "~types/application";

export function detectApplicationSteps(doc: Document = document): ApplicationStep[] {
  const current = doc.querySelector("[aria-current='step'], [aria-current='page'].step, .step.current, .step--current");
  const list = Array.from(
    doc.querySelectorAll("[class*='step'], ol[class*='progress'] > li, [role='listitem']")
  ).slice(0, 8);
  if (list.length >= 2) {
    return list.map((el, index) => {
      const title = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
      const selected = el === current || el.getAttribute("aria-current") === "step";
      const done = /complete|done|checked/i.test(el.className) || el.getAttribute("aria-selected") === "true";
      return {
        id: `step-${index}`,
        index,
        title: title || `Step ${index + 1}`,
        status: selected ? "current" : done ? "completed" : "upcoming"
      } satisfies ApplicationStep;
    });
  }

  const text = (doc.body?.innerText || doc.body?.textContent || "").slice(0, 3000);
  const match = text.match(/step\s+(\d+)\s+(?:of|\/)\s+(\d+)/i);
  if (match) {
    const currentIndex = Number(match[1]) - 1;
    const total = Number(match[2]);
    return Array.from({ length: Math.min(total, 8) }, (_, index) => ({
      id: `step-${index}`,
      index,
      title: `Step ${index + 1}`,
      status:
        index < currentIndex ? "completed" : index === currentIndex ? "current" : "upcoming"
    }));
  }
  return [];
}
