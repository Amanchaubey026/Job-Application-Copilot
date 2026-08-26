import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlasmoCSConfig, PlasmoGetStyle, PlasmoMountShadowHost } from "plasmo";
import { pickAdapter } from "~adapters/sites";
import { fillFields } from "~lib/form-filler";
import { detectFormFields, toSerializable } from "~lib/form-detector";
import { extractJobDescription } from "~lib/job-extractor";
import { getPageContext } from "~lib/page-context";
import { detectApplicationQuestions } from "~lib/question-detector";
import { clearHighlight, highlightField } from "~lib/field-highlight";
import { expandRepeatableSections } from "~lib/repeatable-sections";
import { createId } from "~utils/id";
import type { CopilotAskItem, CopilotPlan, CopilotTurn } from "~types/copilot";
import type { JobContext } from "~types/job";
import type { SerializableFormField } from "~types/form";
import type {
  CopilotPlanResponse,
  CopilotQuestionResponse,
  ExtensionMessage,
  GetProfileResponse
} from "~types/messages";

export const config: PlasmoCSConfig = {
  matches: ["http://*/*", "https://*/*"],
  run_at: "document_idle"
};

export const getShadowHostId = () => "jac-copilot-host";

export const mountShadowHost: PlasmoMountShadowHost = ({ shadowHost }) => {
  if (shadowHost instanceof HTMLElement) {
    shadowHost.style.cssText =
      "position:fixed;inset:0;z-index:2147483647;pointer-events:none;width:100vw;height:100vh;";
  }
  document.documentElement.appendChild(shadowHost);
};

const CSS = `
:host { all: initial; }
.plasmo-csui-container {
  position: fixed !important;
  inset: 0 !important;
  display: block !important;
  width: 100% !important;
  height: 100% !important;
  pointer-events: none !important;
}
* { box-sizing: border-box; font-family: "Segoe UI", system-ui, -apple-system, sans-serif; }
.wrap { pointer-events: none; }
.launcher, .drawer { pointer-events: auto; }
.launcher {
  position: fixed; top: 28%; right: 0; z-index: 1;
  writing-mode: vertical-rl; transform: rotate(180deg);
  background: #0f766e; color: #fff; border: 0; border-radius: 8px 0 0 8px;
  padding: 14px 8px; font-weight: 700; font-size: 12px; letter-spacing: 0.04em;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18); cursor: pointer;
}
.launcher:hover { background: #0d9488; }
.drawer {
  position: fixed; top: 0; right: 0; height: 100vh; width: min(400px, 100vw);
  background: #f6f7f5; color: #171717; display: flex; flex-direction: column;
  box-shadow: -16px 0 40px rgba(15, 23, 42, 0.16); border-left: 1px solid #e4e4e4;
}
.header { padding: 14px 16px 12px; background: #fff; border-bottom: 1px solid #e4e4e4; }
.header h1 { margin: 0; font-size: 15px; font-weight: 650; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.status { margin: 6px 0 0; font-size: 12px; color: #5c5c5c; display: flex; align-items: center; gap: 6px; }
.dot { width: 8px; height: 8px; border-radius: 99px; background: #d4d4d4; }
.dot.on { background: #15803d; }
.dot.busy { background: #ca8a04; }
.close { border: 0; background: transparent; color: #5c5c5c; font-size: 18px; cursor: pointer; padding: 4px 6px; }
.progress { padding: 8px 16px; font-size: 12px; color: #5c5c5c; background: #fff; border-bottom: 1px solid #e4e4e4; }
.chat { flex: 1; overflow: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.bubble { max-width: 100%; padding: 10px 12px; border-radius: 12px; font-size: 13px; line-height: 1.45; }
.bubble.copilot { background: #fff; border: 1px solid #e4e4e4; }
.bubble.you { background: #ccfbf1; align-self: flex-end; }
.bubble strong { display: block; margin-bottom: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #5c5c5c; }
.why { margin-top: 6px; color: #5c5c5c; font-size: 12px; }
.prompt { background: #fff; border-top: 1px solid #e4e4e4; padding: 12px 16px 16px; }
.choices { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 8px; }
.chip, .btn { border: 1px solid #d4d4d4; background: #fff; border-radius: 8px; padding: 7px 10px; font-size: 12px; font-weight: 650; cursor: pointer; }
.chip:hover, .btn:hover { border-color: #0f766e; color: #0f766e; }
.chip.suggested { border-color: #0f766e; background: #ccfbf1; }
.input {
  width: 100%; padding: 8px 10px; border: 1px solid #d4d4d4; border-radius: 8px;
  font: inherit; font-size: 13px; margin-bottom: 8px;
}
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn.primary { background: #0f766e; color: #fff; border-color: #0f766e; }
.btn.primary:disabled { opacity: 0.6; cursor: default; }
.tiny { font-size: 11px; color: #5c5c5c; margin: 0 0 8px; }
`;

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style");
  style.textContent = CSS;
  return style;
};

