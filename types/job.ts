export interface JobContext {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  url: string;
  confidence: number;
}

export interface ApplicationQuestion {
  id: string;
  fieldId: string;
  elementId: string;
  question: string;
  fieldType: "input" | "textarea";
  required?: boolean;
  maxLength?: number;
  currentValue?: string;
}

export interface RelevantProfileContext {
  experience: string[];
  projects: string[];
  skills: string[];
  achievements: string[];
  education: string[];
  summary: string;
}
