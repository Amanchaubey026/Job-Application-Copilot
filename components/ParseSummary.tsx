import type { ExtractionSummary, UserProfile } from "~types/profile";

type Props = {
  fileName?: string;
  summary: ExtractionSummary;
  profile?: UserProfile;
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

export function ParseSummary({ fileName, summary, profile, onReview }: Props) {
  const highlights = [
    profile?.personal.fullName,
    profile?.personal.email,
    profile?.personal.phone,
    [profile?.experience[0]?.title, profile?.experience[0]?.company].filter(Boolean).join(" · ")
  ].filter(Boolean);

  return (
    <div className="stack">
      <div className="banner banner-success" role="status">
        Resume processed successfully{fileName ? `: ${fileName}` : "."}
      </div>
      <div className="card">
        <h2 className="section-title">We found</h2>
        {highlights.length ? (
          <p className="muted" style={{ marginTop: 0, marginBottom: 8 }}>
            {highlights.join(" · ")}
          </p>
        ) : null}
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
            {summary.warnings.join(" ")} Fix anything missing in Review profile before filling.
          </p>
        ) : null}
      </div>
      <p className="muted">Use Fill this page above after you confirm the extracted fields.</p>
      <button className="btn btn-secondary" type="button" onClick={onReview}>
        Review profile
      </button>
    </div>
  );
}
