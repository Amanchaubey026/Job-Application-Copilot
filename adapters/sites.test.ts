import { describe, expect, it } from "vitest";
import { genericAdapter } from "./generic";
import { greenhouseAdapter, pickAdapter, zohoAdapter } from "./sites";

describe("site adapters", () => {
  it("matches greenhouse hosts", () => {
    expect(
      greenhouseAdapter.matches({
        title: "Apply",
        url: "https://boards.greenhouse.io/example/jobs/1",
        hostname: "boards.greenhouse.io",
        looksLikeJobApplication: true,
        signals: ["application"]
      })
    ).toBe(true);
  });

  it("matches Zoho Recruit hosts", () => {
    expect(
      zohoAdapter.matches({
        title: "Frontend Developer",
        url: "https://techcarrot.zohorecruit.com/jobs/Careers/1",
        hostname: "techcarrot.zohorecruit.com",
        looksLikeJobApplication: true,
        signals: ["application"]
      })
    ).toBe(true);
  });

  it("falls back to generic", () => {
    const adapter = pickAdapter({
      title: "Careers",
      url: "https://example.com/jobs/1",
      hostname: "example.com",
      looksLikeJobApplication: true,
      signals: ["job"]
    });
    expect(adapter.id).toBe(genericAdapter.id);
  });
});
