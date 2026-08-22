import type { SerializableFormField } from "~types/form";
import type { ApplicationQuestion } from "~types/job";
import { normalizeText } from "~utils/normalize";

const QUESTION_PHRASES = [
  "why do you want",
  "why are you interested",
  "why this role",
  "why this company",
  "why should we hire",
  "tell us about yourself",
  "tell me about yourself",
  "describe your",
  "describe a",
  "walk us through",
  "what makes you",
  "what interests you",
  "cover letter",
  "additional information",
  "anything else",
  "motivation",
  "professional background",
  "relevant experience",
  "project you are proud",
  "project you're proud",
  "proud of",
  "good fit",
  "about you"
];

const NOT_QUESTION = [
  "address",
  "city",
  "state",
  "postal",
  "zip",
  "country",
  "email",
  "phone",
  "first name",
  "last name",
  "linkedin",
  "github",
  "password",
  "salary",
  "compensation",
  "start date",
  "availability"
];

function blobOf(field: SerializableFormField): string {
  return normalizeText(
    [field.label, field.placeholder, field.name, field.ariaLabel, field.nearbyText, field.helperText]
      .filter(Boolean)
      .join(" ")
  );
}

function looksLikeQuestion(field: SerializableFormField): boolean {
  if (field.elementType === "select") return false;
  const blob = blobOf(field);
  if (!blob) return false;
  if (NOT_QUESTION.some((phrase) => blob === phrase || blob.startsWith(`${phrase} `))) {
    return false;
  }
  if (QUESTION_PHRASES.some((phrase) => blob.includes(phrase))) return true;
  if (field.elementType === "textarea" && (blob.includes("why") || blob.includes("describe") || blob.includes("tell us") || blob.endsWith("?"))) {
    return true;
  }
  if ((field.maxLength ?? 0) >= 200 && (blob.includes("comment") || blob.includes("message") || blob.includes("statement"))) {
    return true;
  }
  return Boolean(field.label?.includes("?"));
}

export function detectApplicationQuestions(
  fields: SerializableFormField[]
): ApplicationQuestion[] {
  return fields.filter(looksLikeQuestion).map((field) => ({
    id: field.id,
    fieldId: field.id,
    elementId: field.elementId ?? "",
    question:
      field.label ||
      field.placeholder ||
      field.ariaLabel ||
      field.nearbyText ||
      field.name ||
      "Application question",
    fieldType: field.elementType === "textarea" ? "textarea" : "input",
    required: field.required,
    maxLength: field.maxLength,
    currentValue: field.currentValue
  }));
}

export function isQuestionField(
  field: SerializableFormField,
  questions: ApplicationQuestion[]
): boolean {
  return questions.some((question) => question.fieldId === field.id);
}
