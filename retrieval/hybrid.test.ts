import { describe, expect, it } from "vitest";
import type { CareerKnowledgeItem } from "~types/knowledge";
import { HybridCareerRetriever } from "./hybrid";

function item(id: string, title: string, content: string): CareerKnowledgeItem {
  return {
    id,
    type: "project",
    title,
    content,
    origin: "manual",
    metadata: { createdAt: "t", updatedAt: "t", tags: [title], technologies: [] }
  };
}

describe("HybridCareerRetriever without embeddings", () => {
  it("falls back to keyword search", async () => {
    const retriever = new HybridCareerRetriever([
      item("a", "React dashboard", "Customer dashboard in React"),
      item("b", "Kitchen remodel", "Tiled a backsplash")
    ]);
    const results = await retriever.search("React dashboard experience");
    expect(results[0]?.item.id).toBe("a");
    expect(results[0]?.retrievalMethod).toBe("keyword");
  });
});
