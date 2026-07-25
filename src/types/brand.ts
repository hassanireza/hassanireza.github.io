export interface PaletteToken {
  name: string;
  hex: string;
  usage: string;
}

export interface TypeRole {
  role: string;
  meta: string;
  sample: string;
  variant: "display" | "body" | "mono";
}

export interface SpacingToken {
  label: string;
  value: string;
}

export interface PrincipleEntry {
  title: string;
  body: string;
}

export interface MotionToken {
  name: string;
  curve: string;
  usage: string;
}

export interface ComponentSpec {
  name: string;
  description: string;
}

export interface DisciplineEntry {
  hold: string[];
  avoid: string[];
}

export interface ManifestoSupport {
  label: string;
  body: string;
}

export interface Manifesto {
  lead: string;
  support: ManifestoSupport[];
}

export interface LogoMark {
  key: string;
  name: string;
  usage: string;
}

export interface ClearSpaceRule {
  label: string;
  value: string;
}

export interface MaterialGroup {
  label: string;
  items: string[];
}

export interface ApplicationSpec {
  key: string;
  label: string;
  detail: string;
}
