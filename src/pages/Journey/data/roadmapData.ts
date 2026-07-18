import { Phase } from "../domain/Phase";
import { Achievement, Milestone } from "../domain/Achievement";
import { RoadmapTrack } from "../domain/RoadmapTrack";

const phases: Phase[] = [
  new Phase({
    id: 0,
    title: "Python Fundamentals",
    subtitle: "Data structures and core language",
    icon: "python",
    xp: 100,
    skills: ["Data Structures", "OOP", "Decorators", "Generators", "Type Hints", "Error Handling"],
    projects: ["CLI Task Manager", "File Organizer", "API Client"],
  }),
  new Phase({
    id: 1,
    title: "Django Mastery",
    subtitle: "Web framework and authentication",
    icon: "django",
    xp: 120,
    skills: ["ORM", "Middleware", "Authentication", "Permissions", "Sessions", "Admin Panel"],
    projects: ["SaaS Dashboard", "User Management System"],
  }),
  new Phase({
    id: 2,
    title: "PostgreSQL",
    subtitle: "Professional database work",
    icon: "database",
    xp: 100,
    skills: ["SQL", "Joins", "Indexes", "Transactions", "Query Optimization"],
    projects: ["Analytics Dashboard", "Reporting Tool"],
  }),
  new Phase({
    id: 3,
    title: "REST APIs",
    subtitle: "Production grade API design",
    icon: "api",
    xp: 110,
    skills: ["Django REST Framework", "Authentication", "Pagination", "Permissions", "Versioning"],
    projects: ["Public API", "Mobile Backend"],
  }),
  new Phase({
    id: 4,
    title: "Testing",
    subtitle: "Reliable, well covered code",
    icon: "testing",
    xp: 90,
    skills: ["Unit Testing", "Integration Testing", "Mocking", "Test Coverage"],
    projects: ["Fully Tested API"],
  }),
  new Phase({
    id: 5,
    title: "React + Django",
    subtitle: "Full stack integration",
    icon: "frontend",
    xp: 130,
    skills: ["JWT", "Cookies", "CSRF", "Protected Routes"],
    projects: ["Full SaaS Application"],
  }),
  new Phase({
    id: 6,
    title: "Background Jobs",
    subtitle: "Async task architecture",
    icon: "jobs",
    xp: 110,
    skills: ["Redis", "Celery", "Task Queues", "Scheduling"],
    projects: ["Email Automation", "Report Generator"],
  }),
  new Phase({
    id: 7,
    title: "Docker and Deployment",
    subtitle: "Containerize and ship",
    icon: "containers",
    xp: 120,
    skills: ["Docker", "Docker Compose", "CI/CD", "Linux Basics"],
    projects: ["Deploy Django App"],
  }),
  new Phase({
    id: 8,
    title: "FastAPI",
    subtitle: "Modern async API development",
    icon: "speed",
    xp: 100,
    skills: ["Async", "Dependency Injection", "OpenAPI"],
    projects: ["Microservice API"],
  }),
  new Phase({
    id: 9,
    title: "Production Engineering",
    subtitle: "Operate real systems",
    icon: "shield",
    xp: 120,
    skills: ["Logging", "Monitoring", "Security", "Performance"],
    projects: ["Production Dashboard"],
  }),
  new Phase({
    id: 10,
    title: "AI Integration",
    subtitle: "Build AI powered products",
    icon: "ai",
    xp: 150,
    skills: ["LLM APIs", "Embeddings", "RAG", "Vector Databases"],
    projects: ["AI Assistant", "Document Search Tool"],
  }),
];

const achievements: Achievement[] = [
  new Achievement({
    id: "first_blood",
    name: "Opening Move",
    icon: "mark",
    description: "Complete your first phase",
    requirement: (count) => count >= 1,
  }),
  new Achievement({
    id: "pythonista",
    name: "Pythonista",
    icon: "python",
    description: "Master Python fundamentals",
    requirement: (_count, ids) => ids.has(0),
  }),
  new Achievement({
    id: "backend_beast",
    name: "Backend Foundation",
    icon: "django",
    description: "Complete Django and PostgreSQL",
    requirement: (_count, ids) => ids.has(1) && ids.has(2),
  }),
  new Achievement({
    id: "api_architect",
    name: "API Architect",
    icon: "api",
    description: "Build and ship a public API",
    requirement: (_count, ids) => ids.has(3),
  }),
  new Achievement({
    id: "fullstack",
    name: "Full Stack Developer",
    icon: "frontend",
    description: "Connect React to the backend",
    requirement: (_count, ids) => ids.has(5),
  }),
  new Achievement({
    id: "ship_it",
    name: "Shipped",
    icon: "containers",
    description: "Deploy a real application",
    requirement: (_count, ids) => ids.has(7),
  }),
  new Achievement({
    id: "ai_builder",
    name: "AI Builder",
    icon: "ai",
    description: "Integrate AI into a product",
    requirement: (_count, ids) => ids.has(10),
  }),
  new Achievement({
    id: "grandmaster",
    name: "Full Circle",
    icon: "trophy",
    description: "Complete all eleven phases",
    requirement: (count) => count >= 11,
  }),
];

const milestones: Milestone[] = [
  new Milestone({ label: "Junior Developer", requiredPhases: 3 }),
  new Milestone({ label: "Mid Level Developer", requiredPhases: 6 }),
  new Milestone({ label: "Senior Developer", requiredPhases: 9 }),
  new Milestone({ label: "Architect", requiredPhases: 11 }),
];

export const roadmapTrack = new RoadmapTrack(
  "Full Stack Python Developer",
  phases,
  achievements,
  milestones
);
