export interface ResumeExperience {
  id: string;
  company?: string;
  title?: string;
  dates?: string;
  bullets: string[];
}

export interface ResumeProject {
  id: string;
  name?: string;
  description?: string;
}

export interface ResumeEducation {
  id: string;
  institution?: string;
  degree?: string;
  field?: string;
  dates?: string;
}

export interface ResumeContent {
  summary?: string;
  skills: string[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  education: ResumeEducation[];
  certifications?: string[];
  achievements?: string[];
}

export interface ResumeVersion {
  id: string;
  name: string;
  description?: string;
  targetRoles?: string[];
  focusAreas?: string[];
  content: ResumeContent;
  isPrimary?: boolean;
  sourceProfileVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeRevision {
  id: string;
  resumeId: string;
  content: ResumeContent;
  createdAt: string;
  label?: string;
}

export type DiffKind = "added" | "removed" | "unchanged";

export interface ResumeDiffLine {
  kind: DiffKind;
  text: string;
}

export interface TailoringChange {
  id: string;
  section: "summary" | "skills" | "experience" | "projects";
  label: string;
  before: string;
  after: string;
  accepted: boolean;
}

export interface ResumeTailoring {
  summaryRecommendation?: string;
  skillsToEmphasize: string[];
  projectsToEmphasize: string[];
  experiencePointsToEmphasize: string[];
  skillsNotFoundInProfile: string[];
  changes: TailoringChange[];
}

export const RESUME_TAILORING_PROMPT_VERSION = "resume-tailoring-v1";
