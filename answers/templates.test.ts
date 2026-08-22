import { describe, expect, it } from "vitest";
import { resolveTemplate } from "./templates";

describe("resolveTemplate", () => {
  it("fills known placeholders and reports missing ones", () => {
    const result = resolveTemplate("I want to join {{company}} as {{role}} on {{project}}.", {
      company: "Example AI",
      role: "Engineer"
    });
    expect(result.text).toMatch(/Example AI/);
    expect(result.unresolved).toContain("project");
  });
});
