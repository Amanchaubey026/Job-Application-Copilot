import type { SerializableFormField } from "~types/form";
import type { CopilotInputKind } from "~types/copilot";
import { normalizeText } from "~utils/normalize";

const HUMAN_REQUIRED_RE =
  /\b(salary|compensation|pay|wage|ctc|expect(?:ed)?\s*(?:ctc|salary|pay)|authorized to work|work authorization|legally authorized|sponsorship|visa|citizen(?:ship)?|gender|sex|race|ethnicity|veteran|disability|hispanic|lgbt|pronoun|sexual orientation|date of birth|dob|ssn|social security|willing to relocate|start date|notice period|current ctc|expected ctc|desired salary)\b/i;

const YES_NO_RE =
  /\b(yes|no|true|false|authorized|sponsorship|legally|willing|require)\b/i;

function blobOf(field: SerializableFormField): string {
  return [
    field.label,
    field.placeholder,
    field.name,
    field.ariaLabel,
    field.nearbyText,
    field.helperText
  ]
    .filter(Boolean)
    .join(" ");
}

export function fieldBlob(field: SerializableFormField): string {
  return blobOf(field);
}

export function isHumanRequiredField(field: SerializableFormField): boolean {
  return HUMAN_REQUIRED_RE.test(blobOf(field));
}

export function isCountryField(field: SerializableFormField): boolean {
  const blob = normalizeText(blobOf(field));
  if (!blob) return false;
  if (/\bcountry\b/.test(blob) && !/\bcountry code\b/.test(blob)) return true;
  if (field.autocomplete === "country" || field.autocomplete === "country-name") return true;
  return false;
}

export function isYesNoField(field: SerializableFormField): boolean {
  const options = field.options ?? [];
  if (options.length > 0 && options.length <= 4) {
    const labels = options.map((option) => normalizeText(option.label));
    const yes = labels.some((label) => label === "yes" || label === "true" || label === "1");
    const no = labels.some((label) => label === "no" || label === "false" || label === "0");
    if (yes && no) return true;
  }
  const blob = blobOf(field);
  return field.elementType !== "textarea" && YES_NO_RE.test(blob) && blob.includes("?");
}

export function inputKindFor(field: SerializableFormField): CopilotInputKind {
  if (field.elementType === "textarea") return "longtext";
  if (isYesNoField(field)) return "yesno";
  if ((field.options?.length ?? 0) > 0) return "choice";
  if (field.elementType === "select" || field.elementType === "combobox" || field.elementType === "radio-group") {
    return "choice";
  }
  return "text";
}

export function fieldDisplayLabel(field: SerializableFormField): string {
  const raw =
    field.label ||
    field.ariaLabel ||
    field.placeholder ||
    field.nearbyText ||
    field.name ||
    field.elementId ||
    "This field";
  return raw.replace(/\s+\*$/, "").replace(/\s+/g, " ").trim();
}
