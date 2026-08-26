import { tryCreateOllamaProvider } from "./ollama-provider";
import type { AIModel, AiSettings } from "~types/ai";

export interface OllamaConnection {
  ready: boolean;
  reachable: boolean;
  model: string;
  status: string;
  url: string;
}

const EMBEDDING_RE =
  /embed|minilm|bge-|e5-|mxbai|arctic-embed|nomic-embed|gte-|jina-embed/i;
const CHAT_HINT_RE =
  /qwen|llama|mistral|gemma|phi|deepseek|mixtral|yi|vicuna|dolphin|hermes|command|gpt-oss|granite|olmo|smollm|tinyllama|orca|wizard|openchat|zephyr|solar|nous|grok|kimi|minimax|chat/i;

export function isEmbeddingModel(name: string): boolean {
  return EMBEDDING_RE.test(name);
}

export function pickDefaultLocalModel(models: AIModel[], preferred?: string): string {
  const names = models.map((item) => item.name).filter(Boolean);
  if (preferred && names.includes(preferred) && !isEmbeddingModel(preferred)) {
    return preferred;
  }
  const chat = names.filter((name) => !isEmbeddingModel(name));
  const pool = chat.length ? chat : names;
  const hinted = pool.find((name) => CHAT_HINT_RE.test(name));
  return hinted ?? pool[0] ?? "";
}

function alternateLoopback(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
      return parsed.toString().replace(/\/$/, "");
    }
    if (parsed.hostname === "127.0.0.1") {
      parsed.hostname = "localhost";
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {
    return null;
  }
  return null;
}

export async function resolveOllamaConnection(settings: AiSettings): Promise<OllamaConnection> {
  const candidates = [settings.ollamaUrl.replace(/\/+$/, "")];
  const alt = alternateLoopback(candidates[0] ?? "");
  if (alt && !candidates.includes(alt)) candidates.push(alt);

  for (const url of candidates) {
    const provider = tryCreateOllamaProvider(url, settings.timeoutMs);
    if (!provider) continue;
    try {
      const reachable = await provider.isAvailable();
      if (!reachable) continue;
      const models = await provider.listModels();
      if (models.length === 0) {
        return {
          ready: false,
          reachable: true,
          model: "",
          status: `Ollama is running at ${url}, but no models are installed. Run ollama pull <model>.`,
          url
        };
      }
      const selected = pickDefaultLocalModel(models, settings.model);
      return {
        ready: Boolean(selected),
        reachable: true,
        model: selected,
        status: selected
          ? settings.model && selected === settings.model
            ? `Ollama connected · ${selected}`
            : `Using local model ${selected}`
          : `Ollama is running at ${url}`,
        url
      };
    } catch {
      continue;
    }
  }

  return {
    ready: false,
    reachable: false,
    model: settings.model,
    status: `Can't reach Ollama at ${settings.ollamaUrl}. Start it with ollama serve, then click Run again.`,
    url: settings.ollamaUrl
  };
}
