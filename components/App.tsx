import { useCallback, useEffect, useMemo, useState } from "react";
import { createOllamaProvider } from "~ai/ollama-provider";
import { analyzeJobMatch, generateAnswerWithAi, retrieveEvidence } from "~ai/services";
import { fillActiveTab, scanActiveTab } from "~lib/extension-client";
import { jobIdentity } from "~lib/job-extractor";
import { matchFieldsPhase2 } from "~matching/pipeline";
import { parseResumeFile } from "~parser";
import { profileRepository } from "~storage/profile-repository";
import { settingsRepository } from "~storage/settings-repository";
import { aiCacheRepository } from "~storage/ai-cache-repository";
import { knowledgeRepository } from "~storage/knowledge-repository";
import { applicationRepository } from "~storage/application-repository";
import { answerLibraryRepository } from "~storage/answer-library-repository";
import { embeddingRepository } from "~storage/embedding-repository";
import { ensureKnowledgeForProfile, indexStatus, rebuildEmbeddings, syncKnowledgeFromProfile } from "~knowledge/sync";
import { findSimilarAnswers } from "~knowledge/similar-answers";
import { buildRetrievalQuery } from "~retrieval/query";
import { createId } from "~utils/id";
import { toUserMessage } from "~types/errors";
import type {
  AnswerLength,
  AnswerTone,
  AiSettings,
  GeneratedAnswer,
  JobAnalysis
} from "~types/ai";
import type { ApplicationStatus, JobApplication, JobMatch } from "~types/application";
import type { CareerKnowledgeItem, KnowledgeType } from "~types/knowledge";
import type { MatchedField } from "~types/matching";
import type { PageContext } from "~types/form";
import type { ApplicationQuestion, JobContext } from "~types/job";
import type { ExtractionSummary, UserProfile } from "~types/profile";
import { AiSettingsPanel } from "./AiSettings";
import { ApplicationsPanel } from "./ApplicationsPanel";
import { ErrorBanner } from "./ErrorBanner";
import { FillPanel } from "./FillPanel";
import { JobPanel } from "./JobPanel";
import { KnowledgePanel } from "./KnowledgePanel";
import { ParseSummary } from "./ParseSummary";
import { ProfileEditor } from "./ProfileEditor";
import { UploadResume } from "./UploadResume";

type Tab = "apply" | "job" | "knowledge" | "apps" | "profile" | "settings";
type Phase = "loading" | "ready";

