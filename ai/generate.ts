import { AppError } from "~types/errors";
import type { AIProvider, StructuredGenerationRequest } from "~types/ai";
import { logAiError } from "./logger";

export async function generateValidated<T>(
  provider: AIProvider,
  request: StructuredGenerationRequest,
  parse: (value: unknown) => T
): Promise<T> {
  const raw = await provider.generateStructured<unknown>(request);
  try {
    return parse(raw);
  } catch (error) {
    logAiError("validate", error);
    throw new AppError("AI_INVALID");
  }
}
