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

  it("groups radio questions and reads the wrapping label", () => {
    document.body.innerHTML = `
      <div class="field">
        <label>Are you legally authorized to work in the United States?</label>
        <label><input type="radio" name="auth" value="1"> Yes</label>
        <label><input type="radio" name="auth" value="0"> No</label>
      </div>
    `;
    const fields = detectFormFields(document).map(toSerializable);
    expect(fields).toHaveLength(1);
    expect(fields[0]?.elementType).toBe("radio-group");
    expect(fields[0]?.options?.map((option) => option.label)).toEqual(expect.arrayContaining(["Yes", "No"]));
    expect(fields[0]?.label).toMatch(/authorized to work/i);
  });

  it("treats searchable dropdown inputs as comboboxes", () => {
    document.body.innerHTML = `
      <div class="field">
        <label>Country</label>
        <div class="select__control">
          <input class="select__input" role="combobox" aria-autocomplete="list" />
        </div>
        <select hidden>
          <option value="IN">India</option>
          <option value="US">United States</option>
        </select>
      </div>
    `;
    const fields = detectFormFields(document).map(toSerializable);
    const country = fields.find((field) => field.elementType === "combobox");
    expect(country).toBeTruthy();
    expect(country?.label).toMatch(/country/i);
    expect(country?.options?.some((option) => option.label === "India")).toBe(true);
  });
});
