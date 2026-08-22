import { AppError } from "~types/errors";
import type {
  AIModel,
  AIProvider,
  StructuredGenerationRequest
} from "~types/ai";
import { extractJsonValue } from "./json";
import { logAiError } from "./logger";
import { OllamaClient } from "./ollama-client";

export class OllamaProvider implements AIProvider {
  constructor(private readonly client: OllamaClient) {}

  async isAvailable(): Promise<boolean> {
    return this.client.ping();
  }

  async listModels(): Promise<AIModel[]> {
    try {
      return await this.client.listModels();
    } catch (error) {
      logAiError("listModels", error);
      if (error instanceof AppError) throw error;
      throw new AppError("AI_UNAVAILABLE");
    }
  }

  async generateStructured<T>(request: StructuredGenerationRequest): Promise<T> {
    if (!request.model.trim()) {
      throw new AppError("AI_NO_MODEL");
    }

    const result = await this.client.generate({
      model: request.model,
      prompt: request.userPrompt,
      system: request.systemPrompt,
      temperature: request.temperature,
      format: "json"
    });

    try {
      return extractJsonValue(result.response) as T;
    } catch (error) {
      logAiError("parse", error);
      throw new AppError("AI_INVALID");
    }
  }
}

export function createOllamaProvider(
  baseUrl: string,
  timeoutMs: number
): OllamaProvider {
  return new OllamaProvider(new OllamaClient(baseUrl, timeoutMs));
}
