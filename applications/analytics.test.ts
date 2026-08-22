import { describe, expect, it } from "vitest";
import { computeAnalytics } from "./analytics";

describe("computeAnalytics", () => {
  it("handles an empty dataset", () => {
    const stats = computeAnalytics([]);
    expect(stats.total).toBe(0);
    expect(stats.interviewRate).toBe(0);
  });

  it("computes interview rate from historical statuses", () => {
    const stats = computeAnalytics([
      {
        id: "1",
        job: { url: "http://a", confidence: 1 },
        status: "applied",
        createdAt: "t",
        updatedAt: "t",
        match: { score: 0.85, matchedRequirements: [], unmatchedRequirements: [], evidence: [], summary: "" }
      },
      {
        id: "2",
        job: { url: "http://b", confidence: 1 },
        status: "interview",
        createdAt: "t",
        updatedAt: "t",
        match: { score: 0.95, matchedRequirements: [], unmatchedRequirements: [], evidence: [], summary: "" }
      }
    ]);
    expect(stats.total).toBe(2);
    expect(stats.interviews).toBe(1);
    expect(stats.matchBuckets.find((item) => item.label === "90–100%")?.interviews).toBe(1);
  });
});
