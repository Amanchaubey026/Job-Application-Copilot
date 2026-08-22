import { useEffect, useState } from "react";
import { createOllamaProvider } from "~ai/ollama-provider";
import { TextField } from "./TextField";
import type { AIModel, AiSettings } from "~types/ai";
import { toUserMessage } from "~types/errors";
import { settingsRepository } from "~storage/settings-repository";

type Props = {
  settings: AiSettings;
  onSaved: (settings: AiSettings) => void;
};

export function AiSettingsPanel({ settings, onSaved }: Props) {
  const [url, setUrl] = useState(settings.ollamaUrl);
  const [model, setModel] = useState(settings.model);
  const [embeddingModel, setEmbeddingModel] = useState(settings.embeddingModel);
  const [temperature, setTemperature] = useState(String(settings.temperature));
  const [models, setModels] = useState<AIModel[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUrl(settings.ollamaUrl);
    setModel(settings.model);
    setEmbeddingModel(settings.embeddingModel);
    setTemperature(String(settings.temperature));
  }, [settings]);

  async function testConnection(nextUrl = url, nextModel = model) {
    setBusy(true);
    setError(null);
    setMessage("Checking Ollama…");
    try {
      const provider = createOllamaProvider(nextUrl, settings.timeoutMs);
      const available = await provider.isAvailable();
      setConnected(available);
      if (!available) {
        setModels([]);
        setMessage("Start Ollama to enable AI features. Basic autofill remains available.");
        return;
      }
      const list = await provider.listModels();
      setModels(list);
      if (list.length === 0) {
        setMessage("No Ollama models found. Install a model using Ollama first.");
        return;
      }
      if (nextModel && !list.some((item) => item.name === nextModel)) {
        setModel(list[0]?.name ?? "");
      }
      if (!nextModel && list[0]) {
        setModel(list[0].name);
      }
      setMessage(`Connected. ${list.length} model${list.length === 1 ? "" : "s"} available.`);
    } catch (err) {
      setConnected(false);
      setModels([]);
      setError(toUserMessage(err));
      setMessage(null);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const next: AiSettings = {
        ...settings,
        ollamaUrl: url.trim() || "http://localhost:11434",
        model: model.trim(),
        embeddingModel: embeddingModel.trim(),
        temperature: Number.parseFloat(temperature) || 0.2
      };
      await settingsRepository.saveSettings(next);
      onSaved(next);
      setMessage("Settings saved.");
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div className="card">
        <h2 className="section-title">AI Settings</h2>
        <p className="muted">
          Ollama is optional. If it is offline, deterministic autofill still works.
        </p>
        <TextField label="Ollama URL" value={url} onChange={setUrl} />
        <div className="field">
          <label htmlFor="model">Model</label>
          {models.length ? (
            <select
              id="model"
              value={model}
              onChange={(event) => setModel(event.target.value)}
            >
              <option value="">Select a model</option>
              {models.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="model"
              value={model}
              placeholder="Test connection to load models"
              onChange={(event) => setModel(event.target.value)}
            />
          )}
        </div>
        <div className="field">
          <label htmlFor="embed-model">Embedding model (optional)</label>
          <select
            id="embed-model"
            value={embeddingModel}
            onChange={(event) => setEmbeddingModel(event.target.value)}
          >
            <option value="">Lexical retrieval only</option>
            {models.map((item) => (
              <option key={`e-${item.name}`} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <p className="tiny">If unset, keyword search is used. Semantic search needs a local embedding model such as nomic-embed-text.</p>
        </div>
        <TextField
          label="Temperature"
          value={temperature}
          onChange={setTemperature}
        />
        <div className="status-bar" style={{ marginTop: 8 }}>
          <span className={`dot ${connected ? "dot-on" : "dot-off"}`} />
          {connected ? "Connected" : connected === false ? "Disconnected" : "Unknown"}
        </div>
      </div>
      {message ? <div className="banner banner-success">{message}</div> : null}
      {error ? <div className="banner banner-error">{error}</div> : null}
      <div className="btn-row">
        <button
          className="btn btn-secondary"
          type="button"
          disabled={busy}
          onClick={() => void testConnection()}
        >
          {busy ? "Checking Ollama…" : "Test Connection"}
        </button>
        <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void save()}>
          Save
        </button>
      </div>
    </div>
  );
}
