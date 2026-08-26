import type { SerializableFormField } from "~types/form";

export function isSkillWidget(field: SerializableFormField): boolean {
  const blob = [
    field.label,
    field.placeholder,
    field.name,
    field.ariaLabel,
    field.nearbyText
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /\b(skill set|skillset|skills|search and add skills)\b/.test(blob);
}

export function skillTokens(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2)
    .slice(0, 16);
}
