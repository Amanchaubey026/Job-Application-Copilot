import type { UserProfile } from "~types/profile";

const ADD_RE = /^\s*\+?\s*add\s*$/i;
const SECTION_RE = /(education|experience|employment|work history|professional|social|links|skill)/i;

function headingNear(el: HTMLElement): string {
  const bits: string[] = [];
  let node: HTMLElement | null = el;
  for (let depth = 0; depth < 6 && node; depth += 1) {
    const prev = node.previousElementSibling;
    if (prev) bits.push(prev.textContent ?? "");
    const heading = node.querySelector("h1, h2, h3, h4, legend, [class*='title'], [class*='header'], [class*='label']");
    if (heading) bits.push(heading.textContent ?? "");
    bits.push((node.textContent ?? "").slice(0, 80));
    node = node.parentElement;
  }
  return bits.join(" ");
}

function addButtons(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll("button, a, [role='button'], span, div")).filter(
    (node): node is HTMLElement => {
      if (!(node instanceof HTMLElement)) return false;
      const label = `${node.getAttribute("aria-label") ?? ""} ${node.textContent ?? ""}`.trim();
      if (!ADD_RE.test(node.textContent?.trim() ?? "") && !/^\s*\+\s*add\s*$/i.test(label)) {
        return false;
      }
      return SECTION_RE.test(headingNear(node));
    }
  );
}

function clicksFor(label: string, profile: UserProfile): number {
  const blob = label.toLowerCase();
  if (blob.includes("education")) return Math.max(profile.education.length, 1);
  if (blob.includes("experience") || blob.includes("employment") || blob.includes("work")) {
    return Math.max(profile.experience.length, 1);
  }
  if (blob.includes("social") || blob.includes("link")) {
    return [profile.links.linkedin, profile.links.github, profile.links.portfolio].filter(Boolean).length || 1;
  }
  return 1;
}

export function expandRepeatableSections(
  profile: UserProfile,
  root: ParentNode = document
): string[] {
  const opened: string[] = [];
  const seen = new Set<HTMLElement>();
  for (const button of addButtons(root)) {
    if (seen.has(button)) continue;
    seen.add(button);
    const section = headingNear(button);
    const times = Math.min(clicksFor(section, profile), 4);
    for (let i = 0; i < times; i += 1) {
      button.click();
    }
    const name = section.match(SECTION_RE)?.[1]?.toLowerCase();
    if (name) opened.push(name);
  }
  return opened;
}
