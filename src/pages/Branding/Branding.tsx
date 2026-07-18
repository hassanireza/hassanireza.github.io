import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { BrandSystemModel } from "../../data/brandSystem";
import { useReveal } from "../../hooks/useReveal";
import SectionNav, { type SectionNavItem } from "../../components/SectionNav/SectionNav";
import { RevealSection } from "./RevealSection";
import { ScrambleIn } from "./ScrambleIn";
import { TypeSpecimen } from "./diagrams/TypeSpecimen";
import { MotionDemo } from "./diagrams/MotionDemo";
import ArrowIcon from "./diagrams/ArrowIcon";
import { SingleLightIcon, BlackVoidIcon, TextureIcon, MotionWhisperIcon } from "./diagrams/PrincipleIcons";
import { HoldIcon, NeverIcon } from "./diagrams/DisciplineIcons";
import { LOGO_MARK_COMPONENTS } from "./diagrams/LogoMarkIcons";
import "./Branding.css";

const PRINCIPLE_ICONS = [
  <SingleLightIcon key="light" />,
  <BlackVoidIcon key="void" />,
  <TextureIcon key="texture" />,
  <MotionWhisperIcon key="motion" />,
];

const NAV_ITEMS: SectionNavItem[] = [
  { id: "manifesto", label: "Manifesto", icon: "layout" },
  { id: "palette", label: "Palette", icon: "layout" },
  { id: "typography", label: "Type", icon: "layout" },
  { id: "marks", label: "Marks", icon: "code" },
  { id: "motion", label: "Motion", icon: "play" },
  { id: "discipline", label: "Discipline", icon: "code" },
];

// Largest spacing token defines 100% of the ruler's available height;
// every other bar is sized relative to it so the row reads as one
// continuous scale rather than a loose row of mismatched sticks.
const SPACING_MAX_PX = 148;
const SPACING_MIN_PX = 6;

function spacingBarHeight(value: string, maxValue: number) {
  const rem = parseFloat(value);
  const ratio = rem / maxValue;
  return Math.round(SPACING_MIN_PX + ratio * (SPACING_MAX_PX - SPACING_MIN_PX));
}

function CopySwatch({ name, hex, usage }: { name: string; hex: string; usage: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard access can be denied; the swatch still shows the hex value.
    }
  }

  return (
    <button type="button" className="swatch" onClick={handleCopy}>
      <span className="chip" style={{ background: hex }} />
      <span className="swatch-name">{name}</span>
      <span className="swatch-hex">{copied ? "Copied" : hex}</span>
      <span className="swatch-use">{usage}</span>
    </button>
  );
}

