import type { CareerKnowledgeItem, KnowledgeType } from "~types/knowledge";
import type { UserProfile } from "~types/profile";
import { createId } from "~utils/id";
import { uniqueStrings } from "~utils/normalize";

const TECH_RE =
  /\b(react|next\.?js|node\.?js|typescript|javascript|python|java|go|rust|mongodb|postgres(?:ql)?|mysql|redis|docker|kubernetes|aws|gcp|azure|graphql|rest|html|css|tailwind|express|nestjs|vue|angular|svelte|openai|ollama|llm)\b/gi;

const METRIC_RE =
  /\b(\d+\s*%|\d+\s*x|increased|reduced|improved|decreased|cut|grew|saved|faster|latency|throughput)\b/i;

function nowIso(): string {
  return new Date().toISOString();
}

function item(
  type: KnowledgeType,
  title: string,
  content: string,
  extra: Partial<CareerKnowledgeItem> = {}
): CareerKnowledgeItem {
  const stamp = nowIso();
  return {
    id: extra.id ?? createId(),
    type,
    title: title.trim() || type,
    content: content.trim(),
    origin: extra.origin ?? "profile",
    profileRef: extra.profileRef,
    metadata: {
      createdAt: extra.metadata?.createdAt ?? stamp,
      updatedAt: stamp,
      ...extra.metadata
    }
  };
}

function technologiesIn(text: string): string[] {
  return uniqueStrings(Array.from(text.matchAll(TECH_RE), (match) => match[0]));
}

function splitBullets(text?: string): string[] {
  if (!text) return [];
  return text
    .split(/\n+|•|;/)
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 12);
}

export function extractKnowledgeFromProfile(profile: UserProfile): CareerKnowledgeItem[] {
  const items: CareerKnowledgeItem[] = [];

  for (const exp of profile.experience) {
    const title = [exp.title, exp.company].filter(Boolean).join(" at ") || "Experience";
    const content = [exp.title, exp.company, exp.description].filter(Boolean).join(". ");
    const techs = uniqueStrings([
      ...technologiesIn(content),
      ...(profile.skills.filter((skill) => content.toLowerCase().includes(skill.toLowerCase())))
    ]);
    items.push(
      item("experience", title, content || title, {
        profileRef: `experience:${exp.id}`,
        metadata: {
          company: exp.company,
          role: exp.title,
          technologies: techs,
          dates: { start: exp.startDate, end: exp.endDate },
          tags: uniqueStrings([exp.title, exp.company, ...techs]),
          source: `experience:${exp.id}`,
          createdAt: nowIso(),
          updatedAt: nowIso()
        }
      })
    );

    for (const bullet of splitBullets(exp.description)) {
      const type: KnowledgeType = METRIC_RE.test(bullet) ? "metric" : "responsibility";
      items.push(
        item(type, bullet.slice(0, 80), bullet, {
          profileRef: `experience:${exp.id}`,
          metadata: {
            company: exp.company,
            role: exp.title,
            technologies: technologiesIn(bullet),
            tags: uniqueStrings([exp.company, exp.title, ...technologiesIn(bullet)]),
            source: `experience:${exp.id}`,
            createdAt: nowIso(),
            updatedAt: nowIso()
          }
        })
      );
    }
  }

  for (const project of profile.projects) {
    const content = [project.name, project.description].filter(Boolean).join(". ");
    const techs = uniqueStrings([...(project.technologies ?? []), ...technologiesIn(content)]);
    items.push(
      item("project", project.name || "Project", content || project.name || "Project", {
        profileRef: `project:${project.id}`,
        metadata: {
          project: project.name,
          technologies: techs,
          tags: uniqueStrings([project.name, ...techs]),
          source: `project:${project.id}`,
          createdAt: nowIso(),
          updatedAt: nowIso()
        }
      })
    );
  }

  for (const skill of profile.skills) {
    items.push(
      item("skill", skill, skill, {
        profileRef: `skill:${skill.toLowerCase()}`,
        metadata: {
          technologies: [skill],
          tags: [skill],
          source: `skill:${skill.toLowerCase()}`,
          createdAt: nowIso(),
          updatedAt: nowIso()
        }
      })
    );
    items.push(
      item("technology", skill, `Experience with ${skill}`, {
        profileRef: `skill:${skill.toLowerCase()}`,
        metadata: {
          technologies: [skill],
          tags: [skill],
          source: `skill:${skill.toLowerCase()}`,
          createdAt: nowIso(),
          updatedAt: nowIso()
        }
      })
    );
  }

  for (const edu of profile.education) {
    const title = [edu.degree, edu.field, edu.institution].filter(Boolean).join(" · ") || "Education";
    items.push(
      item("education", title, title, {
        profileRef: `education:${edu.id}`,
        metadata: {
          institution: edu.institution,
          dates: { start: edu.startDate, end: edu.endDate },
          tags: uniqueStrings([edu.degree, edu.field, edu.institution]),
          source: `education:${edu.id}`,
          createdAt: nowIso(),
          updatedAt: nowIso()
        }
      })
    );
  }

  for (const cert of profile.certifications ?? []) {
    items.push(
      item("certification", cert.name || "Certification", [cert.name, cert.issuer].filter(Boolean).join(" — "), {
        profileRef: `certification:${cert.id}`,
        metadata: {
          tags: uniqueStrings([cert.name, cert.issuer]),
          source: `certification:${cert.id}`,
          createdAt: nowIso(),
          updatedAt: nowIso()
        }
      })
    );
  }

  for (const achievement of profile.achievements ?? []) {
    items.push(
      item("achievement", achievement.slice(0, 80), achievement, {
        profileRef: "achievements",
        metadata: {
          tags: technologiesIn(achievement),
          source: "achievements",
          createdAt: nowIso(),
          updatedAt: nowIso()
        }
      })
    );
  }

  return items.filter((entry) => entry.title && entry.content);
}
