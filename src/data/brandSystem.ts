import type {
  PaletteToken,
  TypeRole,
  SpacingToken,
  PrincipleEntry,
  MotionToken,
  ComponentSpec,
  DisciplineEntry,
  Manifesto,
  LogoMark,
  ClearSpaceRule,
  MaterialGroup,
  ApplicationSpec,
} from "../types/brand";

export class BrandSystemModel {
  private constructor() {
  }

  static readonly identity = {
    name: "Abyssal Liturgy",
    tagline: "A ceremonial identity system for the edge of restraint and motion.",
    premise:
      "Every surface is quiet by default. Nothing shouts, nothing decorates for its own sake. The interface is reclaimed slowly by negative space, the same way these projects are built one deliberate layer at a time.",
  };

  static readonly manifesto: Manifesto = {
    lead:
      "Every surface is a procession, not a performance. Nothing is added for decoration; nothing is lit that doesn't need to be seen. What's built here is meant to be discovered slowly, the same way these skills were, one deliberate layer at a time.",
    support: [
      {
        label: "Register",
        body: "Editorial restraint over decoration. Engineering discipline over ornament. Never fantasy, never noise.",
      },
      {
        label: "Emotional key",
        body: "Quiet, deliberate, unhurried. A held breath rather than a pitch.",
      },
      {
        label: "Governing rule",
        body: "One light source per surface. Everything else is allowed to stay dark.",
      },
    ],
  };

  static readonly palette: PaletteToken[] = [
    { name: "Void", hex: "#08090b", usage: "Primary background across every page." },
    { name: "Charcoal", hex: "#0d1013", usage: "Secondary background, layered panels." },
    { name: "Deep Charcoal", hex: "#12161a", usage: "Tertiary depth, nested surfaces." },
    { name: "Bone", hex: "#e6e3da", usage: "Primary text, headline weight, the only true highlight." },
    { name: "Fog", hex: "#9aa3a8", usage: "Secondary text, supporting copy." },
    { name: "Ash", hex: "#565f64", usage: "Tertiary text, labels, eyebrows, timestamps." },
    { name: "Oxidized Silver", hex: "#7c8891", usage: "Accent, hover states, active links." },
    { name: "Bright Silver", hex: "#c9cfd2", usage: "Accent peak, rare emphasis only." },
  ];

  static readonly typography: TypeRole[] = [
    {
      role: "Display",
      meta: "Cormorant Garamond · Italic · Weight 300",
      sample: "code meets motion",
      variant: "display",
    },
    {
      role: "Body",
      meta: "Jost · Weight 200 to 400",
      sample:
        "Interfaces should read like restrained editorial copy. Quiet weight, generous line height, no visible strain.",
      variant: "body",
    },
    {
      role: "Utility",
      meta: "JetBrains Mono · Weight 300 to 500",
      sample: "FIELD NOTES · VOL. 001 · NO FILL LIGHT",
      variant: "mono",
    },
  ];

  static readonly logoMarks: LogoMark[] = [
    {
      key: "tidal-halo",
      name: "Tidal Halo · Primary Mark",
      usage: "Default lockup. Nav mark, footer seal, favicon at 32px and above.",
    },
    {
      key: "erosion-map",
      name: "Erosion Map",
      usage: "Section dividers and loading states, used at reduced opacity.",
    },
    {
      key: "reliquary-drop",
      name: "Reliquary Drop",
      usage: "Single-use accent on the CV, certificates, and print collateral.",
    },
    {
      key: "chart-mark",
      name: "Chart Mark · Monogram",
      usage: "16px and below only. Browser tab icon, social avatar.",
    },
  ];

  static readonly clearSpaceRules: ClearSpaceRule[] = [
    { label: "Minimum clear space", value: "Equal to the mark's own height, on all sides." },
    { label: "Minimum digital size", value: "16px height, using the Chart Mark monogram only." },
    { label: "Minimum print size", value: "10mm height." },
    { label: "Backgrounds", value: "Void, Charcoal, or Bone only. Never a busy photograph." },
  ];

