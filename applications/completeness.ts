import type { ApplicationCompleteness } from "~types/application";
import type { SerializableFormField } from "~types/form";

export function computeCompleteness(fields: SerializableFormField[]): ApplicationCompleteness {
  const required = fields.filter((field) => field.required && !field.disabled);
  const completedRequired = required.filter((field) => Boolean(field.currentValue?.trim())).length;
  const totalRequired = required.length;
  const missingRequired = Math.max(0, totalRequired - completedRequired);
  return {
    totalRequired,
    completedRequired,
    missingRequired,
    percentage: totalRequired === 0 ? 100 : Math.round((completedRequired / totalRequired) * 100)
  };
}
