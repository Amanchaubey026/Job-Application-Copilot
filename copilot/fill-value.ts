import { findCountry, inferCountryName } from "~lib/country";
import { normalizeGitHubUrl, normalizeLinkedInUrl } from "~lib/links";
import { matchOption } from "~lib/select-option";
import { isSkillWidget } from "~lib/skill-field";
import { fieldBlob, isCountryField, isHumanRequiredField } from "~matching/human-required";
import type { SerializableFormField } from "~types/form";
import type { FieldMatch } from "~types/matching";
import type { UserProfile } from "~types/profile";

function looksLikeSkillsDump(value: string): boolean {
  const parts = value.split(/,|\n/).map((part) => part.trim()).filter(Boolean);
  return parts.length >= 3 && value.length > 40;
}

export function inferredCountryName(profile: UserProfile): string | undefined {
  return inferCountryName({
    country: profile.personal.address?.country,
    location: profile.personal.location,
    city: profile.personal.address?.city,
    state: profile.personal.address?.state,
    phone: profile.personal.phone
  });
}

export function isPlausibleValue(field: SerializableFormField, value: string, match?: FieldMatch | null): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (field.maxLength && trimmed.length > field.maxLength) return false;

  const blob = fieldBlob(field).toLowerCase();
  if (isCountryField(field)) {
    if (looksLikeSkillsDump(trimmed)) return false;
    if (match?.profilePath === "skills") return false;
    return Boolean(findCountry(trimmed) || matchOption(trimmed, field.options ?? []));
  }
  if (blob.includes("linkedin")) {
    return Boolean(normalizeLinkedInUrl(trimmed));
  }
  if (blob.includes("github")) {
    return Boolean(normalizeGitHubUrl(trimmed));
  }
  if ((field.inputType ?? "").toLowerCase() === "email" || blob.includes("email")) {
    return trimmed.includes("@");
  }
  if ((field.inputType ?? "").toLowerCase() === "tel" || /\bphone|mobile|telephone\b/.test(blob)) {
    return /\d{6,}/.test(trimmed.replace(/\D/g, ""));
  }
  if (isHumanRequiredField(field) && match?.profilePath === "skills") return false;
  if (isSkillWidget(field) || match?.profilePath === "skills") return true;
  if (
    (field.elementType === "select" || field.elementType === "combobox" || field.elementType === "radio-group") &&
    looksLikeSkillsDump(trimmed)
  ) {
    return false;
  }
  return true;
}

export function resolveFillValue(
  field: SerializableFormField,
  match: FieldMatch | null,
  profile: UserProfile
): string | null {
  if (isHumanRequiredField(field)) return null;

  let value = match?.value.trim() ?? "";
  const blob = fieldBlob(field).toLowerCase();

  if (isCountryField(field) || match?.profilePath === "personal.address.country") {
    value = inferredCountryName(profile) || value;
  }

  if (match?.profilePath === "links.linkedin" || blob.includes("linkedin")) {
    value = normalizeLinkedInUrl(value) ?? "";
  }
  if (match?.profilePath === "links.github" || blob.includes("github")) {
    value = normalizeGitHubUrl(value) ?? "";
  }

  if (!value || !isPlausibleValue(field, value, match)) return null;

  if (field.options?.length && !isSkillWidget(field) && match?.profilePath !== "skills") {
    const option = matchOption(value, field.options);
    if (!option) return null;
    return option.label || option.value;
  }

  return value;
}
