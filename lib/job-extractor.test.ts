/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { extractJobDescription } from "./job-extractor";

describe("extractJobDescription", () => {
  it("reads JSON-LD job postings", () => {
    document.body.innerHTML = `
      <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "title": "Full Stack Developer",
          "hiringOrganization": { "name": "Example AI" },
          "jobLocationType": "TELECOMMUTE",
          "description": "Build React and TypeScript applications."
        }
      </script>
      <h1>Full Stack Developer</h1>
    `;
    Object.defineProperty(document, "URL", { value: "http://localhost/jobs/1", configurable: true });
    const job = extractJobDescription(document);
    expect(job.title).toBe("Full Stack Developer");
    expect(job.company).toBe("Example AI");
    expect(job.description).toMatch(/React/);
    expect(job.confidence).toBeGreaterThan(0.8);
  });

  it("falls back to headings and article text", () => {
    document.body.innerHTML = `
      <h1>Platform Engineer</h1>
      <article class="job-description">
        <p>We are hiring a platform engineer to own internal developer tooling and job application workflows. You will write TypeScript every day.</p>
      </article>
    `;
    Object.defineProperty(document, "URL", { value: "http://localhost/jobs/2", configurable: true });
    const job = extractJobDescription(document);
    expect(job.title).toBe("Platform Engineer");
    expect(job.description).toMatch(/TypeScript/);
  });
});
