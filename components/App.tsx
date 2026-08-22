import { useCallback, useEffect, useMemo, useState } from "react";
import { createOllamaProvider } from "~ai/ollama-provider";
import { analyzeJobWithAi, generateAnswerWithAi } from "~ai/services";
import { fillActiveTab, scanActiveTab } from "~lib/extension-client";
import { jobIdentity } from "~lib/job-extractor";
import { matchFieldsPhase2 } from "~matching/pipeline";
import { parseResumeFile } from "~parser";
import { profileRepository } from "~storage/profile-repository";
import { settingsRepository } from "~storage/settings-repository";
import { aiCacheRepository } from "~storage/ai-cache-repository";
import { toUserMessage } from "~types/errors";
import type {
  AnswerLength,
  AnswerTone,
  AiSettings,
  GeneratedAnswer,
  JobAnalysis
} from "~types/ai";
import type { MatchedField } from "~types/matching";
import type { PageContext } from "~types/form";
import type { ApplicationQuestion, JobContext } from "~types/job";
import type { ExtractionSummary, UserProfile } from "~types/profile";
import { AiSettingsPanel } from "./AiSettings";
import { ErrorBanner } from "./ErrorBanner";
import { FillPanel } from "./FillPanel";
import { JobPanel } from "./JobPanel";
import { ParseSummary } from "./ParseSummary";
import { ProfileEditor } from "./ProfileEditor";
import { UploadResume } from "./UploadResume";

type Tab = "apply" | "job" | "profile" | "settings";
type Phase = "loading" | "ready";

type QuestionState = {
  answer: GeneratedAnswer | null;
  draft: string;
  error: string | null;
};

