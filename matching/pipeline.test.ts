import { describe, expect, it, vi } from "vitest";
import type { AIProvider } from "~types/ai";
import type { SerializableFormField } from "~types/form";
import { createEmptyProfile } from "~utils/profile-factory";
import { matchFieldsPhase2 } from "./pipeline";

function field(id: string, label: string): SerializableFormField {
  return { id, elementType: "input", inputType: "text", label };
}

function profile() {
  return createEmptyProfile({
    personal: { firstName: "Aman", lastName: "Chaubey", email: "aman@example.com" },
    experience: [{ id: "1", company: "Fluid AI", title: "Full Stack Developer", description: "React apps" }],
    skills: ["React", "TypeScript"],
    metadata: { createdAt: "t", updatedAt: "t" }
  });
}

function provider(response: unknown): AIProvider {
  return {
    isAvailable: async () => true,
    listModels: async () => [{ name: "test" }],
    generateStructured: vi.fn(async () => response) as AIProvider["generateStructured"]
  };
}

describe("matchFieldsPhase2", () => {
  it("keeps deterministic matches for email and does not call AI", async () => {
    const ai = provider({ intent: "x", profileSources: ["skills"], confidence: 0.99 });
    const results = await matchFieldsPhase2({
      fields: [field("email", "Email Address")],
      profile: profile(),
      provider: ai,
      settings: {
        id: "default",
        ollamaUrl: "http://localhost:11434",
        model: "test",
        embeddingModel: "",
        temperature: 0.2,
        timeoutMs: 1000
      },
      aiEnabled: true
    });
    expect(results[0]?.match?.profilePath).toBe("personal.email");
    expect(results[0]?.match?.source).toBe("deterministic");
    expect(vi.mocked(ai.generateStructured)).not.toHaveBeenCalled();
  });

  it("calls AI for an ambiguous field", async () => {
    const ai = provider({
      intent: "professional_background",
      profileSources: ["experience", "skills"],
      confidence: 0.94
    });
    const results = await matchFieldsPhase2({
      fields: [field("bg", "Professional Background")],
      profile: profile(),
      provider: ai,
      settings: {
        id: "default",
        ollamaUrl: "http://localhost:11434",
        model: "test",
        embeddingModel: "",
        temperature: 0.2,
        timeoutMs: 1000
      },
      aiEnabled: true
    });
    expect(vi.mocked(ai.generateStructured)).toHaveBeenCalled();
    expect(results[0]?.match?.source).toBe("ai");
    expect(results[0]?.match?.profileSources).toEqual(["experience", "skills"]);
  });

  it("rejects invalid AI profile sources", async () => {
    const ai = provider({
      intent: "hack",
      profileSources: ["__proto__", "constructor"],
      confidence: 0.99
    });
    const results = await matchFieldsPhase2({
      fields: [field("bg", "Professional Background")],
      profile: profile(),
      provider: ai,
      settings: {
        id: "default",
        ollamaUrl: "http://localhost:11434",
        model: "test",
        embeddingModel: "",
        temperature: 0.2,
        timeoutMs: 1000
      },
      aiEnabled: true
    });
    expect(results[0]?.match?.source).not.toBe("ai");
  });

  it("does not send country comboboxes to AI", async () => {
    const ai = provider({ intent: "skills", profileSources: ["skills"], confidence: 0.99 });
    const results = await matchFieldsPhase2({
      fields: [
        {
          id: "country",
          elementType: "combobox",
          label: "Country",
          options: [{ value: "IN", label: "India" }]
        }
      ],
      profile: profile(),
      provider: ai,
      settings: {
        id: "default",
        ollamaUrl: "http://localhost:11434",
        model: "test",
        embeddingModel: "",
        temperature: 0.2,
        timeoutMs: 1000
      },
      aiEnabled: true
    });
    expect(vi.mocked(ai.generateStructured)).not.toHaveBeenCalled();
    expect(results[0]?.match?.profilePath).toBe("personal.address.country");
  });

  it("leaves unknown fields unmatched when AI is disabled", async () => {
    const results = await matchFieldsPhase2({
      fields: [field("color", "Favorite Color")],
      profile: profile(),
      aiEnabled: false
    });
    expect(results[0]?.match).toBeNull();
  });
});
