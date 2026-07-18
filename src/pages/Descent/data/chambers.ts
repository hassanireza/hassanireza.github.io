export interface Specimen {
  label: string;
  icon: SpecimenIcon;
}

export type SpecimenIcon =
  | "illustrator"
  | "photoshop"
  | "layout"
  | "color"
  | "afterEffects"
  | "premiere"
  | "easing"
  | "frames"
  | "html"
  | "css"
  | "javascript"
  | "typescript"
  | "react"
  | "vite"
  | "django"
  | "postgres"
  | "python"
  | "api"
  | "docker"
  | "git"
  | "unity"
  | "unreal"
  | "blender"
  | "csharp"
  | "gamedesign";

export interface Chamber {
  id: string;
  index: string;
  zoneLabel: string;
  zoneName: string;
  depthFathom: number;
  title: string;
  subtitle: string;
  body: string;
  specimens: Specimen[];
  artifact: string;
}

export const chambers: Chamber[] = [
  {
    id: "graphic-design",
    index: "I.",
    zoneLabel: "Epipelagic \u00B7 the sunlit zone",
    zoneName: "SUNLIT SURFACE",
    depthFathom: 0,
    title: "Graphic Design",
    subtitle: "Where the light still reaches: the origin",
    body: "This is the surface layer, where every color is still visible. It's where the fundamentals were laid down: composition, hierarchy, color theory, grid. Long before there was a browser to build for, there was a canvas to balance, learning to make a flat plane hold weight, contrast, and intention. Every interface decision made since traces back to this layer of light.",
    specimens: [
      { label: "Illustrator", icon: "illustrator" },
      { label: "Photoshop", icon: "photoshop" },
      { label: "Layout & Grid", icon: "layout" },
      { label: "Color Theory", icon: "color" },
    ],
    artifact:
      "The page is a room. Before it moves, it has to hold still and make sense.",
  },
  {
    id: "motion-animation",
    index: "II.",
    zoneLabel: "Mesopelagic \u00B7 the twilight zone",
    zoneName: "TWILIGHT ZONE",
    depthFathom: 800,
    title: "Motion Graphics & Animation",
    subtitle: "Where light fades but things begin to move",
    body: "Past the surface, direct light thins out, but this is where movement takes over as the primary language. Static composition became timing, easing, and sequence. Learning to animate meant learning that every transition communicates intent: what enters first, what the eye follows, how long a beat should breathe before the next cut. This is also where storytelling in time, not just space, became instinct.",
    specimens: [
      { label: "After Effects", icon: "afterEffects" },
      { label: "Premiere Pro", icon: "premiere" },
      { label: "Easing & Timing", icon: "easing" },
      { label: "Frame Sequencing", icon: "frames" },
    ],
    artifact:
      "Nothing on screen just appears. It arrives, and how it arrives is the message.",
  },
  {
    id: "frontend",
    index: "III.",
    zoneLabel: "Bathypelagic \u00B7 the structural dark",
    zoneName: "THE MIDNIGHT ZONE",
    depthFathom: 1600,
    title: "Frontend Development",
    subtitle: "Where there's no light left: only structure that holds",
    body: "Down here, nothing survives on decoration. Everything has to be built to hold pressure: semantics, state, performance, accessibility. The instincts from the surface didn't disappear, composition became component architecture, timing became interaction design, and motion became the interface's own vocabulary of feedback. Design and engineering stopped being two disciplines and became one continuous descent.",
    specimens: [
      { label: "HTML5", icon: "html" },
      { label: "CSS", icon: "css" },
      { label: "JavaScript", icon: "javascript" },
      { label: "TypeScript", icon: "typescript" },
      { label: "React", icon: "react" },
      { label: "Vite", icon: "vite" },
      { label: "Git & GitHub", icon: "git" },
    ],
    artifact:
      "At full depth, taste and rigor are the same requirement. Nothing decorative survives the pressure, only what's built to hold.",
  },
  {
    id: "backend",
    index: "IV.",
    zoneLabel: "Bathypelagic \u00B7 the deep current",
    zoneName: "THE UNDERCURRENT",
    depthFathom: 2000,
    title: "Backend Development",
    subtitle: "Where nothing is seen, but everything moves",
    body: "Structure alone doesn't keep a system alive. It needs a current running beneath it, unseen, carrying everything the surface depends on. This is where requests become responses: routing, authentication, data modeling, and a persistence layer that remembers what the interface forgets the moment it refreshes. Nothing at this depth is visible from above, but every fetch, every saved session, every protected route is answered from here. The structure only looks solid because of what's circulating beneath it.",
    specimens: [
      { label: "Python", icon: "python" },
      { label: "Django", icon: "django" },
      { label: "REST APIs", icon: "api" },
      { label: "PostgreSQL", icon: "postgres" },
      { label: "Docker", icon: "docker" },
    ],
    artifact:
      "The surface never sees this layer work. It only notices when the current stops.",
  },
  {
    id: "game-development",
    index: "V.",
    zoneLabel: "Abyssopelagic \u00B7 the trench floor",
    zoneName: "THE ABYSS",
    depthFathom: 2400,
    title: "Game Development",
    subtitle: "Where structure learns to respond, in real time",
    body: "At the trench floor, static logic isn't enough, the system has to react. Game development folds every layer above it back together: the compositional eye, the animator's sense of timing, the engineer's discipline, and the current running beneath it all, now applied to something that has to run at sixty frames a second and answer to a player. Systems thinking, real-time rendering, and interactive feedback loops are the newest current in the descent, still being explored.",
    specimens: [
      { label: "Unity", icon: "unity" },
      { label: "Unreal Engine", icon: "unreal" },
      { label: "Blender", icon: "blender" },
      { label: "C#", icon: "csharp" },
      { label: "Game Design", icon: "gamedesign" },
    ],
    artifact:
      "The interface used to wait for input. Down here, the whole world does.",
  },
];
