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

export const cvSummary =
  "Frontend Developer with a deepening focus on Python and Django, bridging polished UI work with robust backend development. Grounded in UI/UX design and Graphic Design & Animation, with hands-on experience building responsive, accessible web interfaces and Django-powered applications. Comfortable across the full stack, from Figma prototype to production-ready code, with consistent attention to visual quality, usability, and performance.";

export const cvJobs: CVJob[] = [
  {
    role: "Frontend Developer",
    company: "Laser Frame",
    period: "2024 \u2013 Present",
    location: "Iran",
    bullets: [
      "Established the studio's technical foundation, defining front-end standards, component libraries, and design system conventions used across all client projects.",
      "Directed creative and UI architecture decisions end-to-end, from wireframe and Figma prototype through to production-ready React build.",
      "Built responsive, user-centric web applications using React, TypeScript, and modern front-end technologies, combining component-driven architecture with meticulous attention to design detail.",
      "Translated complex design specifications into fully functional, accessible, and performance-optimised web experiences that meet both user needs and business objectives.",
      "Delivered web products for brands, startups, and agencies with a consistent focus on craft, performance, and visual precision.",
    ],
  },
  {
    role: "Animator",
    company: "Black Particle",
    period: "2023 \u2013 2024",
    location: "Iran",
    bullets: [
      "Designed vector assets using Adobe Illustrator to establish the visual foundation for animation projects.",
      "Utilized Adobe After Effects to create smooth, professional motion graphics and bring static illustrations to life.",
    ],
  },
  {
    role: "Motion Graphic Designer",
    company: "Exalate",
    period: "2022 \u2013 2023",
    location: "Belgium",
    bullets: [
      "Created motion graphics for web and marketing platforms.",
      "Translated design concepts into engaging animations.",
    ],
  },
  {
    role: "Motion Graphic Designer",
    company: "Digikala",
    period: "2018 \u2013 2022",
    location: "Tehran, Iran",
    bullets: [
      "Edited high-quality video content for marketing and e-commerce.",
      "Enhanced post-production workflow and storytelling quality.",
    ],
  },
];

export const cvSkillGroups: CVSkillGroup[] = [
  {
    label: "Frontend",
    skills: ["HTML5", "CSS3", "JavaScript", "TypeScript", "React.js", "Figma"],
  },
  {
    label: "Back-End",
    skills: ["Python", "Django", "Wagtail", "PostgreSQL", "Transact-SQL"],
  },
  {
    label: "Graphic Design",
    skills: [
      "Adobe Illustrator",
      "Adobe After Effects",
      "Adobe Photoshop",
      "Adobe Premiere",
      "Adobe InDesign",
    ],
  },
];

export const cvLanguages: CVLanguage[] = [
  { name: "English", level: "Professional Working Proficiency" },
  { name: "Persian", level: "Native" },
  { name: "Turkish", level: "Elementary Proficiency" },
];