export default function Branding() {
  const hero = useReveal<HTMLElement>(0.1);
  const maxSpacing = Math.max(...BrandSystemModel.spacingScale.map((t) => parseFloat(t.value)));

  return (
    <div className="container brand-container">
      <Link to="/" className="back-link">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M13 7.25a.75.75 0 0 1 0 1.5H4.56l3.72 3.72a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L4.56 7.25H13z" />
        </svg>
        Back to Home
      </Link>

      <SectionNav items={NAV_ITEMS} />

      <header className={`brand-header${hero.visible ? " in-view" : ""}`} ref={hero.ref}>
        <div className="brand-header-copy">
          <p className="eyebrow">Brand &amp; Design System</p>
          <h1>
            <em>{BrandSystemModel.identity.name}</em>
          </h1>
          <h2>{BrandSystemModel.identity.tagline}</h2>
          <p className="brand-header-premise">{BrandSystemModel.identity.premise}</p>
          <div className="brand-header-stats">
            <div>
              <strong>{BrandSystemModel.palette.length}</strong>
              <span>Palette tokens</span>
            </div>
            <div>
              <strong>{BrandSystemModel.typography.length}</strong>
              <span>Type roles</span>
            </div>
            <div>
              <strong>{BrandSystemModel.logoMarks.length}</strong>
              <span>Marks</span>
            </div>
            <div>
              <strong>{BrandSystemModel.motion.length}</strong>
              <span>Motion curves</span>
            </div>
          </div>
        </div>

        <div className="brand-header-mark" aria-hidden="true">
          <div className="brand-header-mark-ring brand-header-mark-ring-outer" />
          <div className="brand-header-mark-ring brand-header-mark-ring-inner" />
          {LOGO_MARK_COMPONENTS["tidal-halo"]({ size: 128 })}
        </div>
      </header>

      <RevealSection id="manifesto" idx="01" title="Manifesto">
        <p className="manifesto-lead">
          <ScrambleIn text={BrandSystemModel.manifesto.lead} active={hero.visible} durationMs={1100} />
        </p>
        <div className="manifesto-support stagger">
          {BrandSystemModel.manifesto.support.map((entry) => (
            <div key={entry.label}>
              <strong>{entry.label}</strong>
              <span>{entry.body}</span>
            </div>
          ))}
        </div>
      </RevealSection>

      <RevealSection id="palette" idx="02" title="Palette">
        <p className="section-intro">
          Eight tokens, three backgrounds, three text weights, two accents. Nothing else is added
          to a page without first checking whether one of these already does the job. Tap a swatch
          to copy its hex value.
        </p>
        <div className="palette-grid stagger">
          {BrandSystemModel.palette.map((token) => (
            <CopySwatch key={token.hex} name={token.name} hex={token.hex} usage={token.usage} />
          ))}
        </div>
      </RevealSection>

      <RevealSection id="typography" idx="03" title="Typography">
        <TypeSpecimen rows={BrandSystemModel.typography} />
        <div className="type-list">
          {BrandSystemModel.typography.map((role) => (
            <div className="type-block" key={role.role}>
              <div className="type-role">
                <span className="rolelabel">{role.role}</span>
                <span className="meta">{role.meta}</span>
              </div>
              <p className={`type-sample type-${role.variant}`}>{role.sample}</p>
            </div>
          ))}
        </div>
      </RevealSection>

      <RevealSection id="marks" idx="04" title="Logo &amp; Mark System">
        <div className="mark-grid stagger">
          {BrandSystemModel.logoMarks.map((mark) => {
            const MarkComponent = LOGO_MARK_COMPONENTS[mark.key];
            return (
              <div className="mark-cell" key={mark.key}>
                <div className="mark-stage">
                  <MarkComponent size={64} />
                </div>
                <strong>{mark.name}</strong>
                <span>{mark.usage}</span>
              </div>
            );
          })}
          <div className="mark-cell mark-cell-inverse">
            <div className="mark-stage mark-stage-bone">
              <div className="mark-on-bone">{LOGO_MARK_COMPONENTS["tidal-halo"]({ size: 64 })}</div>
            </div>
            <strong>On Bone Ground</strong>
            <span>Reversed lockup for print, light-mode surfaces, and the CV seal.</span>
          </div>
        </div>
        <div className="clear-space-grid stagger">
          {BrandSystemModel.clearSpaceRules.map((rule) => (
            <div className="clear-space-item" key={rule.label}>
              <span className="cs-label">{rule.label}</span>
              <span className="cs-value">{rule.value}</span>
            </div>
          ))}
        </div>
      </RevealSection>

      <RevealSection id="spacing" idx="05" title="Spacing Scale">
        <p className="section-intro">
          One scale, reused everywhere: gutters, section rhythm, and component padding all read
          off the same eight steps.
        </p>
        <div className="scale-row">
          {BrandSystemModel.spacingScale.map((token, i) => (
            <div
              className="scale-item"
              key={token.label}
              style={{ "--bar-h": `${spacingBarHeight(token.value, maxSpacing)}px`, "--bar-delay": `${i * 0.06}s` } as CSSProperties}
            >
              <span className="scale-value">{token.value.replace("rem", "")}rem</span>
              <div className="spacing-bar" />
              <span className="lbl">{token.label}</span>
            </div>
          ))}
        </div>
      </RevealSection>

      <RevealSection id="principles" idx="06" title="Principles">
        <div className="principle-grid stagger">
          {BrandSystemModel.principles.map((entry, i) => (
            <div className="principle-card" key={entry.title}>
              <div className="principle-icon">{PRINCIPLE_ICONS[i]}</div>
              <strong>{entry.title}</strong>
              <span>{entry.body}</span>
            </div>
          ))}
        </div>
      </RevealSection>

      <RevealSection id="motion" idx="07" title="Motion">
        <p className="section-intro">
          Each curve doing its actual job, not a plot of it. Press Replay to compare them side by
          side.
        </p>
        <div className="motion-demo-list">
          {BrandSystemModel.motion.map((token) => (
            <MotionDemo key={token.name} name={token.name} curve={token.curve} usage={token.usage} />
          ))}
        </div>
      </RevealSection>

      <RevealSection id="materials" idx="08" title="Imagery &amp; Material Language">
        <p className="section-intro">
          The reference vocabulary used to keep generated illustrations, photography, and social
          assets on brand: the same tags used to prompt new artwork for this identity.
        </p>
        <div className="materials-grid">
          {BrandSystemModel.materials.map((group) => (
            <div className="materials-group" key={group.label}>
              <span className="materials-label">{group.label}</span>
              <div className="chip-cloud">
                {group.items.map((item) => (
                  <span key={item} className={group.label === "Never use" ? "chip-negative" : ""}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </RevealSection>

      <RevealSection id="components" idx="09" title="Components">
        <div className="component-grid stagger">
          <div className="component-card">
            <div className="component-stage">
              <a href="#demo" className="demo-nav-link" onClick={(e) => e.preventDefault()}>
                Field Notes <ArrowIcon />
              </a>
            </div>
            <strong>Nav Link</strong>
            <span>{BrandSystemModel.components[0].description}</span>
          </div>

          <div className="component-card">
            <div className="component-stage">
              <button className="demo-btn" type="button">
                Enter the Archive
              </button>
            </div>
            <strong>Primary Button</strong>
            <span>{BrandSystemModel.components[1].description}</span>
          </div>

          <div className="component-card">
            <div className="component-stage">
              <input className="demo-field" placeholder="you@domain.com" />
            </div>
            <strong>Form Field</strong>
            <span>{BrandSystemModel.components[2].description}</span>
          </div>

          <div className="component-card">
            <div className="component-stage">
              <div className="demo-info-card">
                <div className="demo-info-cell">01</div>
                <div className="demo-info-cell">02</div>
                <div className="demo-info-cell">03</div>
              </div>
            </div>
            <strong>Info Card</strong>
            <span>{BrandSystemModel.components[3].description}</span>
          </div>
        </div>
      </RevealSection>

      <RevealSection id="applications" idx="10" title="Applications">
        <div className="app-grid stagger">
          <div className="app-card">
            <div className="app-visual app-visual-social">
              <span className="app-word">no clear ending</span>
              <span className="app-tag">@reza.hassani &middot; field notes</span>
            </div>
            <div className="app-caption">
              <strong>{BrandSystemModel.applications[0].label}</strong>
              <span>{BrandSystemModel.applications[0].detail}</span>
            </div>
          </div>

          <div className="app-card">
            <div className="app-visual app-visual-web">
              <div className="app-navline">
                <span>REZA HASSANI</span>
                <span>MENU</span>
              </div>
              <span className="app-heroword">the descent</span>
              <div className="app-navline">
                <span>SCROLL</span>
                <span>VOL. I</span>
              </div>
            </div>
            <div className="app-caption">
              <strong>{BrandSystemModel.applications[1].label}</strong>
              <span>{BrandSystemModel.applications[1].detail}</span>
            </div>
          </div>

          <div className="app-card">
            <div className="app-visual app-visual-print">
              <div className="app-seal">{LOGO_MARK_COMPONENTS["tidal-halo"]({ size: 44 })}</div>
            </div>
            <div className="app-caption">
              <strong>{BrandSystemModel.applications[2].label}</strong>
              <span>{BrandSystemModel.applications[2].detail}</span>
            </div>
          </div>
        </div>
      </RevealSection>

      <RevealSection id="discipline" idx="11" title="Discipline">
        <div className="dodont">
          <div className="col do">
            <h4>Hold the line</h4>
            <ul className="stagger">
              {BrandSystemModel.discipline.hold.map((item) => (
                <li key={item}>
                  <HoldIcon /> <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="col dont">
            <h4>Never allow</h4>
            <ul className="stagger">
              {BrandSystemModel.discipline.avoid.map((item) => (
                <li key={item}>
                  <NeverIcon /> <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </RevealSection>

      <footer className="page-footer">
        <Link to="/" className="back-link">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13 7.25a.75.75 0 0 1 0 1.5H4.56l3.72 3.72a.75.75 0 1 1-1.06 1.06l-5-5a.75.75 0 0 1 0-1.06l5-5a.75.75 0 1 1 1.06 1.06L4.56 7.25H13z" />
          </svg>
          Back to Home
        </Link>
      </footer>
    </div>
  );
}
