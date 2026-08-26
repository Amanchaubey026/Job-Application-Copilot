import type { FieldOption } from "~types/form";
import { countryKeys } from "./country";

function norm(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wholePhrase(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  if (haystack === needle) return true;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`).test(haystack);
}

export function matchOption(
  value: string,
  options: FieldOption[]
): FieldOption | undefined {
  const needle = norm(value);
  if (!needle || options.length === 0) return undefined;

  const exactValue = options.find((option) => norm(option.value) === needle);
  if (exactValue) return exactValue;

  const exactLabel = options.find((option) => norm(option.label) === needle);
  if (exactLabel) return exactLabel;

  const aliases = new Set(countryKeys(value));
  const aliasHit = options.find(
    (option) => aliases.has(norm(option.label)) || aliases.has(norm(option.value))
  );
  if (aliasHit) return aliasHit;

  const optionContainsNeedle = options.find((option) => {
    const label = norm(option.label);
    return label.startsWith(`${needle} `) || label.endsWith(` ${needle}`) || wholePhrase(label, needle);
  });
  if (optionContainsNeedle) return optionContainsNeedle;

  if (needle.length >= 4) {
    const needleContainsOption = options.find((option) => {
      const label = norm(option.label);
      return label.length >= 4 && wholePhrase(needle, label);
    });
    if (needleContainsOption) return needleContainsOption;
  }

  return undefined;
}

export function optionsFromSelect(select: HTMLSelectElement): FieldOption[] {
  return Array.from(select.options)
    .map((option) => ({
      value: option.value,
      label: option.text.trim() || option.value
    }))
    .filter((option) => option.label && !/^select/i.test(option.label))
    .slice(0, 400);
}
