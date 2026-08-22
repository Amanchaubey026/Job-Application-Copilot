import type { EmbeddingProvider } from "~types/knowledge";
import { AppError } from "~types/errors";
import { assertHttpUrl } from "./ollama-client";

async function fetchJson(
  url: string,
  body: unknown,
  timeoutMs: number
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!response.ok) {
      throw new AppError("AI_UNAVAILABLE");
    }
    return await response.json();
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

function vectorFromUnknown(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (typeof value[0] === "number") return value as number[];
  if (Array.isArray(value[0]) && typeof value[0][0] === "number") {
    return value[0] as number[];
  }
  return null;
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly timeoutMs = 20_000
  ) {
    assertHttpUrl(baseUrl);
  }

  async embed(text: string): Promise<number[]> {
    const root = this.baseUrl.replace(/\/+$/, "");
    try {
      const modern = await fetchJson(
        `${root}/api/embed`,
        { model: this.model, input: text },
        this.timeoutMs
      );
      const embeddings =
        modern && typeof modern === "object" && "embeddings" in modern
          ? vectorFromUnknown((modern as { embeddings: unknown }).embeddings)
          : null;
      if (embeddings) return embeddings;
    } catch {
      // Fall back to the legacy endpoint.
    }

    const legacy = await fetchJson(
      `${root}/api/embeddings`,
      { model: this.model, prompt: text },
      this.timeoutMs
    );
    const embedding =
      legacy && typeof legacy === "object" && "embedding" in legacy
        ? vectorFromUnknown((legacy as { embedding: unknown }).embedding)
        : null;
    if (!embedding) {
      throw new AppError("AI_INVALID", "Embedding model returned no vector.");
    }
    return embedding;
  }
}
