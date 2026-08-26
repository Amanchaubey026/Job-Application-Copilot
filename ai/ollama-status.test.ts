import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultAiSettings } from "~storage/settings-repository";
import { pickDefaultLocalModel, resolveOllamaConnection } from "./ollama-status";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("pickDefaultLocalModel", () => {
  it("uses any installed chat model and skips embeddings", () => {
    expect(
      pickDefaultLocalModel(
        [{ name: "nomic-embed-text" }, { name: "qwen3:8b" }, { name: "llama3.2" }],
        ""
      )
    ).toBe("qwen3:8b");
  });

  it("keeps an explicit chat model when it is still installed", () => {
    expect(
      pickDefaultLocalModel([{ name: "qwen3:8b" }, { name: "llama3.2" }], "llama3.2")
    ).toBe("llama3.2");
  });
});

describe("resolveOllamaConnection", () => {
  it("picks the first model when none is saved", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: "qwen3:8b" }] })
    }) as unknown as typeof fetch;
    const settings = { ...defaultAiSettings(), model: "" };
    const result = await resolveOllamaConnection(settings);
    expect(result.ready).toBe(true);
    expect(result.model).toBe("qwen3:8b");
    expect(result.status).toMatch(/Using local model qwen3:8b/i);
  });

  it("explains when Ollama is unreachable", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch;
    const result = await resolveOllamaConnection(defaultAiSettings());
    expect(result.ready).toBe(false);
    expect(result.status).toMatch(/Can't reach Ollama/i);
  });
});
