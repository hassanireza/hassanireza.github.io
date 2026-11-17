import "./GambitPlay.css";

/** The game lives in its own repo and deploys to its own domain. */
const GAME_URL = "https://theorygambit.github.io";

/** Payoff is the area of a disc, so radius = k * sqrt(payoff). The table is the first game's Feel matrix. */
const K = 5;
const r = (payoff: number): number => +(K * Math.sqrt(payoff)).toFixed(2);

const COL_L = 115;
const COL_R = 205;
const ROW_U = 107;
const ROW_D = 169;

function IconExternal() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="gb-play-ext">
      <path d="M3.2 8.8L8.8 3.2M4.4 3.2h4.4v4.4" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

/** A disc and a ring: you and the other player. The glyph in the button. */
function PairGlyph() {
  return (
    <svg viewBox="0 0 24 12" aria-hidden="true" className="gb-play-pair">
      <circle className="gb-play-pair-you" cx="7" cy="6" r="3.6" fill="currentColor" />
      <circle className="gb-play-pair-them" cx="17" cy="6" r="3.6" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** The call to action under the hero copy. */
export function GambitPlayButton() {
  return (
    <div className="gb-play-cta">
      <a className="gb-play-btn" href={GAME_URL} target="_blank" rel="noopener noreferrer">
        <PairGlyph />
        <span className="gb-play-btn-text">Play Theory Gambit</span>
        <IconExternal />
        <span className="gb-sr"> (opens in a new tab)</span>
      </a>
      <p className="gb-play-note">
        A short game for every entry. <em>Feel it, see it, prove it.</em>
      </p>
    </div>
  );
}

/**
 * Looping promo for the game: the first game's table, played in three beats.
 * Feel: four rounds, each showing what the other row would have paid.
 * See: the same row wins in both columns.
 * Prove: the dominant row is named, whatever they do.
 * The resting (unanimated) state is the finished picture, so reduced motion shows it still.
 */
export function GambitPlayStage() {
  return (
    <a className="gb-play-stage" href={GAME_URL} target="_blank" rel="noopener noreferrer" aria-hidden="true" tabIndex={-1}>
      <svg className="gbp" viewBox="0 0 320 270" role="presentation" focusable="false">
        <defs>
          <radialGradient id="gbp-light" cx="50%" cy="0%" r="90%">
            <stop offset="0" stopColor="#e6e3da" stopOpacity="0.1" />
            <stop offset="1" stopColor="#e6e3da" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="320" height="270" fill="url(#gbp-light)" />

        {/* contour field */}
        <g className="gbp-contours">
          <circle cx="160" cy="138" r="104" />
          <circle cx="160" cy="138" r="134" />
          <circle cx="160" cy="138" r="164" />
          <circle className="gbp-orbit" cx="160" cy="138" r="119" />
        </g>

        {/* title row */}
        <text className="gbp-mono" x="20" y="26">THEORY GAMBIT</text>
        <text className="gbp-mono gbp-play-word" x="300" y="26" textAnchor="end">PLAY &#8599;</text>
        <path className="gbp-hair" d="M20 35.5H300" />

        {/* the other player: a ring above each column */}
        <circle className="gbp-ring gbp-them-l" cx={COL_L} cy="53" r="5.5" />
        <circle className="gbp-ring gbp-them-r" cx={COL_R} cy="53" r="5.5" />
        <text className="gbp-mono" x={COL_L} y="73" textAnchor="middle">LEFT</text>
        <text className="gbp-mono" x={COL_R} y="73" textAnchor="middle">RIGHT</text>
        <text className="gbp-mono" x="60" y="107" textAnchor="end" dominantBaseline="middle">UP</text>
        <text className="gbp-mono gbp-row-down" x="60" y="169" textAnchor="end" dominantBaseline="middle">DOWN</text>

        {/* prove: the dominant row */}
        <rect className="gbp-band" x="70" y="138" width="180" height="62" />

        {/* the table */}
        <g className="gbp-board">
          <path pathLength="1" d="M70 76H250V200H70Z" />
          <path pathLength="1" d="M160 76V200" />
          <path pathLength="1" d="M70 138H250" />
        </g>
        <path className="gbp-bandline" pathLength="1" d="M70 138H250" />
        <path className="gbp-bandline gbp-bandline-2" pathLength="1" d="M70 200H250" />

        {/* feel: what the other row would have paid */}
        <circle className="gbp-alt gbp-alt-bl" cx={COL_L} cy={ROW_D} r={r(6)} />
        <circle className="gbp-alt gbp-alt-br" cx={COL_R} cy={ROW_D} r={r(3)} />

        {/* see: the row that wins in both columns */}
        <circle className="gbp-win gbp-win-bl" cx={COL_L} cy={ROW_D} r={r(6)} />
        <circle className="gbp-win gbp-win-br" cx={COL_R} cy={ROW_D} r={r(3)} />

        {/* you: the tempting row */}
        <circle className="gbp-you gbp-you-tl" cx={COL_L} cy={ROW_U} r={r(5)} />
        <circle className="gbp-you gbp-you-tr" cx={COL_R} cy={ROW_U} r={r(2)} />

        {/* see: the same row wins both times */}
        <g className="gbp-arrows">
          <path className="gbp-arrow gbp-arrow-l" pathLength="1" d="M115 122V150" />
          <path className="gbp-head gbp-head-l" d="M110.5 145.5L115 150.5L119.5 145.5" />
          <path className="gbp-arrow gbp-arrow-r" pathLength="1" d="M205 118V154" />
          <path className="gbp-head gbp-head-r" d="M200.5 149L205 154L209.5 149" />
        </g>

        {/* payoffs sit small in the corner */}
        <g className="gbp-mono gbp-num">
          <text className="gbp-num-tl" x="78" y="90">5</text>
          <text className="gbp-num-tr" x="168" y="90">2</text>
          <text className="gbp-num-bl" x="78" y="152">6</text>
          <text className="gbp-num-br" x="168" y="152">3</text>
        </g>

        {/* one line per beat, taken from the game's own words */}
        <g className="gbp-caps" textAnchor="middle">
          <text className="gbp-cap gbp-cap-1" x="160" y="226">Play four rounds.</text>
          <text className="gbp-cap gbp-cap-2" x="160" y="226">The same row wins both times.</text>
          <text className="gbp-cap gbp-cap-3" x="160" y="226">Best no matter what they do.</text>
        </g>

        {/* the beat bar: Feel, See, Prove */}
        <g className="gbp-bars">
          <path className="gbp-bar-bg" d="M45 245H115M125 245H195M205 245H275" />
          <path className="gbp-bar gbp-bar-1" pathLength="1" d="M45 245H115" />
          <path className="gbp-bar gbp-bar-2" pathLength="1" d="M125 245H195" />
          <path className="gbp-bar gbp-bar-3" pathLength="1" d="M205 245H275" />
        </g>
        <g className="gbp-mono gbp-labs" textAnchor="middle">
          <text className="gbp-lab-1" x="80" y="260">FEEL</text>
          <text className="gbp-lab-2" x="160" y="260">SEE</text>
          <text className="gbp-lab-3" x="240" y="260">PROVE</text>
        </g>
      </svg>
    </a>
  );
}
