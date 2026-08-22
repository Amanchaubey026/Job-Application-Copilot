import { useCallback, useEffect, useMemo, useState } from "react";
import { fillActiveTab, scanActiveTab } from "~lib/extension-client";
import { RuleBasedFieldMatcher } from "~matching/rule-based-matcher";
import { parseResumeFile } from "~parser";
import { profileRepository } from "~storage/profile-repository";
import { toUserMessage } from "~types/errors";
import type { MatchedField } from "~types/matching";
import type { PageContext } from "~types/form";
import type { ExtractionSummary, UserProfile } from "~types/profile";
import { ErrorBanner } from "./ErrorBanner";
import { FillPanel } from "./FillPanel";
import { ParseSummary } from "./ParseSummary";
import { ProfileEditor } from "./ProfileEditor";
import { UploadResume } from "./UploadResume";

type Tab = "apply" | "profile";
type Phase = "loading" | "ready";

const matcher = new RuleBasedFieldMatcher();

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

  const loadProfile = useCallback(async () => {
    const stored = await profileRepository.getProfile();
    setProfile(stored);
    setPhase("ready");
    setTab(stored ? "apply" : "profile");
  }, []);

  useEffect(() => {
    void loadProfile().catch((err) => {
      setError(toUserMessage(err));
      setPhase("ready");
    });
  }, [loadProfile]);

  const refreshScan = useCallback(async (currentProfile: UserProfile | null) => {
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
        setScanError(response.error);
        return;
      }
      setPage(response.page);
      setMatches(matcher.matchAll(response.fields, currentProfile));
    } catch (err) {
      setMatches([]);
      setPage(null);
      setScanError(toUserMessage(err));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (phase === "ready" && profile && tab === "apply") {
      void refreshScan(profile);
    }
  }, [phase, profile, tab, refreshScan]);

  useEffect(() => {
    const listener = (
      message: { type?: string; fields?: MatchedField["field"][]; page?: PageContext }
    ) => {
      if (message?.type !== "FORM_FIELDS_CHANGED" || !profile || !message.fields) return;
      setPage(message.page ?? null);
      setMatches(matcher.matchAll(message.fields, profile));
      setScanError(null);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [profile]);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const result = await parseResumeFile(file);
      await profileRepository.saveProfile(result.profile);
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
      setProfile(next);
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

  const profileName = useMemo(() => {
    return profile?.personal.fullName || profile?.personal.firstName || "Unnamed profile";
  }, [profile]);

  if (phase === "loading") {
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
        <p>Local-first resume parsing and form fill. Nothing leaves this machine.</p>
      </header>

      {profile ? (
        <div className="tabs" role="tablist" aria-label="Extension views">
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
            aria-selected={tab === "profile"}
            onClick={() => setTab("profile")}
          >
            Profile
          </button>
        </div>
      ) : null}

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
                fillMessage={fillMessage}
                onRefresh={() => void refreshScan(profile)}
                onFill={(ids) => void handleFill(ids)}
              />
            </>
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
