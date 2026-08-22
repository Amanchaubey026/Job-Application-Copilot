import { useEffect, useState } from "react";
import { shouldAutoselect } from "~matching";
import type { MatchedField } from "~types/matching";
import { confidenceBand } from "~types/matching";
import type { ApplicationCompleteness, ApplicationStep } from "~types/application";
import type { PageContext } from "~types/form";
import type { ResumeVersion } from "~types/resume";
import { displayNameFromPath } from "~utils/profile-path";

type Props = {
  profileName?: string;
  matches: MatchedField[];
  page?: PageContext | null;
  busy: boolean;
  filling: boolean;
  classifying?: boolean;
  fillMessage: string | null;
  resumes?: ResumeVersion[];
  selectedResumeId?: string;
  steps?: ApplicationStep[];
  completeness?: ApplicationCompleteness | null;
  unanswered?: string[];
  onRefresh: () => void;
  onFill: (fieldIds: string[]) => void;
  onRejectAi?: () => void;
  onSelectResume?: (id: string) => void;
};

function fieldLabel(item: MatchedField): string {
  if (item.match) return displayNameFromPath(item.match.profilePath);
  return (
    item.field.label ||
    item.field.placeholder ||
    item.field.name ||
    item.field.elementId ||
    "Unknown field"
  );
}

export function FillPanel({
  profileName,
  matches,
  page,
  busy,
  filling,
  classifying,
  fillMessage,
  resumes,
  selectedResumeId,
  steps,
  completeness,
  unanswered,
  onRefresh,
  onFill,
  onRejectAi,
  onSelectResume
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const next = new Set<string>();
    for (const item of matches) {
      if (shouldAutoselect(item.match)) next.add(item.field.id);
    }
    setSelected(next);
  }, [matches]);

  const readyCount = matches.filter((item) => shouldAutoselect(item.match)).length;
  const selectedReady = matches.filter(
    (item) => selected.has(item.field.id) && item.match?.value.trim()
  );

  function toggle(id: string, enabled: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (enabled) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function selectHighConfidence() {
    const next = new Set<string>();
    for (const item of matches) {
      if (shouldAutoselect(item.match)) next.add(item.field.id);
    }
    setSelected(next);
  }

  return (
    <div className="stack">
      <div className="card">
        <div className="status-bar">
          Profile: <strong>{profileName || "Unnamed"}</strong>
        </div>
        <div className="status-bar" style={{ marginTop: 4 }}>
          {matches.length} field{matches.length === 1 ? "" : "s"} detected
          {page?.looksLikeJobApplication ? " · looks like a job application" : ""}
        </div>
        {resumes?.length ? (
          <div className="field" style={{ marginTop: 8 }}>
            <label htmlFor="resume-select">Resume</label>
            <select
              id="resume-select"
              value={selectedResumeId ?? ""}
              onChange={(event) => onSelectResume?.(event.target.value)}
            >
              {resumes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <p className="tiny">
              Resume file inputs cannot be set automatically. Export the selected resume, then upload it on the page.
            </p>
          </div>
        ) : null}
        {completeness ? (
          <div className="status-bar">
            Application completeness {completeness.percentage}% · {completeness.completedRequired}/
            {completeness.totalRequired} required fields complete
          </div>
        ) : null}
        {steps?.length ? (
          <ul className="found-list">
            {steps.map((step) => (
              <li key={step.id}>
                {step.status === "completed" ? "✓" : step.status === "current" ? "→" : "○"} {step.title}
              </li>
            ))}
          </ul>
        ) : null}
        {unanswered?.length ? (
          <p className="tiny">⚠ {unanswered.length} unanswered question{unanswered.length === 1 ? "" : "s"}</p>
        ) : null}
      </div>

      {matches.length === 0 ? (
        <div className="empty">No recognizable form fields found on this page.</div>
      ) : (
        <div className="card">
          {matches.map((item) => {
            const match = item.match;
            const hasValue = Boolean(match?.value.trim());
            const band = match ? confidenceBand(match.confidence) : "low";
            const canSelect = Boolean(hasValue);
            return (
              <label className="field-row" key={item.field.id}>
                <input
                  type="checkbox"
                  checked={selected.has(item.field.id)}
                  disabled={!canSelect}
                  onChange={(event) => toggle(item.field.id, event.target.checked)}
                />
                <div>
                  <div className="meta">
                    <strong>{fieldLabel(item)}</strong>
                    <span style={{ display: "flex", gap: 4 }}>
                      {match?.source === "ai" ? <span className="badge badge-ai">AI</span> : null}
                      {match && hasValue ? (
                        <span className={`badge badge-${band}`}>{band}</span>
                      ) : match ? (
                        <span className="badge badge-missing">Missing</span>
                      ) : (
                        <span className="badge badge-low">Unmatched</span>
                      )}
                    </span>
                  </div>
                  <div className="value">
                    {hasValue
                      ? match?.value
                      : match
                        ? "Not available"
                        : "This field could not be matched to your profile."}
                  </div>
                  {match?.source === "ai" && match.reason ? (
                    <div className="tiny">{match.reason}</div>
                  ) : null}
                </div>
              </label>
            );
          })}
        </div>
      )}

      <div className="status-bar">
        {readyCount} field{readyCount === 1 ? "" : "s"} ready · {selectedReady.length} selected
      </div>

      {fillMessage ? (
        <div className="banner banner-success" role="status">
          {fillMessage}
        </div>
      ) : null}

      <div className="btn-row">
        <button
          className="btn btn-primary"
          type="button"
          disabled={filling || selectedReady.length === 0}
          onClick={() => onFill(selectedReady.map((item) => item.field.id))}
        >
          {filling ? "Filling…" : "Fill Selected"}
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={filling || readyCount === 0}
          onClick={() => {
            selectHighConfidence();
            const ids = matches
              .filter((item) => shouldAutoselect(item.match))
              .map((item) => item.field.id);
            onFill(ids);
          }}
        >
          Fill Ready Fields
        </button>
        <button className="btn btn-secondary" type="button" onClick={selectHighConfidence}>
          Select All High Confidence
        </button>
        <button className="btn btn-secondary" type="button" disabled={busy} onClick={onRefresh}>
          {classifying ? "Classifying fields…" : "Refresh Detection"}
        </button>
        {onRejectAi ? (
          <button className="btn btn-ghost" type="button" onClick={onRejectAi}>
            Reject AI matches
          </button>
        ) : null}
      </div>
    </div>
  );
}
