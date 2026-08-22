export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  fullAddress?: string;
}

export interface WorkExperience {
  id: string;
  company?: string;
  title?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

export interface Education {
  id: string;
  institution?: string;
  degree?: string;
  field?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
}

export interface Project {
  id: string;
  name?: string;
  description?: string;
  url?: string;
  technologies?: string[];
}

export interface Certification {
  id: string;
  name?: string;
  issuer?: string;
  date?: string;
}

export interface Language {
  id: string;
  name?: string;
  proficiency?: string;
}

export interface UserProfile {
  id: string;

  personal: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    address?: Address;
    location?: string;
  };

  links: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
    website?: string;
    other?: string[];
  };

  experience: WorkExperience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  certifications?: Certification[];
  achievements?: string[];
  languages?: Language[];
  rawResumeText?: string;

  metadata: {
    sourceFileName?: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface ExtractionSummary {
  hasPersonal: boolean;
  hasExperience: boolean;
  hasEducation: boolean;
  hasSkills: boolean;
  hasLinks: boolean;
  hasProjects: boolean;
  warnings: string[];
}
