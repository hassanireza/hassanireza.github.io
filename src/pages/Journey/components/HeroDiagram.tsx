import type { CSSProperties } from "react";

const nodes = [
  { key: "python", x: 60, y: 44, label: "Python" },
  { key: "django", x: 200, y: 114, label: "Django" },
  { key: "frontend", x: 340, y: 184, label: "React" },
  { key: "containers", x: 200, y: 254, label: "Deploy" },
  { key: "ai", x: 60, y: 324, label: "AI", pending: true },
] as const;

const links = [
  { id: "python-django", from: nodes[0], to: nodes[1] },
  { id: "django-frontend", from: nodes[1], to: nodes[2] },
  { id: "frontend-containers", from: nodes[2], to: nodes[3] },
  { id: "ai-containers", from: nodes[4], to: nodes[3], dashed: true },
] as const;

/**
 * Hand-authored construction timeline, not a formula.
 *
 * The diagram builds itself the way the roadmap itself was built: one
 * confirmed step at a time. Each beat starts only after the beat before
 * it has fully landed, with a short settling pause in between, so the
 * eye reads a single path being laid down - node, then line, then node -
 * rather than several things resolving at once.
 *
 * The AI branch is deliberately the odd one out: it grows slower, off a
 * dashed (unconfirmed) line, and settles at a dimmer final opacity, since
 * it represents the next step rather than a finished one.
 *
 * All times are seconds, measured from mount.
 */
const NODE_POP = 0.5; // node scale/fade-in duration
const LINE_DRAW = 0.5; // solid line stroke-draw duration
const LINE_DRAW_PENDING = 0.65; // dashed line grow duration, deliberately slower
const BEAT = 0.14; // settling pause between one beat finishing and the next starting

const T = {
  pythonPop: 0,
  linePythonDjango: 0,
  djangoPop: 0,
  lineDjangoReact: 0,
  reactPop: 0,
  lineReactDeploy: 0,
  deployPop: 0,
  lineAiDeploy: 0,
  aiPop: 0,
};

T.pythonPop = 0;
T.linePythonDjango = T.pythonPop + NODE_POP + BEAT;
T.djangoPop = T.linePythonDjango + LINE_DRAW + BEAT;
T.lineDjangoReact = T.djangoPop + NODE_POP + BEAT;
T.reactPop = T.lineDjangoReact + LINE_DRAW + BEAT;
T.lineReactDeploy = T.reactPop + NODE_POP + BEAT;
T.deployPop = T.lineReactDeploy + LINE_DRAW + BEAT;
// The AI branch waits a beat longer before it starts forming, so it
// reads as a separate, later thought rather than part of the main run.
T.lineAiDeploy = T.deployPop + NODE_POP + BEAT * 2.4;
T.aiPop = T.lineAiDeploy + LINE_DRAW_PENDING + BEAT;

const NODE_DELAY: Record<string, number> = {
  python: T.pythonPop,
  django: T.djangoPop,
  frontend: T.reactPop,
  containers: T.deployPop,
  ai: T.aiPop,
};

const LINE_DELAY: Record<string, number> = {
  "python-django": T.linePythonDjango,
  "django-frontend": T.lineDjangoReact,
  "frontend-containers": T.lineReactDeploy,
  "ai-containers": T.lineAiDeploy,
};

// Once a line has finished drawing, a signal pulse starts riding it on a
// loop - confirmed links get a brighter, faster pulse; the pending AI
// link gets a fainter, slower one, so the idle state keeps telling the
// same story the build-in did.
const PULSE_DELAY: Record<string, number> = {
  "python-django": T.linePythonDjango + LINE_DRAW,
  "django-frontend": T.lineDjangoReact + LINE_DRAW,
  "frontend-containers": T.lineReactDeploy + LINE_DRAW,
  "ai-containers": T.lineAiDeploy + LINE_DRAW_PENDING,
};

const END_OF_BUILD = T.aiPop + NODE_POP;

