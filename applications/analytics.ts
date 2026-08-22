import type { JobApplication } from "~types/application";

export interface ApplicationAnalytics {
  total: number;
  interviews: number;
  offers: number;
  applied: number;
  interviewRate: number;
  offerRate: number;
  matchBuckets: Array<{ label: string; applications: number; interviews: number }>;
  resumePerformance: Array<{ resumeId: string; applications: number; interviewRate: number }>;
}

export function computeAnalytics(applications: JobApplication[]): ApplicationAnalytics {
  const total = applications.length;
  const interviews = applications.filter((app) => app.status === "interview" || app.status === "offer").length;
  const offers = applications.filter((app) => app.status === "offer").length;
  const applied = applications.filter((app) =>
    ["applied", "interview", "rejected", "offer"].includes(app.status)
  ).length;
  const buckets = [
    { label: "80–89%", min: 0.8, max: 0.9 },
    { label: "90–100%", min: 0.9, max: 1.01 }
  ].map((bucket) => {
    const rows = applications.filter((app) => {
      const score = app.match?.score ?? -1;
      return score >= bucket.min && score < bucket.max;
    });
    return {
      label: bucket.label,
      applications: rows.length,
      interviews: rows.filter((app) => app.status === "interview" || app.status === "offer").length
    };
  });

  const byResume = new Map<string, JobApplication[]>();
  for (const app of applications) {
    const key = app.selectedResumeId || "master";
    byResume.set(key, [...(byResume.get(key) ?? []), app]);
  }
  const resumePerformance = [...byResume.entries()].map(([resumeId, rows]) => {
    const interviewed = rows.filter((app) => app.status === "interview" || app.status === "offer").length;
    return {
      resumeId,
      applications: rows.length,
      interviewRate: rows.length ? interviewed / rows.length : 0
    };
  });

  return {
    total,
    interviews,
    offers,
    applied,
    interviewRate: applied ? interviews / applied : 0,
    offerRate: applied ? offers / applied : 0,
    matchBuckets: buckets,
    resumePerformance
  };
}
