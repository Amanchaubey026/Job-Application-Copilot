import { describe, expect, it } from "vitest";
import type { SerializableFormField } from "~types/form";
import { isCountryField, isHumanRequiredField, inputKindFor } from "./human-required";

function field(overrides: Partial<SerializableFormField>): SerializableFormField {
  return { id: "f", elementType: "input", ...overrides };
}

describe("human-required fields", () => {
  it("flags salary and work authorization for human involvement", () => {
    expect(isHumanRequiredField(field({ label: "Desired Salary" }))).toBe(true);
    expect(
      isHumanRequiredField(field({ label: "Are you legally authorized to work in the United States?" }))
    ).toBe(true);
    expect(
      isHumanRequiredField(
        field({ label: "Will you now or in the future require sponsorship for employment?" })
      )
    ).toBe(true);
    expect(isHumanRequiredField(field({ label: "Email" }))).toBe(false);
  });

  it("recognizes country fields and yes/no choices", () => {
    expect(isCountryField(field({ label: "Country" }))).toBe(true);
    expect(
      inputKindFor(
        field({
          label: "Authorized?",
          options: [
            { value: "1", label: "Yes" },
            { value: "0", label: "No" }
          ]
        })
      )
    ).toBe("yesno");
  });
});