function linkLength(link: (typeof links)[number]) {
  return Math.hypot(link.to.x - link.from.x, link.to.y - link.from.y);
}

/**
 * Abstract node-and-line map echoing the brand's concentric-ring mark
 * language rather than colorful product logos - a single hairline
 * stroke, one accent tone, no per-node color-coding.
 */
export function HeroDiagram() {
  return (
    <svg
      className="hero-diagram"
      viewBox="0 0 420 400"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Roadmap diagram: Python, Django, React, deployment, and AI, connected as one path"
      style={{ "--hd-build-end": `${END_OF_BUILD}s` } as CSSProperties}
    >
      {links.map((link) => {
        const length = linkLength(link);
        const drawDelay = LINE_DELAY[link.id];
        const pulseDelay = PULSE_DELAY[link.id];
        const pending = "dashed" in link && link.dashed;

        return (
          <g key={link.id}>
            <path
              id={`hd-path-${link.id}`}
              className={pending ? "hd-link hd-link-pending" : "hd-link"}
              d={`M ${link.from.x} ${link.from.y} L ${link.to.x} ${link.to.y}`}
              stroke="var(--text-2)"
              strokeOpacity={pending ? 0.28 : 0.4}
              strokeWidth="1.4"
              fill="none"
              strokeDasharray={pending ? "3 5" : length}
              style={
                {
                  "--hd-len": length,
                  animationDelay: `${drawDelay}s`,
                  animationDuration: pending ? `${LINE_DRAW_PENDING}s` : `${LINE_DRAW}s`,
                } as CSSProperties
              }
            />
            <circle
              className={pending ? "hd-pulse hd-pulse-pending" : "hd-pulse"}
              r={pending ? 2 : 2.4}
              fill="var(--accent-bright)"
              opacity="0"
            >
              <animateMotion
                dur={pending ? "3.6s" : "1.9s"}
                begin={`${pulseDelay}s`}
                repeatCount="indefinite"
                keyPoints="0;1"
                keyTimes="0;1"
                calcMode="linear"
              >
                <mpath href={`#hd-path-${link.id}`} />
              </animateMotion>
              <animate
                attributeName="opacity"
                values={pending ? "0;0.45;0.45;0" : "0;0.9;0.9;0"}
                keyTimes="0;0.15;0.8;1"
                dur={pending ? "3.6s" : "1.9s"}
                begin={`${pulseDelay}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        );
      })}

      {nodes.map((node) => {
        const pending = "pending" in node && node.pending;
        const revealDelay = NODE_DELAY[node.key];

        return (
          <g
            key={node.key}
            className={pending ? "hd-node hd-node-pending" : "hd-node"}
            style={
              {
                transformOrigin: `${node.x}px ${node.y}px`,
                animationDelay: `${revealDelay}s`,
                "--hd-breathe-delay": `${revealDelay + NODE_POP}s`,
              } as CSSProperties
            }
          >
            <circle
              cx={node.x}
              cy={node.y}
              r="30"
              fill="var(--bg-2)"
              stroke="var(--text-2)"
              strokeOpacity={pending ? 0.35 : 0.55}
              strokeWidth="1.4"
              strokeDasharray={pending ? "2 3" : undefined}
            />
            <circle cx={node.x} cy={node.y} r="18" fill="none" stroke="var(--text-2)" strokeOpacity={pending ? 0.18 : 0.3} strokeWidth="1" />
            <circle
              className={pending ? "hd-node-core hd-node-core-pending" : "hd-node-core"}
              cx={node.x}
              cy={node.y - 2}
              r="1.6"
              fill="var(--text)"
              opacity={pending ? 0.5 : 0.85}
            />
            <text
              x={node.x}
              y={node.y + 54}
              textAnchor="middle"
              fontFamily="var(--font-body)"
              fontSize="11"
              letterSpacing="0.08em"
              fill={pending ? "var(--text-3)" : "var(--text-3)"}
              opacity={pending ? 0.7 : 1}
            >
              {node.label.toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
