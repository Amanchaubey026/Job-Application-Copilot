import { describe, expect, it } from "vitest";
import type { CareerKnowledgeItem } from "~types/knowledge";
import { matchRequirements } from "./match-requirements";

describe("matchRequirements", () => {
  const items: CareerKnowledgeItem[] = [
    {
      id: "1",
      type: "skill",
      title: "React",
      content: "React",
      origin: "profile",
      metadata: { technologies: ["React"], tags: ["react"], createdAt: "t", updatedAt: "t" }
    },
    {
      id: "2",
      type: "skill",
      title: "TypeScript",
      content: "TypeScript",
      origin: "profile",
      metadata: { technologies: ["TypeScript"], tags: ["typescript"], createdAt: "t", updatedAt: "t" }
    }
  ];

  it("separates found requirements from those not in the profile", () => {
    const match = matchRequirements(
      [
        { name: "React", category: "technical", importance: "required" },
        { name: "TypeScript", category: "technical", importance: "required" },
        { name: "AWS", category: "technical", importance: "preferred" }
      ],
      items
    );
    expect(match.matchedRequirements.map((item) => item.requirement.name)).toEqual(
      expect.arrayContaining(["React", "TypeScript"])
    );
    expect(match.unmatchedRequirements.map((item) => item.name)).toEqual(["AWS"]);
    expect(match.score).toBeGreaterThan(0.5);
  });
});
