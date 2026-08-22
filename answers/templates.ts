export function resolveTemplate(
  text: string,
  vars: { company?: string; role?: string; project?: string }
): { text: string; unresolved: string[] } {
  const unresolved: string[] = [];
  const next = text.replace(/\{\{(company|role|project)\}\}/g, (_all, key: string) => {
    const value = vars[key as keyof typeof vars];
    if (!value) {
      unresolved.push(key);
      return "";
    }
    return value;
  });
  return { text: next.replace(/\s{2,}/g, " ").trim(), unresolved };
}
