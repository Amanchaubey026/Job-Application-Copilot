import { describe, expect, it } from "vitest";
import { computeCompleteness } from "./completeness";

describe("computeCompleteness", () => {
  it("computes required field completion", () => {
    const result = computeCompleteness([
      { id: "1", elementType: "input", required: true, currentValue: "Aman" },
      { id: "2", elementType: "input", required: true },
      { id: "3", elementType: "input", required: false }
    ]);
    expect(result.totalRequired).toBe(2);
    expect(result.completedRequired).toBe(1);
    expect(result.missingRequired).toBe(1);
    expect(result.percentage).toBe(50);
  });

  it("is 100% when nothing is required", () => {
    expect(computeCompleteness([{ id: "1", elementType: "input" }]).percentage).toBe(100);
  });
});
