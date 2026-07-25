interface TypeSpecimenRow {
  role: string;
  meta: string;
  sample: string;
  variant: "display" | "body" | "mono";
}

/**
 * Plain HTML type specimen, deliberately not SVG.
 *
 * The previous version baked the specimen into an SVG viewBox, which
 * scaled every label as a single rigid unit: shrink the container and
 * the captions shrank correctly, but on several real viewport widths
 * the browser's SVG text layout stopped agreeing with the intended
 * font-size entirely, and captions like "DISPLAY 56PX" rendered far
 * larger than the copy around them. Real text, sized with clamp() like
 * everything else on the page, cannot drift out of proportion that way.
 */
export function TypeSpecimen({ rows }: { rows: TypeSpecimenRow[] }) {
  return (
    <div className="type-specimen">
      {rows.map((row) => (
        <div className="ts-row" key={row.role}>
          <span className={`ts-glyph ts-glyph-${row.variant}`}>Aa</span>
          <div className="ts-info">
            <span className="ts-role">{row.role}</span>
            <span className="ts-meta">{row.meta}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
