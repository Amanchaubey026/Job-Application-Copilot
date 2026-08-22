import type { ExtractionSummary } from "~types/profile";

type Props = {
  fileName?: string;
  summary: ExtractionSummary;
  onReview: () => void;
};

function Item({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li>
      <span className={ok ? "check" : "miss"}>{ok ? "✓" : "–"}</span>
      {label}
    </li>
  );
}

export function ParseSummary({ fileName, summary, onReview }: Props) {
  return (
    <div className="stack">
      <div className="banner banner-success" role="status">
        Resume processed successfully{fileName ? `: ${fileName}` : "."}
      </div>
      <div className="card">
        <h2 className="section-title">We found</h2>
        <ul className="found-list">
          <Item ok={summary.hasPersonal} label="Personal information" />
          <Item ok={summary.hasExperience} label="Experience" />
          <Item ok={summary.hasEducation} label="Education" />
          <Item ok={summary.hasSkills} label="Skills" />
          <Item ok={summary.hasLinks} label="Links" />
          <Item ok={summary.hasProjects} label="Projects" />
        </ul>
        {summary.warnings.length > 0 ? (
          <p className="muted" style={{ marginTop: 10 }}>
            {summary.warnings.join(" ")}
          </p>
        ) : null}
      </div>
      <button className="btn btn-primary" type="button" onClick={onReview}>
        Review Profile
      </button>
    </div>
  );
}
