import type { ReactNode } from "react";

/**
 * Typesets a small subset of TeX-style markup without a math library:
 * _{...} becomes a subscript and ^{...} a superscript (they may nest, so
 * "u^{n+1}" and "x_{i^{2}}" both work). Everything else is plain text, so
 * symbols like the nabla and Delta are written directly.
 */
function parse(src: string, from = 0): [ReactNode[], number] {
  const out: ReactNode[] = [];
  let text = "";
  let i = from;
  let key = 0;
  const flush = () => {
    if (text) out.push(text);
    text = "";
  };
  while (i < src.length) {
    const ch = src[i];
    if ((ch === "_" || ch === "^") && src[i + 1] === "{") {
      flush();
      const [children, next] = parse(src, i + 2);
      out.push(ch === "_" ? <sub key={key++}>{children}</sub> : <sup key={key++}>{children}</sup>);
      i = next;
    } else if (ch === "}") {
      flush();
      return [out, i + 1];
    } else {
      text += ch;
      i += 1;
    }
  }
  flush();
  return [out, i];
}

/** Spoken form for screen readers. */
function spoken(src: string): string {
  return src
    .replace(/_\{([^}]*)\}/g, " sub $1 ")
    .replace(/\^\{([^}]*)\}/g, " to the $1 ")
    .replace(/\u2207/g, "nabla ")
    .replace(/\u0394/g, "delta ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function MathText({ tex }: { tex: string }) {
  const [nodes] = parse(tex);
  return (
    <span className="math" role="img" aria-label={spoken(tex)}>
      {nodes}
    </span>
  );
}