type QuestionState = {
  answer: GeneratedAnswer | null;
  draft: string;
  error: string | null;
  evidence?: string[];
  previous?: Array<{ question: string; answer: string; source: string }>;
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
  const [jobMatch, setJobMatch] = useState<JobMatch | null>(null);
  const [knowledge, setKnowledge] = useState<CareerKnowledgeItem[]>([]);
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [indexLabel, setIndexLabel] = useState("Career Knowledge");
  const [indexing, setIndexing] = useState(false);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [savedAppId, setSavedAppId] = useState<string | null>(null);

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
    if (stored) {
      const items = await ensureKnowledgeForProfile(stored);
      setKnowledge(items);
    }
    setApplications(await applicationRepository.list().catch(() => []));
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

  useEffect(() => {
    if (!profile || !job || !settings || questions.length === 0) return;
    let cancelled = false;
    void (async () => {
      const library = await answerLibraryRepository.list().catch(() => []);
      for (const question of questions) {
        const evidence = await retrieveEvidence({
          settings,
          query: buildRetrievalQuery({ question: question.question, job }),
          profile
        });
        if (cancelled) return;
        const previous = findSimilarAnswers(question.question, applications, library);
        setQuestionState((current) => ({
          ...current,
          [question.id]: {
            answer: current[question.id]?.answer ?? null,
            draft: current[question.id]?.draft ?? "",
            error: current[question.id]?.error ?? null,
            evidence: evidence.map((item) => item.item.title),
            previous
          }
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile, job, settings, questions, applications]);

  useEffect(() => {
    if (settings) void refreshIndexLabel(settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, knowledge.length]);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const result = await parseResumeFile(file);
      await profileRepository.saveProfile(result.profile);
      await aiCacheRepository.clear().catch(() => undefined);
      setKnowledge(await syncKnowledgeFromProfile(result.profile));
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
      setKnowledge(await syncKnowledgeFromProfile(next));
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
      const result = await analyzeJobMatch({
        provider,
        settings,
        job,
        profile
      });
      setAnalysis(result.analysis);
      setJobMatch(result.match);
      setDetailsOpen(false);
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setAnalyzing(false);
    }
  }

  async function refreshIndexLabel(settingsOverride?: AiSettings) {
    const current = settingsOverride ?? settings;
    const status = await indexStatus(current?.embeddingModel);
    if (!current?.embeddingModel) {
      setIndexLabel(`Career Knowledge · ${status.knowledge} items · lexical`);
    } else if (status.stale) {
      setIndexLabel(`Career Knowledge · ! Needs indexing (${status.embeddings}/${status.knowledge})`);
    } else {
      setIndexLabel(`Career Knowledge · Indexed ${status.embeddings}/${status.knowledge}`);
    }
  }

  async function handleRebuildIndex() {
    if (!settings) return;
    setIndexing(true);
    try {
      const items = await knowledgeRepository.list();
      setIndexLabel("Career Knowledge · Updating…");
      await rebuildEmbeddings(items, settings, (done, total) => {
        setIndexLabel(`Building career knowledge… ${done} / ${total}`);
      });
      await refreshIndexLabel();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setIndexing(false);
    }
  }

  async function handleSaveJob() {
    if (!job) return;
    const now = new Date().toISOString();
    const existing = applications.find((app) => jobIdentity(app.job) === jobIdentity(job));
    const record: JobApplication = existing
      ? { ...existing, job, match: jobMatch ?? existing.match, updatedAt: now }
      : {
          id: createId(),
          job,
          status: "saved",
          match: jobMatch ?? undefined,
          answers: [],
          createdAt: now,
          updatedAt: now
        };
    await applicationRepository.save(record);
    setSavedAppId(record.id);
    setApplications(await applicationRepository.list());
  }

  async function handleMarkApplied() {
    if (!savedAppId) return;
    const current = applications.find((app) => app.id === savedAppId);
    if (!current) return;
    const next = {
      ...current,
      status: "applied" as const,
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await applicationRepository.save(next);
    setApplications(await applicationRepository.list());
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
      if (savedAppId) {
        const current = applications.find((app) => app.id === savedAppId);
        if (current) {
          const answer = {
            id: createId(),
            question: question.question,
            answer: state.draft,
            sourceIds: state.answer?.sourceIds ?? [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          await applicationRepository.save({
            ...current,
            answers: [...(current.answers ?? []).filter((item) => item.question !== question.question), answer],
            updatedAt: new Date().toISOString()
          });
          await answerLibraryRepository.save({
            id: createId(),
            category: question.question.slice(0, 40),
            question: question.question,
            answer: state.draft,
            sourceIds: answer.sourceIds,
            createdAt: answer.createdAt,
            updatedAt: answer.updatedAt
          });
          setApplications(await applicationRepository.list());
        }
      }
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
            <button
              className="tab"
              type="button"
              role="tab"
              aria-selected={tab === "knowledge"}
              onClick={() => setTab("knowledge")}
            >
              Knowledge
            </button>
            <button
              className="tab"
              type="button"
              role="tab"
              aria-selected={tab === "apps"}
              onClick={() => setTab("apps")}
            >
              Apps
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
              match={jobMatch}
              analyzing={analyzing}
              generatingId={generatingId}
              ollamaReady={ollamaReady && Boolean(settings.model)}
              saved={Boolean(savedAppId)}
              questionState={questionState}
              detailsOpen={detailsOpen}
              onToggleDetails={() => setDetailsOpen((value) => !value)}
              onAnalyze={() => void handleAnalyze()}
              onSaveJob={() => void handleSaveJob()}
              onMarkApplied={() => void handleMarkApplied()}
              onGenerate={(question, tone, length) => void handleGenerate(question, tone, length)}
              onDraftChange={(id, value) =>
                setQuestionState((current) => ({
                  ...current,
                  [id]: {
                    answer: current[id]?.answer ?? null,
                    draft: value,
                    error: current[id]?.error ?? null,
                    evidence: current[id]?.evidence,
                    previous: current[id]?.previous
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

          {tab === "knowledge" && profile ? (
            <KnowledgePanel
              items={knowledge}
              query={knowledgeQuery}
              onQuery={setKnowledgeQuery}
              indexLabel={indexLabel}
              indexing={indexing}
              onRebuild={() => void handleRebuildIndex()}
              onSave={(item) => {
                const next = {
                  ...item,
                  origin: item.origin,
                  metadata: { ...item.metadata, updatedAt: new Date().toISOString() }
                };
                void knowledgeRepository.save(next).then(async () => {
                  setKnowledge(await knowledgeRepository.list());
                });
              }}
              onDelete={(id) => {
                void knowledgeRepository.delete(id).then(async () => {
                  await embeddingRepository.delete(id).catch(() => undefined);
                  setKnowledge(await knowledgeRepository.list());
                });
              }}
              onAdd={(type: KnowledgeType) => {
                const stamp = new Date().toISOString();
                const item: CareerKnowledgeItem = {
                  id: createId(),
                  type,
                  title: `New ${type}`,
                  content: "",
                  origin: "manual",
                  metadata: { createdAt: stamp, updatedAt: stamp, tags: [] }
                };
                void knowledgeRepository.save(item).then(async () => {
                  setKnowledge(await knowledgeRepository.list());
                });
              }}
            />
          ) : null}

          {tab === "apps" ? (
            <ApplicationsPanel
              applications={applications}
              onStatus={(id, status: ApplicationStatus) => {
                const current = applications.find((app) => app.id === id);
                if (!current) return;
                const next = { ...current, status, updatedAt: new Date().toISOString() };
                void applicationRepository.save(next).then(async () => {
                  setApplications(await applicationRepository.list());
                });
              }}
              onNotes={(id, notes) => {
                const current = applications.find((app) => app.id === id);
                if (!current) return;
                const next = { ...current, notes, updatedAt: new Date().toISOString() };
                void applicationRepository.save(next).then(async () => {
                  setApplications(await applicationRepository.list());
                });
              }}
              onDelete={(id) => {
                void applicationRepository.delete(id).then(async () => {
                  setApplications(await applicationRepository.list());
                  if (savedAppId === id) setSavedAppId(null);
                });
              }}
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
