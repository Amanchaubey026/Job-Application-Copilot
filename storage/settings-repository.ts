import {
  DEFAULT_AI_TIMEOUT_MS,
  DEFAULT_OLLAMA_URL,
  DEFAULT_TEMPERATURE,
  type AiSettings
} from "~types/ai";
import { SETTINGS_STORE, withStore } from "./db";

export const DEFAULT_SETTINGS_ID = "default";

export function defaultAiSettings(): AiSettings {
  return {
    id: DEFAULT_SETTINGS_ID,
    ollamaUrl: DEFAULT_OLLAMA_URL,
    model: "",
    temperature: DEFAULT_TEMPERATURE,
    timeoutMs: DEFAULT_AI_TIMEOUT_MS
  };
}

export const settingsRepository = {
  async getSettings(): Promise<AiSettings> {
    const stored = await withStore(
      SETTINGS_STORE,
      "readonly",
      (store) => store.get(DEFAULT_SETTINGS_ID) as IDBRequest<AiSettings | undefined>
    );
    return stored ? { ...defaultAiSettings(), ...stored } : defaultAiSettings();
  },

  async saveSettings(settings: AiSettings): Promise<void> {
    const toSave: AiSettings = {
      ...defaultAiSettings(),
      ...settings,
      id: DEFAULT_SETTINGS_ID,
      ollamaUrl: settings.ollamaUrl.replace(/\/+$/, ""),
      temperature: Math.min(1, Math.max(0, settings.temperature))
    };
    await withStore(SETTINGS_STORE, "readwrite", (store) => store.put(toSave));
  }
};