  static readonly spacingScale: SpacingToken[] = [
    { label: "4", value: "0.25rem" },
    { label: "8", value: "0.5rem" },
    { label: "16", value: "1rem" },
    { label: "24", value: "1.5rem" },
    { label: "32", value: "2rem" },
    { label: "48", value: "3rem" },
    { label: "80", value: "5rem" },
    { label: "120", value: "7.5rem" },
  ];

  static readonly principles: PrincipleEntry[] = [
    {
      title: "One light source",
      body: "Every hero and panel carries a single soft radial highlight. Never a second fill, never a competing glow.",
    },
    {
      title: "Blacks stay black",
      body: "Negative space is left unreadable on purpose. Shadows are not lifted in post or in CSS.",
    },
    {
      title: "Texture over color",
      body: "Grain, hairline borders, and blur transitions carry the atmosphere instead of saturated color.",
    },
    {
      title: "Motion is a whisper",
      body: "Reveals are slow and critically damped. Nothing bounces, nothing snaps into place.",
    },
  ];

  static readonly motion: MotionToken[] = [
    { name: "Liturgy Ease", curve: "cubic-bezier(0.16, 0.4, 0.15, 1)", usage: "Hero reveals, page headers, identity blocks." },
    { name: "Standard Ease", curve: "cubic-bezier(0.25, 0.1, 0.25, 1)", usage: "Hover states, card lifts, link transitions." },
    { name: "Out Ease", curve: "cubic-bezier(0, 0, 0.2, 1)", usage: "Staggered link and label entrances." },
  ];

  static readonly materials: MaterialGroup[] = [
    {
      label: "Imagery language",
      items: [
        "single soft light source",
        "wet specular highlight",
        "coarse film grain",
        "negative space dominant",
        "off-center composition",
        "near-monochrome palette",
      ],
    },
    {
      label: "Surface references",
      items: [
        "waxed leather",
        "brushed charcoal metal",
        "wet slate",
        "matte glass",
        "raw linen",
        "oxidized silver",
      ],
    },
    {
      label: "Never use",
      items: [
        "saturated color",
        "neon",
        "warm skin tones",
        "flat even lighting",
        "cheerful expression",
        "glossy 3D render",
      ],
    },
  ];

  static readonly applications: ApplicationSpec[] = [
    {
      key: "social",
      label: "Social Post",
      detail: "Single-line italic caption, lower third, bone on void, mono handle beneath.",
    },
    {
      key: "web",
      label: "Web Hero",
      detail: "Hairline frame, mono nav labels, one italic display word as the anchor.",
    },
    {
      key: "print",
      label: "Print / CV Seal",
      detail: "Tidal Halo mark, centered, on Bone ground, no color, no drop shadow.",
    },
  ];

  static readonly components: ComponentSpec[] = [
    { name: "Nav Link", description: "Hairline border on hover, bone text, arrow icon shifts on hover, never filled by default." },
    { name: "Primary Button", description: "Dim accent fill at rest, brightens to full accent and inverts text color on hover." },
    { name: "Form Field", description: "Surface fill with hairline border, brightens border and gains a warm tint on focus." },
    { name: "Info Card", description: "Zero radius or near zero, joined by one pixel hairline seams rather than gaps." },
  ];

  static readonly discipline: DisciplineEntry = {
    hold: [
      "Let most of the frame stay unreadable void",
      "Single accent color, used sparingly and consistently",
      "Serif italic display paired with quiet sans body copy",
      "Slow, critically damped reveals on every route change",
      "Full clear space around the Tidal Halo mark, every time",
    ],
    avoid: [
      "A second competing light source or accent color",
      "Saturated, neon, or warm skin toned palettes",
      "Sharp, bouncy, or elastic motion curves",
      "Dense, high contrast blocks of decoration",
      "Recoloring, skewing, or adding effects to the mark",
    ],
  };
}
