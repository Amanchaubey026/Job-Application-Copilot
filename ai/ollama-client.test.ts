import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "~types/errors";
import { OllamaClient } from "./ollama-client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("OllamaClient", () => {
  it("reports available when /api/tags succeeds", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    const client = new OllamaClient("http://localhost:11434", 1000);
    expect(await client.ping()).toBe(true);
  });

  it("reports unavailable on connection failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    const client = new OllamaClient("http://localhost:11434", 1000);
    expect(await client.ping()).toBe(false);
  });

  it("lists models from /api/tags", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [{ name: "qwen3:8b", size: 12, modified_at: "2026-01-01" }]
      })
    }) as unknown as typeof fetch;
    const client = new OllamaClient("http://localhost:11434", 1000);
    const models = await client.listModels();
    expect(models[0]?.name).toBe("qwen3:8b");
  });

  it("returns an empty list when no models are installed", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] })
    }) as unknown as typeof fetch;
    const client = new OllamaClient("http://localhost:11434", 1000);
    expect(await client.listModels()).toEqual([]);
  });

  it("times out generate requests", async () => {
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            reject(error);
          });
        })
    ) as unknown as typeof fetch;
    const client = new OllamaClient("http://localhost:11434", 20);
    await expect(
      client.generate({ model: "x", prompt: "hi" })
    ).rejects.toMatchObject({ code: "AI_TIMEOUT" });
  });

  it("rejects invalid JSON generate payloads", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("bad json");
      }
    }) as unknown as typeof fetch;
    const client = new OllamaClient("http://localhost:11434", 1000);
    await expect(client.generate({ model: "x", prompt: "hi" })).rejects.toBeInstanceOf(AppError);
  });

  it("rejects empty generate responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: "   " })
    }) as unknown as typeof fetch;
    const client = new OllamaClient("http://localhost:11434", 1000);
    await expect(client.generate({ model: "x", prompt: "hi" })).rejects.toMatchObject({
      code: "AI_INVALID"
    });
  });
});
