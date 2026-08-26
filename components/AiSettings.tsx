import { useEffect, useState } from "react";
import { tryCreateOllamaProvider } from "~ai/ollama-provider";
import { TextField } from "./TextField";
import type { AIModel, AiSettings } from "~types/ai";
import { toUserMessage } from "~types/errors";
import { settingsRepository } from "~storage/settings-repository";

type Props = {
  settings: AiSettings;
  cacheCount?: number;
  onSaved: (settings: AiSettings) => void;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
  onClearCache?: () => void;
  onDeleteAll?: () => void;
};

export function AiSettingsPanel({
  settings,
  cacheCount = 0,
  onSaved,
  onExportBackup,
  onImportBackup,
  onClearCache,
  onDeleteAll
}: Props) {
  const [url, setUrl] = useState(settings.ollamaUrl);
  const [model, setModel] = useState(settings.model);
  const [embeddingModel, setEmbeddingModel] = useState(settings.embeddingModel);
  const [temperature, setTemperature] = useState(String(settings.temperature));
  const [models, setModels] = useState<AIModel[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setUrl(settings.ollamaUrl);
    setModel(settings.model);
    setEmbeddingModel(settings.embeddingModel);
    setTemperature(String(settings.temperature));
  }, [settings]);

  useEffect(() => {
    void testConnection(settings.ollamaUrl, settings.model);
    // Probe Ollama once so the default "any local model" option can list what is installed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function testConnection(nextUrl = url, nextModel = model) {
    setBusy(true);
    setError(null);
    setMessage("Checking Ollama…");
    try {
      const provider = tryCreateOllamaProvider(nextUrl, settings.timeoutMs);
      if (!provider) {
        setConnected(false);
        setModels([]);
        setError("Ollama URL is invalid.");
        setMessage(null);
        return;
      }
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
        setModel("");
      }
      setMessage(
        `Connected. ${list.length} local model${list.length === 1 ? "" : "s"} available. Copilot uses one automatically unless you pick a specific model.`
      );
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
          Uses any local Ollama model by default. You only need a model installed
          (<code>ollama pull qwen3:8b</code>). Pick a specific one here if you want to override.
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
              <option value="">Any local model (default)</option>
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
              placeholder="Any local model (default)"
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
      <button className="btn btn-ghost" type="button" onClick={() => setAdvanced((value) => !value)}>
        {advanced ? "Hide advanced" : "Advanced"}
      </button>
      {advanced ? (
        <div className="card">
          <p className="tiny">Max context and style are stored locally and sent only to your Ollama server.</p>
        </div>
      ) : null}
      <div className="card">
        <h2 className="section-title">Privacy</h2>
        <p>Storage: local only</p>
        <p>AI: Ollama on this computer</p>
        <p>Cloud sync: disabled</p>
        <p>Telemetry: disabled</p>
        <p>External APIs: none</p>
      </div>
      <div className="card">
        <h2 className="section-title">Backup</h2>
        <div className="btn-row">
          <button className="btn btn-secondary" type="button" onClick={onExportBackup}>
            Export Backup
          </button>
          <label className="btn btn-secondary">
            Import Backup
            <input
              className="file-input"
              type="file"
              accept="application/json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImportBackup?.(file);
              }}
            />
          </label>
        </div>
        <p className="tiny">Import merges local data. Conflicts keep existing records unless you choose otherwise in a follow-up prompt.</p>
      </div>
      <div className="card">
        <h2 className="section-title">AI Cache</h2>
        <p className="muted">{cacheCount} cached responses</p>
        <button className="btn btn-secondary" type="button" onClick={onClearCache}>
          Clear AI Cache
        </button>
      </div>
      <div className="card">
        <h2 className="section-title">Delete all local data</h2>
        {confirmDelete ? (
          <div>
            <p className="muted">This permanently deletes profile, knowledge, resumes, applications, answers, and cache.</p>
            <div className="btn-row">
              <button className="btn btn-secondary" type="button" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" type="button" onClick={onDeleteAll}>
                Delete Everything
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-danger" type="button" onClick={() => setConfirmDelete(true)}>
            Delete All Local Data
          </button>
        )}
      </div>
    </div>
  );
}
