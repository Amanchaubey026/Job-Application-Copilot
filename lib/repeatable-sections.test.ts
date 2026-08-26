/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "~utils/profile-factory";
import { expandRepeatableSections } from "./repeatable-sections";

describe("expandRepeatableSections", () => {
  it("clicks Add next to education and experience headings", () => {
    document.body.innerHTML = `
      <section>
        <h3>Educational Details</h3>
        <button type="button">+ Add</button>
      </section>
      <section>
        <h3>Experience Details</h3>
        <a href="#">Add</a>
      </section>
    `;
    const clicks: string[] = [];
    document.querySelectorAll("button, a").forEach((node) => {
      node.addEventListener("click", (event) => {
        event.preventDefault();
        clicks.push(node.textContent?.trim() ?? "");
      });
    });
    const profile = createEmptyProfile({
      education: [{ id: "e1", institution: "IIT" }],
      experience: [
        { id: "x1", company: "Fluid AI" },
        { id: "x2", company: "Acme" }
      ]
    });
    const opened = expandRepeatableSections(profile);
    expect(opened).toEqual(expect.arrayContaining(["education", "experience"]));
    expect(clicks.length).toBeGreaterThanOrEqual(2);
  });
});
