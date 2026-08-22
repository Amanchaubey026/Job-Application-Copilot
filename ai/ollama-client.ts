import { AppError } from "~types/errors";
import type { AIModel } from "~types/ai";

export interface OllamaGenerateParams {
  model: string;
  prompt: string;
  system?: string;
  temperature?: number;
  format?: "json" | Record<string, unknown>;
}

export interface OllamaGenerateResult {
  response: string;
  model: string;
}

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function assertHttpUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError("AI_UNAVAILABLE", "Ollama URL is invalid.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AppError("AI_UNAVAILABLE", "Ollama URL must be http or https.");
  }
  return parsed;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new AppError("AI_TIMEOUT");
    }
    if (error instanceof AppError) throw error;
    throw new AppError("AI_UNAVAILABLE");
  } finally {
    clearTimeout(timer);
  }
}

export class OllamaClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number
  ) {
    assertHttpUrl(baseUrl);
  }

  private url(path: string): string {
    return `${normalizeBaseUrl(this.baseUrl)}${path}`;
  }

  async ping(): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(
        this.url("/api/tags"),
        { method: "GET" },
        Math.min(this.timeoutMs, 5000)
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<AIModel[]> {
    let response: Response;
    try {
      response = await fetchWithTimeout(
        this.url("/api/tags"),
        { method: "GET" },
        Math.min(this.timeoutMs, 8000)
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("AI_UNAVAILABLE");
    }

    if (!response.ok) {
      throw new AppError("AI_UNAVAILABLE");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AppError("AI_INVALID", "Ollama returned a malformed model list.");
    }

    if (!payload || typeof payload !== "object" || !("models" in payload)) {
      throw new AppError("AI_INVALID", "Ollama returned a malformed model list.");
    }

    const models = (payload as { models?: unknown }).models;
    if (!Array.isArray(models)) return [];

    return models.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as { name?: unknown; model?: unknown; size?: unknown; modified_at?: unknown };
      const name =
        typeof record.name === "string"
          ? record.name
          : typeof record.model === "string"
            ? record.model
            : "";
      if (!name) return [];
      return [
        {
          name,
          size: typeof record.size === "number" ? record.size : undefined,
          modifiedAt: typeof record.modified_at === "string" ? record.modified_at : undefined
        }
      ];
    });
  }

  async generate(params: OllamaGenerateParams): Promise<OllamaGenerateResult> {
    let response: Response;
    try {
      response = await fetchWithTimeout(
        this.url("/api/generate"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: params.model,
            prompt: params.prompt,
            system: params.system,
            stream: false,
            format: params.format ?? "json",
            options: {
              temperature: params.temperature ?? 0.2
            }
          })
        },
        this.timeoutMs
      );
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("AI_UNAVAILABLE");
    }

    if (response.status === 404) {
      throw new AppError("AI_MODEL_UNAVAILABLE");
    }
    if (!response.ok) {
      throw new AppError("AI_UNAVAILABLE");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AppError("AI_INVALID");
    }

    const text =
      payload && typeof payload === "object" && "response" in payload
        ? (payload as { response?: unknown }).response
        : undefined;
    if (typeof text !== "string" || !text.trim()) {
      throw new AppError("AI_INVALID", "AI returned an empty response.");
    }

    return {
      response: text,
      model: params.model
    };
  }
}
