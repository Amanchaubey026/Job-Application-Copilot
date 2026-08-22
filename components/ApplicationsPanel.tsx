import { useMemo, useState } from "react";
import { computeAnalytics } from "~applications/analytics";
import type { ApplicationStatus, JobApplication } from "~types/application";
import { TextField } from "./TextField";

type Props = {
  applications: JobApplication[];
  onStatus: (id: string, status: ApplicationStatus) => void;
  onNotes: (id: string, notes: string) => void;
  onDelete: (id: string) => void;
};

const STATUSES: ApplicationStatus[] = [
  "saved",
  "applied",
  "interview",
  "rejected",
  "offer",
  "withdrawn",
  "unknown"
];

export function ApplicationsPanel({ applications, onStatus, onNotes, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((app) =>
      [app.job.title, app.job.company, app.status, app.notes, ...(app.job.description ?? "").slice(0, 200)]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [applications, query]);

  const counts = STATUSES.reduce<Record<string, number>>((acc, status) => {
    acc[status] = applications.filter((app) => app.status === status).length;
    return acc;
  }, {});
  const analytics = computeAnalytics(applications);

  return (
    <div className="stack">
      <div className="card">
        <h2 className="section-title">Applications</h2>
        <div className="score">{applications.length}</div>
        <div className="score-caption">Total saved locally</div>
        <p className="muted" style={{ marginTop: 8 }}>
          {counts.saved ?? 0} saved · {counts.applied ?? 0} applied · {analytics.interviews} interviews ·{" "}
          {analytics.offers} offers
        </p>
        <p className="tiny">
          Interview rate {Math.round(analytics.interviewRate * 100)}% of submitted applications. Historical only — not a hiring probability.
        </p>
        {analytics.matchBuckets.map((bucket) => (
          <div className="tiny" key={bucket.label}>
            Match {bucket.label}: {bucket.applications} applications, {bucket.interviews} interviews
          </div>
        ))}
        <TextField label="Search" value={query} onChange={setQuery} placeholder="Company, role, skill, status" />
      </div>
      {filtered.length === 0 ? (
        <div className="empty">No saved jobs yet. Open a posting and click Save Job.</div>
      ) : (
        filtered.map((app) => (
          <div className="card" key={app.id}>
            <strong>{app.job.company || "Unknown company"}</strong>
            <div>{app.job.title || "Untitled role"}</div>
            <div className="muted">
              {app.status} · {app.match ? `${Math.round(app.match.score * 100)}% match` : "no match yet"}
            </div>
            <div className="btn-row" style={{ marginTop: 8 }}>
              <button className="btn btn-ghost" type="button" onClick={() => setOpenId(app.id)}>
                View
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => onDelete(app.id)}>
                Delete
              </button>
            </div>
            {openId === app.id ? (
              <div style={{ marginTop: 8 }}>
                <div className="field">
                  <label htmlFor={`status-${app.id}`}>Status</label>
                  <select
                    id={`status-${app.id}`}
                    value={app.status}
                    onChange={(event) => onStatus(app.id, event.target.value as ApplicationStatus)}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <TextField
                  label="Notes"
                  multiline
                  value={app.notes ?? ""}
                  onChange={(notes) => onNotes(app.id, notes)}
                />
                {app.answers?.length ? (
                  <div>
                    <div className="section-title">Saved answers</div>
                    {app.answers.map((answer) => (
                      <p className="muted" key={answer.id}>
                        {answer.question}: {answer.answer.slice(0, 140)}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
