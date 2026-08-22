/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import { detectFormFields, toSerializable } from "./form-detector";

describe("form detector", () => {
  it("reads label, name, placeholder, and autocomplete", () => {
    document.body.innerHTML = `
      <label for="email">Email Address</label>
      <input id="email" name="candidate_email" placeholder="you@example.com" autocomplete="email">
    `;
    const fields = detectFormFields(document).map(toSerializable);
    expect(fields).toHaveLength(1);
    expect(fields[0]?.label).toBe("Email Address");
    expect(fields[0]?.name).toBe("candidate_email");
    expect(fields[0]?.placeholder).toBe("you@example.com");
    expect(fields[0]?.autocomplete).toBe("email");
    expect(fields[0]?.elementType).toBe("input");
  });

  it("skips passwords, hidden fields, and submit buttons", () => {
    document.body.innerHTML = `
      <input type="text" name="first_name">
      <input type="password" name="password">
      <input type="hidden" name="csrf">
      <input type="submit" value="Submit">
    `;
    const fields = detectFormFields(document);
    expect(fields).toHaveLength(1);
    expect(fields[0]?.name).toBe("first_name");
  });
});