export function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [tab, setTab] = useState<Tab>("apply");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<ExtractionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<MatchedField[]>([]);
  const [page, setPage] = useState<PageContext | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [filling, setFilling] = useState(false);
  const [fillMessage, setFillMessage] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [ollamaReady, setOllamaReady] = useState(false);
  const [job, setJob] = useState<JobContext | null>(null);
  const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [questionState, setQuestionState] = useState<Record<string, QuestionState>>({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [jobKey, setJobKey] = useState<string>("");

  const provider = useMemo(() => {
    if (!settings) return undefined;
    return createOllamaProvider(settings.ollamaUrl, settings.timeoutMs);
  }, [settings]);

  const loadProfile = useCallback(async () => {
    const [stored, storedSettings] = await Promise.all([
      profileRepository.getProfile(),
      settingsRepository.getSettings()
    ]);
    setProfile(stored);
    setSettings(storedSettings);
    if (storedSettings.model) {
      try {
        const ready = await createOllamaProvider(
          storedSettings.ollamaUrl,
          storedSettings.timeoutMs
        ).isAvailable();
        setOllamaReady(ready);
      } catch {
        setOllamaReady(false);
      }
    }
    setPhase("ready");
    setTab(stored ? "apply" : "profile");
  }, []);

  useEffect(() => {
    void loadProfile().catch((err) => {
      setError(toUserMessage(err));
      setPhase("ready");
    });
  }, [loadProfile]);

  const refreshScan = useCallback(
    async (currentProfile: UserProfile | null, useAi: boolean) => {
      if (!currentProfile) {
        setScanError("No profile found. Upload your resume first.");
        setMatches([]);
        return;
      }
      setBusy(true);
      setScanError(null);
      setFillMessage(null);
      try {
        const response = await scanActiveTab();
        if (!response.ok) {
          setMatches([]);
          setPage(null);
          setJob(null);
          setQuestions([]);
          setScanError(response.error);
          return;
        }
        setPage(response.page);
        setJob(response.job);
        setQuestions(response.questions);
        const identity = jobIdentity(response.job);
        if (identity !== jobKey) {
          setAnalysis(null);
          setQuestionState({});
          setJobKey(identity);
        }
        if (response.fields.length === 0) {
          setMatches([]);
          setScanError("No recognizable form fields found on this page.");
        } else if (useAi && ollamaReady && settings && provider) {
          setClassifying(true);
          const next = await matchFieldsPhase2({
            fields: response.fields,
            profile: currentProfile,
            questions: response.questions,
            provider,
            settings,
            aiEnabled: true
          });
          setMatches(next);
        } else {
          const next = await matchFieldsPhase2({
            fields: response.fields,
            profile: currentProfile,
            questions: response.questions,
            aiEnabled: false
          });
          setMatches(next);
        }
      } catch (err) {
        setMatches([]);
        setPage(null);
        setScanError(toUserMessage(err));
      } finally {
        setClassifying(false);
        setBusy(false);
      }
    },
    [jobKey, ollamaReady, provider, settings]
  );

  useEffect(() => {
    if (phase === "ready" && profile && (tab === "apply" || tab === "job")) {
      void refreshScan(profile, tab === "apply");
    }
    // Initial scan only when the tab or profile first becomes ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, profile?.id, tab]);

  useEffect(() => {
    const listener = (message: {
      type?: string;
      fields?: MatchedField["field"][];
      page?: PageContext;
      job?: JobContext;
      questions?: ApplicationQuestion[];
    }) => {
      if (message?.type !== "FORM_FIELDS_CHANGED" || !profile || !message.fields) return;
      setPage(message.page ?? null);
      if (message.job) setJob(message.job);
      if (message.questions) setQuestions(message.questions);
      if (message.job) {
        const identity = jobIdentity(message.job);
        if (identity !== jobKey) {
          setAnalysis(null);
          setQuestionState({});
          setJobKey(identity);
        }
      }
      void matchFieldsPhase2({
        fields: message.fields,
        profile,
        questions: message.questions,
        aiEnabled: false
      }).then(setMatches);
      setScanError(null);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [profile, jobKey]);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const result = await parseResumeFile(file);
      await profileRepository.saveProfile(result.profile);
      await aiCacheRepository.clear().catch(() => undefined);
      setProfile(result.profile);
      setSummary(result.summary);
      setReplacing(false);
      setTab("profile");
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(next: UserProfile) {
    setBusy(true);
    setError(null);
    try {
      await profileRepository.saveProfile(next);
      await aiCacheRepository.clear().catch(() => undefined);
      setProfile(next);
      setAnalysis(null);
      setQuestionState({});
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await profileRepository.deleteProfile();
      await aiCacheRepository.clear().catch(() => undefined);
      setProfile(null);
      setSummary(null);
      setMatches([]);
      setReplacing(false);
      setTab("profile");
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleFill(fieldIds: string[]) {
    if (!profile) return;
    setFilling(true);
    setFillMessage(null);
    setError(null);
    try {
      const fields = matches
        .filter((item) => fieldIds.includes(item.field.id) && item.match?.value.trim())
        .map((item) => ({
          fieldId: item.field.id,
          value: item.match?.value ?? ""
        }));
      const response = await fillActiveTab(fields);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      const filled = response.results.filter((result) => result.ok).length;
      const failed = response.results.filter((result) => !result.ok).length;
      setFillMessage(
        failed
          ? `Filled ${filled} field${filled === 1 ? "" : "s"}. ${failed} could not be filled.`
          : `Filled ${filled} field${filled === 1 ? "" : "s"}. The application was not submitted.`
      );
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setFilling(false);
    }
  }

  async function handleAnalyze() {
    if (!profile || !job || !provider || !settings) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeJobWithAi({
        provider,
        settings,
        job,
        profile
      });
      setAnalysis(result);
      setDetailsOpen(false);
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleGenerate(
    question: ApplicationQuestion,
    tone: AnswerTone,
    length: AnswerLength
  ) {
    if (!profile || !job || !provider || !settings) return;
    setGeneratingId(question.id);
    setQuestionState((current) => ({
      ...current,
      [question.id]: { answer: null, draft: "", error: null }
    }));
    try {
      const result = await generateAnswerWithAi({
        provider,
        settings,
        question,
        job,
        profile,
        tone,
        length,
        skipCache: Boolean(questionState[question.id]?.answer)
      });
      setQuestionState((current) => ({
        ...current,
        [question.id]: {
          answer: result,
          draft: result.answer,
          error: null
        }
      }));
    } catch (err) {
      setQuestionState((current) => ({
        ...current,
        [question.id]: {
          answer: null,
          draft: "",
          error: toUserMessage(err)
        }
      }));
    } finally {
      setGeneratingId(null);
    }
  }

  async function handleUseAnswer(question: ApplicationQuestion, _replace: boolean) {
    const state = questionState[question.id];
    if (!state?.draft.trim()) return;
    setFilling(true);
    try {
      const response = await fillActiveTab([
        { fieldId: question.fieldId, value: state.draft }
      ]);
      if (!response.ok) {
        setError(response.error);
        return;
      }
      setFillMessage("Answer inserted. The application was not submitted.");
      setQuestions((current) =>
        current.map((item) =>
          item.id === question.id ? { ...item, currentValue: state.draft } : item
        )
      );
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setFilling(false);
    }
  }

  const profileName = useMemo(() => {
    return profile?.personal.fullName || profile?.personal.firstName || "Unnamed profile";
  }, [profile]);

  if (phase === "loading" || !settings) {
    return (
      <div className="app">
        <header className="header">
          <h1>Job Application Copilot</h1>
          <p>Loading profile…</p>
        </header>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Job Application Copilot</h1>
        <p>Local-first resume parsing, form fill, and optional Ollama assistance.</p>
      </header>

      <div className="tabs" role="tablist" aria-label="Extension views">
        {profile ? (
          <>
            <button
              className="tab"
              type="button"
              role="tab"
              aria-selected={tab === "apply"}
              onClick={() => setTab("apply")}
            >
              Apply
            </button>
            <button
              className="tab"
              type="button"
              role="tab"
              aria-selected={tab === "job"}
              onClick={() => setTab("job")}
            >
              Job
            </button>
          </>
        ) : null}
        <button
          className="tab"
          type="button"
          role="tab"
          aria-selected={tab === "profile"}
          onClick={() => setTab("profile")}
        >
          Profile
        </button>
        <button
          className="tab"
          type="button"
          role="tab"
          aria-selected={tab === "settings"}
          onClick={() => setTab("settings")}
        >
          AI
        </button>
      </div>

      <main className="main">
        <div className="stack">
          <ErrorBanner message={error} />

          {tab === "apply" && profile ? (
            <>
              <ErrorBanner message={scanError} />
              <FillPanel
                profileName={profileName}
                matches={matches}
                page={page}
                busy={busy}
                filling={filling}
                classifying={classifying}
                fillMessage={fillMessage}
                onRefresh={() => void refreshScan(profile, true)}
                onFill={(ids) => void handleFill(ids)}
                onRejectAi={() =>
                  setMatches((current) =>
                    current.map((item) =>
                      item.match?.source === "ai" ? { ...item, match: null } : item
                    )
                  )
                }
              />
            </>
          ) : null}

          {tab === "job" && profile ? (
            <JobPanel
              job={job}
              questions={questions}
              analysis={analysis}
              analyzing={analyzing}
              generatingId={generatingId}
              ollamaReady={ollamaReady && Boolean(settings.model)}
              questionState={questionState}
              detailsOpen={detailsOpen}
              onToggleDetails={() => setDetailsOpen((value) => !value)}
              onAnalyze={() => void handleAnalyze()}
              onGenerate={(question, tone, length) => void handleGenerate(question, tone, length)}
              onDraftChange={(id, value) =>
                setQuestionState((current) => ({
                  ...current,
                  [id]: {
                    answer: current[id]?.answer ?? null,
                    draft: value,
                    error: current[id]?.error ?? null
                  }
                }))
              }
              onUse={(question, replace) => void handleUseAnswer(question, replace)}
              onCancelQuestion={(id) =>
                setQuestionState((current) => ({
                  ...current,
                  [id]: { answer: null, draft: "", error: null }
                }))
              }
            />
          ) : null}

          {tab === "settings" ? (
            <AiSettingsPanel
              settings={settings}
              onSaved={(next) => {
                setSettings(next);
                setOllamaReady(Boolean(next.model));
                void createOllamaProvider(next.ollamaUrl, next.timeoutMs)
                  .isAvailable()
                  .then(setOllamaReady)
                  .catch(() => setOllamaReady(false));
              }}
            />
          ) : null}

          {tab === "profile" && (!profile || replacing) ? (
            <div className="stack">
              <UploadResume busy={busy} onFile={(file) => void handleFile(file)} />
              {replacing ? (
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setReplacing(false)}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          ) : null}

          {tab === "profile" && summary && profile && !replacing ? (
            <ParseSummary
              fileName={profile.metadata.sourceFileName}
              summary={summary}
              onReview={() => setSummary(null)}
            />
          ) : null}

          {tab === "profile" && profile && !summary && !replacing ? (
            <ProfileEditor
              key={profile.metadata.updatedAt}
              profile={profile}
              busy={busy}
              onSave={handleSave}
              onReplaceResume={() => {
                setSummary(null);
                setReplacing(true);
              }}
              onDelete={() => void handleDelete()}
            />
          ) : null}

          {tab === "profile" && !profile && !busy && !replacing ? (
            <p className="muted">Upload a PDF or DOCX resume to create your local profile.</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
