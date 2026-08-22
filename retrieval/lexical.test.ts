import { describe, expect, it } from "vitest";
import type { CareerKnowledgeItem } from "~types/knowledge";
import { lexicalSearch } from "./lexical";

function item(id: string, title: string, content: string, tags: string[] = []): CareerKnowledgeItem {
  return {
    id,
    type: "experience",
    title,
    content,
    origin: "profile",
    metadata: {
      tags,
      technologies: tags,
      company: "Fluid AI",
      createdAt: "t",
      updatedAt: "t"
    }
  };
}

describe("lexicalSearch", () => {
  const items = [
    item("1", "AI chatbot platform", "Worked on a multi-tenant AI chatbot with React and TypeScript", [
      "react",
      "typescript",
      "ai"
    ]),
    item("2", "Payroll reporting", "Generated monthly finance PDFs", ["excel"]),
    item("3", "Agentic workflow UI", "Built workflow canvases for AI agents", ["react", "ai"])
  ];

  it("ranks AI-related evidence above unrelated payroll work", () => {
    const results = lexicalSearch(items, "Full Stack AI Engineer React TypeScript chatbot");
    expect(results[0]?.item.id).toBe("1");
    expect(results.map((result) => result.item.id)).not.toContain("2");
  });

  it("returns nothing when nothing is relevant", () => {
    expect(lexicalSearch(items, "underwater basket weaving")).toHaveLength(0);
  });

  it("enforces topK", () => {
    const results = lexicalSearch(items, "React AI", { topK: 1, minScore: 0.01 });
    expect(results).toHaveLength(1);
  });
});
