import { describe, expect, it } from "vitest";
import { normalizeLinkedInUrl } from "./links";

describe("normalizeLinkedInUrl", () => {
  it("rebuilds a clean profile URL from a phone-prefixed host", () => {
    expect(normalizeLinkedInUrl("https://03310linkedin.com/in/amanchaubeyin")).toBe(
      "https://www.linkedin.com/in/amanchaubeyin"
    );
  });

  it("accepts a bare slug URL", () => {
    expect(normalizeLinkedInUrl("linkedin.com/in/amanchaubey")).toBe(
      "https://www.linkedin.com/in/amanchaubey"
    );
  });

  it("rejects strings with no LinkedIn slug", () => {
    expect(normalizeLinkedInUrl("https://example.com")).toBeUndefined();
  });
});
