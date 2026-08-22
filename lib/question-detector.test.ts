import { describe, expect, it } from "vitest";
import type { SerializableFormField } from "~types/form";
import { detectApplicationQuestions } from "./question-detector";

function field(
  id: string,
  label: string,
  elementType: "input" | "textarea" = "textarea"
): SerializableFormField {
  return { id, elementType, label };
}

describe("detectApplicationQuestions", () => {
  it("detects narrative questions and ignores address fields", () => {
    const questions = detectApplicationQuestions([
      field("why", "Why are you interested in this role?"),
      field("city", "City", "input"),
      field("zip", "Postal Code", "input"),
      field("bg", "Professional Background"),
      field("proj", "Describe a project you are proud of")
    ]);
    const labels = questions.map((item) => item.question);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Why are you interested in this role?",
        "Professional Background",
        "Describe a project you are proud of"
      ])
    );
    expect(labels.join(" ")).not.toMatch(/City|Postal/);
  });
});
