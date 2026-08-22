import { describe, expect, it } from "vitest";
import { findSimilarAnswers } from "./similar-answers";

describe("findSimilarAnswers", () => {
  it("finds a previous similar question", () => {
    const hits = findSimilarAnswers(
      "Why are you interested in this role?",
      [
        {
          id: "a1",
          job: { url: "http://localhost", title: "Dev", company: "Example AI", confidence: 0.8 },
          status: "applied",
          createdAt: "t",
          updatedAt: "t",
          answers: [
            {
              id: "x",
              question: "Why are you interested in this role?",
              answer: "I want to build AI products.",
              sourceIds: [],
              createdAt: "t",
              updatedAt: "t"
            }
          ]
        }
      ]
    );
    expect(hits[0]?.answer).toMatch(/AI products/);
  });
});
