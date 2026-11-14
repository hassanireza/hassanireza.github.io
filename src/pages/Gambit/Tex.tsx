import type { ReactNode } from "react";

/**
 * Tiny typesetter for the formulas in the Gambit library.
 * _{...} becomes a subscript and ^{...} a superscript (they may nest).
 * Any other braces, such as set notation {i}, are kept as literal text.
 */
function parse(src: string, from: number, inGroup: boolean): [ReactNode[], number] {
  const out: ReactNode[] = [];
  let text = "";
  let literal = 0;
  let key = 0;
  let i = from;

  const flush = () => {
    if (text) out.push(text);
    text = "";
  };

  while (i < src.length) {
    const ch = src[i];
    if ((ch === "_" || ch === "^") && src[i + 1] === "{") {
      flush();
      const [children, next] = parse(src, i + 2, true);
      out.push(ch === "_" ? <sub key={key++}>{children}</sub> : <sup key={key++}>{children}</sup>);
      i = next;
    } else if (ch === "{") {
      text += ch;
      literal += 1;
      i += 1;
    } else if (ch === "}") {
      if (literal > 0) {
        text += ch;
        literal -= 1;
        i += 1;
      } else if (inGroup) {
        flush();
        return [out, i + 1];
      } else {
        text += ch;
        i += 1;
      }
    } else {
      text += ch;
      i += 1;
    }
  }
  flush();
  return [out, i];
}

function spoken(src: string): string {
  return src
    .replace(/_\{([^{}]*)\}/g, " sub $1 ")
    .replace(/\^\{([^{}]*)\}/g, " to the $1 ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function Tex({ tex }: { tex: string }) {
  const [nodes] = parse(tex, 0, false);
  return (
    <span className="gb-tex" role="img" aria-label={spoken(tex)}>
      {nodes}
    </span>
  );
}
