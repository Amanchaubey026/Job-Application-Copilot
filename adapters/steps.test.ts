/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { detectApplicationSteps } from "./steps";

describe("detectApplicationSteps", () => {
  it("parses step N of M text", () => {
    document.body.innerHTML = `<div>Step 2 of 5 — Education</div>`;
    const steps = detectApplicationSteps(document);
    expect(steps).toHaveLength(5);
    expect(steps[1]?.status).toBe("current");
    expect(steps[0]?.status).toBe("completed");
  });
});