type ChatMessage = { id: string; role: "copilot" | "you"; text: string };

function snapshot() {
  const page = getPageContext(document);
  const adapter = pickAdapter(page);
  const fields =
    adapter.detectFields?.(page, document) ?? detectFormFields(document).map(toSerializable);
  const questions = detectApplicationQuestions(fields);
  const job = adapter.detectJob(page, document) ?? extractJobDescription(document);
  return { page, fields, questions, job };
}

async function sendRuntime<T>(message: ExtensionMessage): Promise<T> {
  return chrome.runtime.sendMessage(message);
}

export default function CopilotDrawer() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready when you are.");
  const [ollamaReady, setOllamaReady] = useState(false);
  const [model, setModel] = useState("");
  const [ollamaStatus, setOllamaStatus] = useState("Checking Ollama…");
  const [plan, setPlan] = useState<CopilotPlan | null>(null);
  const [askIndex, setAskIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [turn, setTurn] = useState<CopilotTurn | null>(null);
  const [turnBusy, setTurnBusy] = useState(false);
  const [showLauncher, setShowLauncher] = useState(false);
  const fieldsRef = useRef<SerializableFormField[]>([]);
  const jobRef = useRef<JobContext | null>(null);
  const runId = useRef(0);
  const askedRef = useRef<string | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const currentAsk: CopilotAskItem | null = plan?.ask[askIndex] ?? null;

  const push = useCallback((role: ChatMessage["role"], text: string) => {
    setMessages((current) => [...current, { id: createId(), role, text }]);
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, currentAsk, turn]);

  useEffect(() => {
    const page = getPageContext(document);
    setShowLauncher(page.looksLikeJobApplication || detectFormFields(document).length > 0);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    clearHighlight();
  }, []);

  const applyAnswer = useCallback(
    async (value: string, source: string) => {
      if (!currentAsk) return;
      const trimmed = value.trim();
      if (!trimmed) return;
      setBusy(true);
      try {
        const results = await fillFields([{ fieldId: currentAsk.fieldId, value: trimmed }]);
        const ok = results[0]?.ok;
        push("you", trimmed);
        push(
          "copilot",
          ok
            ? `Filled ${currentAsk.label} (${source}).`
            : `I could not place that into ${currentAsk.label}. You may need to pick it on the page.`
        );
        const nextIndex = askIndex + 1;
        setAskIndex(nextIndex);
        setDraft("");
        setTurn(null);
        if (!plan || nextIndex >= plan.ask.length) {
          highlightField(null);
          push(
            "copilot",
            "That's everything I needed you for. Review the form before submitting — I never submit the application."
          );
        }
      } finally {
        setBusy(false);
      }
    },
    [askIndex, currentAsk, plan, push]
  );

  const loadTurn = useCallback(
    async (ask: CopilotAskItem, job: JobContext | null, token: number) => {
      const field = fieldsRef.current.find((item) => item.id === ask.fieldId);
      if (!field) return;
      setTurnBusy(true);
      setTurn(null);
      try {
        const response = await sendRuntime<CopilotQuestionResponse>({
          type: "COPILOT_QUESTION",
          field,
          job,
          suggested: ask.suggested
        });
        if (token !== runId.current || !response.ok) return;
        setOllamaReady(response.ollamaReady);
        setModel(response.model);
        setTurn(response.turn);
      } catch {
        if (token !== runId.current) return;
      } finally {
        if (token === runId.current) setTurnBusy(false);
      }
    },
    []
  );

  const start = useCallback(async () => {
    const token = runId.current + 1;
    runId.current = token;
    setOpen(true);
    setBusy(true);
    setPlan(null);
    setAskIndex(0);
    setTurn(null);
    setDraft("");
    setMessages([]);
    askedRef.current = null;
    setStatus("Scanning this application…");
    try {
      const profileRes = await sendRuntime<GetProfileResponse>({ type: "GET_PROFILE" });
      if (profileRes.ok && profileRes.profile) {
        const opened = expandRepeatableSections(profileRes.profile);
        if (opened.length) {
          push("copilot", `Opened extra rows for ${Array.from(new Set(opened)).join(", ")} from your profile.`);
          await new Promise((resolve) => setTimeout(resolve, 450));
        }
      }
      const snap = snapshot();
      fieldsRef.current = snap.fields;
      jobRef.current = snap.job;
      if (snap.fields.length === 0) {
        setStatus("No form fields found on this page.");
        push("copilot", "I don't see a job application form on this page. Open the apply form, then try Run again.");
        return;
      }
      setStatus("Matching your profile and talking to Ollama…");
      const response = await sendRuntime<CopilotPlanResponse>({
        type: "COPILOT_PLAN",
        fields: snap.fields,
        questions: snap.questions,
        job: snap.job
      });
      if (token !== runId.current) return;
      if (!response.ok) {
        setStatus(response.error);
        push("copilot", response.error);
        return;
      }
      setOllamaReady(response.ollamaReady);
      setModel(response.model);
      setOllamaStatus(response.ollamaStatus);
      setPlan(response.plan);
      if (response.plan.autofill.length) {
        setStatus(`Filling ${response.plan.autofill.length} high-confidence field${response.plan.autofill.length === 1 ? "" : "s"}…`);
        await fillFields(
          response.plan.autofill.map((item) => ({ fieldId: item.fieldId, value: item.value }))
        );
        if (token !== runId.current) return;
        const names = response.plan.autofill.map((item) => item.label).join(", ");
        push(
          "copilot",
          `I filled ${response.plan.autofill.length} field${response.plan.autofill.length === 1 ? "" : "s"} from ${response.profileName}: ${names}. I did not submit the application.`
        );
      } else {
        push("copilot", `Using ${response.profileName}. Nothing was safe to fill automatically.`);
      }
      if (response.plan.skipped.length) {
        const preview = response.plan.skipped
          .slice(0, 6)
          .map((item) => item.label)
          .join(", ");
        push("copilot", `Left as-is: ${preview}${response.plan.skipped.length > 6 ? "…" : ""}.`);
      }
      if (response.plan.ask.length === 0) {
        push("copilot", "No remaining questions need you. Review the page, then submit yourself if it looks right.");
        setStatus(response.ollamaStatus);
        return;
      }
      const ollamaLine = response.ollamaReady
        ? `Ollama (${response.model || "local model"}) will ask you about the rest.`
        : `${response.ollamaStatus} I will still ask you about remaining fields.`;
      push("copilot", `${response.plan.ask.length} field${response.plan.ask.length === 1 ? "" : "s"} need your involvement. ${ollamaLine}`);
      setStatus(response.ollamaStatus);
    } catch (error) {
      push("copilot", error instanceof Error ? error.message : "Could not start copilot.");
    } finally {
      if (token === runId.current) setBusy(false);
    }
  }, [push]);

  useEffect(() => {
    const listener = (message: ExtensionMessage, _sender: chrome.runtime.MessageSender, sendResponse: (value: unknown) => void) => {
      if (message?.type === "OPEN_COPILOT") {
        void start();
        sendResponse({ ok: true });
        return true;
      }
      if (message?.type === "CLOSE_COPILOT") {
        close();
        sendResponse({ ok: true });
        return true;
      }
      return undefined;
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [start, close]);

  useEffect(() => {
    if (!open || !currentAsk) {
      if (!currentAsk) clearHighlight();
      return;
    }
    if (askedRef.current === currentAsk.fieldId) return;
    askedRef.current = currentAsk.fieldId;
    highlightField(currentAsk.fieldId);
    push(
      "copilot",
      currentAsk.why
        ? `${currentAsk.question}\n\n${currentAsk.why}`
        : currentAsk.question
    );
    if (currentAsk.suggested) setDraft(currentAsk.suggested);
    void loadTurn(currentAsk, jobRef.current, runId.current);
    // Only when the ask index changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentAsk?.fieldId]);

  const choices = useMemo(() => {
    const fromTurn = turn?.choices ?? [];
    const fromField = (currentAsk?.options ?? []).map((option) => option.label);
    const merged = [...fromTurn, ...fromField].filter(Boolean);
    return Array.from(new Set(merged)).slice(0, 16);
  }, [turn, currentAsk]);

  const ollamaLabel = ollamaStatus || (ollamaReady ? `Ollama connected${model ? ` · ${model}` : ""}` : "Ollama not connected");

  if (!open) {
    if (!showLauncher) return null;
    return (
      <div className="wrap">
        <button className="launcher" type="button" onClick={() => void start()}>
          Copilot
        </button>
      </div>
    );
  }

  return (
    <div className="wrap">
      <aside className="drawer" role="dialog" aria-label="Job application copilot">
        <header className="header">
          <div className="row">
            <h1>Application copilot</h1>
            <button className="close" type="button" onClick={close} aria-label="Close copilot">
              ×
            </button>
          </div>
          <p className="status">
            <span className={`dot ${busy || turnBusy ? "busy" : ollamaReady ? "on" : ""}`} />
            {busy ? status : turnBusy ? "Ollama is writing a question…" : ollamaLabel}
          </p>
        </header>
        {plan ? (
          <div className="progress">
            Filled {plan.autofill.length} · {plan.ask.length} need you
            {currentAsk ? ` · now: ${currentAsk.label}` : ""}
          </div>
        ) : null}
        <div className="chat" ref={chatRef}>
          {messages.map((item) => (
            <div className={`bubble ${item.role}`} key={item.id}>
              <strong>{item.role === "copilot" ? "Copilot" : "You"}</strong>
              {item.text}
            </div>
          ))}
        </div>
        {currentAsk ? (
          <form
            className="prompt"
            onSubmit={(event) => {
              event.preventDefault();
              void applyAnswer(draft, "your answer");
            }}
          >
            {turn?.question ? (
              <p className="tiny">
                <strong>Ollama:</strong> {turn.question}
                {turn.why ? ` ${turn.why}` : ""}
              </p>
            ) : (
              <p className="tiny">
                {turnBusy
                  ? "Ollama is looking at this field. You can answer now or wait for a suggestion."
                  : "Type an answer, or pick a choice if you see one."}
              </p>
            )}
            {choices.length ? (
              <div className="choices">
                {choices.map((choice) => (
                  <button
                    className={`chip${turn?.suggestion === choice ? " suggested" : ""}`}
                    type="button"
                    key={choice}
                    onClick={() => void applyAnswer(choice, ollamaReady ? "your choice" : "your choice")}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            ) : null}
            {turn?.suggestion ? (
              <button
                className="chip suggested"
                type="button"
                onClick={() => void applyAnswer(turn.suggestion, "Ollama suggestion")}
              >
                Use Ollama suggestion: {turn.suggestion.slice(0, 80)}
              </button>
            ) : null}
            {currentAsk.inputKind === "longtext" ? (
              <textarea
                className="input"
                rows={4}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={currentAsk.label}
              />
            ) : currentAsk.inputKind === "yesno" && choices.length === 0 ? (
              <div className="choices">
                {["Yes", "No"].map((choice) => (
                  <button className="chip" type="button" key={choice} onClick={() => void applyAnswer(choice, "your choice")}>
                    {choice}
                  </button>
                ))}
              </div>
            ) : (
              <input
                className="input"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={currentAsk.label}
              />
            )}
            <div className="actions">
              <button className="btn primary" type="submit" disabled={busy || !draft.trim()}>
                Fill this field
              </button>
              <button
                className="btn"
                type="button"
                disabled={busy}
                onClick={() => {
                  push("you", "Skip");
                  const nextIndex = askIndex + 1;
                  setAskIndex(nextIndex);
                  setDraft("");
                  setTurn(null);
                  if (!plan || nextIndex >= plan.ask.length) {
                    highlightField(null);
                    push(
                      "copilot",
                      "That's everything I needed you for. Review the form before submitting — I never submit the application."
                    );
                  }
                }}
              >
                Skip
              </button>
            </div>
          </form>
        ) : (
          <div className="prompt">
            <div className="actions">
              <button className="btn primary" type="button" disabled={busy} onClick={() => void start()}>
                {busy ? "Working…" : "Run again"}
              </button>
              <button className="btn" type="button" onClick={close}>
                Close
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
