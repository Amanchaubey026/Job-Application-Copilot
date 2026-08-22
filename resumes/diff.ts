import type { ResumeContent, ResumeDiffLine, TailoringChange } from "~types/resume";
import { createId } from "~utils/id";

export function lineDiff(before: string, after: string): ResumeDiffLine[] {
  const a = before.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const b = after.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const inA = new Set(a);
  const inB = new Set(b);
  const lines: ResumeDiffLine[] = [];
  for (const line of a) {
    lines.push({ kind: inB.has(line) ? "unchanged" : "removed", text: line });
  }
  for (const line of b) {
    if (!inA.has(line)) lines.push({ kind: "added", text: line });
  }
  return lines;
}

export function changesFromTailoring(input: {
  current: ResumeContent;
  summaryRecommendation?: string;
  skillsToEmphasize: string[];
  projectsToEmphasize: string[];
  experiencePointsToEmphasize: string[];
}): TailoringChange[] {
  const changes: TailoringChange[] = [];
  if (input.summaryRecommendation && input.summaryRecommendation !== input.current.summary) {
    changes.push({
      id: createId(),
      section: "summary",
      label: "Summary",
      before: input.current.summary ?? "",
      after: input.summaryRecommendation,
      accepted: false
    });
  }
  if (input.skillsToEmphasize.length) {
    const reordered = [
      ...input.skillsToEmphasize.filter((skill) =>
        input.current.skills.some((owned) => owned.toLowerCase() === skill.toLowerCase())
      ),
      ...input.current.skills.filter(
        (skill) => !input.skillsToEmphasize.some((item) => item.toLowerCase() === skill.toLowerCase())
      )
    ];
    if (reordered.join("|") !== input.current.skills.join("|")) {
      changes.push({
        id: createId(),
        section: "skills",
        label: "Skills order",
        before: input.current.skills.join(", "),
        after: reordered.join(", "),
        accepted: false
      });
    }
  }
  if (input.projectsToEmphasize.length) {
    const names = input.projectsToEmphasize.map((name) => name.toLowerCase());
    const reordered = [
      ...input.current.projects.filter((item) => names.includes((item.name ?? "").toLowerCase())),
      ...input.current.projects.filter((item) => !names.includes((item.name ?? "").toLowerCase()))
    ];
    changes.push({
      id: createId(),
      section: "projects",
      label: "Project order",
      before: input.current.projects.map((item) => item.name).filter(Boolean).join(", "),
      after: reordered.map((item) => item.name).filter(Boolean).join(", "),
      accepted: false
    });
  }
  for (const point of input.experiencePointsToEmphasize) {
    changes.push({
      id: createId(),
      section: "experience",
      label: "Experience emphasis",
      before: input.current.experience[0]?.bullets.join("\n") ?? "",
      after: [point, ...(input.current.experience[0]?.bullets ?? [])].join("\n"),
      accepted: false
    });
  }
  return changes;
}

export function applyAcceptedChanges(
  content: ResumeContent,
  changes: TailoringChange[]
): ResumeContent {
  const next: ResumeContent = {
    ...content,
    skills: [...content.skills],
    experience: content.experience.map((item) => ({ ...item, bullets: [...item.bullets] })),
    projects: [...content.projects]
  };
  for (const change of changes) {
    if (!change.accepted) continue;
    if (change.section === "summary") next.summary = change.after;
    if (change.section === "skills") {
      next.skills = change.after.split(",").map((item) => item.trim()).filter(Boolean);
    }
    if (change.section === "projects") {
      const order = change.after.split(",").map((item) => item.trim().toLowerCase());
      next.projects = [
        ...next.projects.filter((item) => order.includes((item.name ?? "").toLowerCase())),
        ...next.projects.filter((item) => !order.includes((item.name ?? "").toLowerCase()))
      ];
    }
    if (change.section === "experience" && next.experience[0]) {
      next.experience[0] = {
        ...next.experience[0],
        bullets: change.after.split("\n").map((item) => item.trim()).filter(Boolean)
      };
    }
  }
  return next;
}
