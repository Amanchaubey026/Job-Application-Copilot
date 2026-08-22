import { AppError } from "~types/errors";

export function extractJsonValue(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new AppError("AI_INVALID", "AI returned an empty response.");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const startObject = trimmed.indexOf("{");
    const startArray = trimmed.indexOf("[");
    const start =
      startObject === -1
        ? startArray
        : startArray === -1
          ? startObject
          : Math.min(startObject, startArray);
    const endChar = start !== -1 && trimmed[start] === "[" ? "]" : "}";
    const end = trimmed.lastIndexOf(endChar);
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        throw new AppError("AI_INVALID");
      }
    }
    throw new AppError("AI_INVALID");
  }
}
