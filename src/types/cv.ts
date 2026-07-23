/**
 * Shared typing for the CV/resume page (src/pages/Descent/CVPage), as
 * stored in and fetched from /public/data/cv.json at runtime. Edited
 * through the CV admin dashboard at /descent/admin.
 */

export interface CVJob {
  role: string;
  company: string;
  period: string;
  location: string;
  bullets: string[];
}

export interface CVSkillGroup {
  label: string;
  skills: string[];
}

export interface CVLanguage {
  name: string;
  level: string;
}

export interface CVContact {
  siteLabel: string;
  email: string;
  githubUsername: string;
}

export interface CVData {
  role: string;
  contact: CVContact;
  summary: string;
  jobs: CVJob[];
  skillGroups: CVSkillGroup[];
  languages: CVLanguage[];
}
