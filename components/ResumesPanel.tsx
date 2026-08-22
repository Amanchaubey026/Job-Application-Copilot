import { useState } from "react";
import type { ResumeDiffLine, ResumeTailoring, ResumeVersion } from "~types/resume";
import { lineDiff } from "~resumes/diff";
import { TextField } from "./TextField";

type Props = {
  resumes: ResumeVersion[];
  selectedId?: string;
  tailoring: ResumeTailoring | null;
  tailoringBusy: boolean;
  previewHtml?: string;
  onSelect: (id: string) => void;
  onCreate: (mode: "master" | "duplicate" | "job") => void;
  onDuplicate: (id: string) => void;
  onRestore: (resumeId: string) => void;
  onToggleChange: (id: string, accepted: boolean) => void;
  onApplyTailoring: () => void;
  onExportPdf: () => void;
  onExportDocx: () => void;
  onPreview: () => void;
};

export function ResumesPanel({
  resumes,
  selectedId,
  tailoring,
  tailoringBusy,
  previewHtml,
  onSelect,
  onCreate,
  onDuplicate,
  onRestore,
  onToggleChange,
  onApplyTailoring,
  onExportPdf,
  onExportDocx,
  onPreview
}: Props) {
  const [mode, setMode] = useState<"list" | "preview">("list");
  const selected = resumes.find((item) => item.id === selectedId) ?? resumes[0];

  return (
    <div className="stack">
      <div className="card">
        <h2 className="section-title">My Resumes</h2>
        <div className="btn-row">
          <button className="btn btn-secondary" type="button" onClick={() => onCreate("master")}>
            From Master
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => onCreate("duplicate")}>
            Duplicate selected
          </button>
          <button className="btn btn-primary" type="button" onClick={() => onCreate("job")}>
            Create for this job
          </button>
        </div>
      </div>
      {resumes.map((item) => (
        <button
          key={item.id}
          className="card"
          type="button"
          onClick={() => onSelect(item.id)}
          style={{
            textAlign: "left",
            borderColor: item.id === selected?.id ? "var(--accent)" : undefined
          }}
        >
          <strong>{item.name}</strong>
          <div className="muted">{item.focusAreas?.join(" / ") || item.description || "Resume version"}</div>
          <div className="tiny">
            {item.isPrimary ? "Primary · " : ""}
            Updated {item.updatedAt.slice(0, 10)}
          </div>
        </button>
      ))}
      {selected ? (
        <div className="card">
          <div className="btn-row">
            <button className="btn btn-ghost" type="button" onClick={() => onDuplicate(selected.id)}>
              Duplicate
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => onRestore(selected.id)}>
              Restore previous
            </button>
            <button className="btn btn-secondary" type="button" onClick={onPreview}>
              Preview Resume
            </button>
            <button className="btn btn-secondary" type="button" onClick={onExportPdf}>
              Export PDF
            </button>
            <button className="btn btn-secondary" type="button" onClick={onExportDocx}>
              Export DOCX
            </button>
          </div>
          <p className="tiny">
            File inputs cannot be filled by the extension. Export the resume, then choose that file on the site.
          </p>
        </div>
      ) : null}

      {tailoringBusy ? <div className="banner">Analyzing job requirements… creating suggestions…</div> : null}

      {tailoring ? (
        <div className="card">
          <h2 className="section-title">Resume Tailoring Suggestions</h2>
          {tailoring.skillsNotFoundInProfile.length ? (
            <p className="muted">
              Mentioned in the job but not in your profile: {tailoring.skillsNotFoundInProfile.join(", ")}. They will not be added.
            </p>
          ) : null}
          {tailoring.changes.map((change) => (
            <div className="item-card" key={change.id}>
              <strong>{change.label}</strong>
              <DiffBlock before={change.before} after={change.after} />
              <div className="btn-row">
                <button className="btn btn-primary" type="button" onClick={() => onToggleChange(change.id, true)}>
                  Accept
                </button>
                <button className="btn btn-secondary" type="button" onClick={() => onToggleChange(change.id, false)}>
                  Reject
                </button>
              </div>
            </div>
          ))}
          <button className="btn btn-primary" type="button" onClick={onApplyTailoring}>
            Apply Selected Changes
          </button>
        </div>
      ) : null}

      {previewHtml && mode === "list" ? (
        <button className="btn btn-ghost" type="button" onClick={() => setMode("preview")}>
          Show preview
        </button>
      ) : null}
      {previewHtml ? (
        <iframe title="Resume preview" className="preview-frame" srcDoc={previewHtml} />
      ) : null}
    </div>
  );
}

function DiffBlock({ before, after }: { before: string; after: string }) {
  const lines: ResumeDiffLine[] = lineDiff(before, after);
  return (
    <pre className="diff">
      {lines.map((line, index) => (
        <div key={`${line.kind}-${index}`} className={`diff-${line.kind}`}>
          {line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " "} {line.text}
        </div>
      ))}
    </pre>
  );
}
