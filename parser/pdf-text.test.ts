import { describe, expect, it } from "vitest";
import { reconstructPdfText } from "./pdf-text";

describe("reconstructPdfText", () => {
  it("joins items on the same line by x order and splits different y rows", () => {
    const text = reconstructPdfText([
      { str: "Chaubey", transform: [1, 0, 0, 1, 80, 700], width: 50, height: 11 },
      { str: "Aman", transform: [1, 0, 0, 1, 40, 700], width: 35, height: 11 },
      { str: "aman@example.com", transform: [1, 0, 0, 1, 40, 680], width: 90, height: 11 }
    ]);
    expect(text).toBe("Aman Chaubey\naman@example.com");
  });

  it("separates far-apart items on the same y as contact columns", () => {
    const text = reconstructPdfText([
      { str: "Aman Chaubey", transform: [1, 0, 0, 1, 40, 700], width: 70, height: 11 },
      { str: "aman@example.com", transform: [1, 0, 0, 1, 320, 700], width: 90, height: 11 }
    ]);
    expect(text).toContain("Aman Chaubey");
    expect(text).toContain("aman@example.com");
    expect(text).toMatch(/\|/);
  });
});
