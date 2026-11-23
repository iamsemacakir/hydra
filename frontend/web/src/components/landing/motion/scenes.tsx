import { COMPOSE_EXCERPT, INCIDENT_SERVICE, SERVICE_IDS, SERVICE_KIND, summarizeImpact } from "../graph";
import { cssVars } from "../cssVars";
import { Icon } from "../Icon";
import { StateGlyph } from "../StateGlyph";
import { APPEAR_ORDER, DEPENDENCY_COUNT, GEOMETRY, SAMPLE_IMPACT, hopOf, isHotEdge, type GraphKind } from "./geometry";
import styles from "./motion.module.css";

/*
 * The four small scenes of the "How it works" story. Each one is plain HTML or SVG with CSS
 * animations that start when its step becomes active ([data-active="true"] on an ancestor), so
 * they are sharp at any size and cost nothing while hidden.
 */

/* ------------------------------------------------------------------ */
/* 1. Write: the compose file types itself                             */
/* ------------------------------------------------------------------ */

type TokenKind = "key" | "name" | "value" | "punct";
type Line = { indent: number; tokens: ReadonlyArray<{ text: string; kind: TokenKind }> };

function buildLines(): Line[] {
  const lines: Line[] = [{ indent: 0, tokens: [{ text: "services:", kind: "key" }] }];
  for (const row of COMPOSE_EXCERPT) {
    lines.push({ indent: 2, tokens: [{ text: `${row.service}:`, kind: "name" }] });
    const [first, ...rest] = row.dependsOn;
    if (rest.length === 0) {
      lines.push({
        indent: 4,
        tokens: [
          { text: "depends_on: ", kind: "key" },
          { text: "[", kind: "punct" },
          { text: first, kind: "value" },
          { text: "]", kind: "punct" },
        ],
      });
    } else {
      lines.push({
        indent: 4,
        tokens: [
          { text: "depends_on: ", kind: "key" },
          { text: "[", kind: "punct" },
          { text: first, kind: "value" },
          { text: ",", kind: "punct" },
        ],
      });
      lines.push({
        indent: 17,
        tokens: rest.flatMap((value, i) => [
          { text: value, kind: "value" as const },
          { text: i === rest.length - 1 ? "]" : ", ", kind: "punct" as const },
        ]),
      });
    }
  }
  return lines;
}

const LINES = buildLines();
const CHAR_MS = 26;
const LINE_GAP_MS = 110;

/** When each line starts typing, so the file is written one line after another. */
const LINE_TIMING = (() => {
  let at = 300;
  return LINES.map((line) => {
    const chars = line.indent + line.tokens.reduce((sum, token) => sum + token.text.length, 0);
    const start = at;
    at += chars * CHAR_MS + LINE_GAP_MS;
    return { chars, start, duration: chars * CHAR_MS };
  });
})();
const TYPING_DONE_MS = LINE_TIMING[LINE_TIMING.length - 1].start + LINE_TIMING[LINE_TIMING.length - 1].duration;

export function EditorScene() {
  return (
    <div className={styles.editor}>
      <div className={styles.editorHead}>
        <Icon name="file-code" size={15} />
        <span>compose.yaml</span>
        <span className={styles.editorTag}>read-only</span>
      </div>
      <ol className={styles.editorLines}>
        {LINES.map((line, i) => (
          <li key={i} className={styles.editorLine}>
            <span className={styles.lineNo}>{i + 1}</span>
            <span
              className={styles.typed}
              style={cssVars({
                "--chars": LINE_TIMING[i].chars,
                "--start": `${LINE_TIMING[i].start}ms`,
                "--dur": `${LINE_TIMING[i].duration}ms`,
              })}
            >
              {" ".repeat(line.indent)}
              {line.tokens.map((token, j) => (
                <span key={j} data-kind={token.kind}>
                  {token.text}
                </span>
              ))}
            </span>
            {i === LINES.length - 1 && <span className={styles.caret} style={cssVars({ "--start": `${TYPING_DONE_MS}ms` })} />}
          </li>
        ))}
      </ol>
      <p className={styles.sceneNote} style={cssVars({ "--start": `${TYPING_DONE_MS + 200}ms` })}>
        <Icon name="shield-check" size={14} />
        Read as text. Nothing is executed.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Save: review what was found, apply, every row turns "saved"      */
/* ------------------------------------------------------------------ */

export function SaveScene() {
  return (
    <div className={styles.save}>
      <div className={styles.saveHead}>
        <span className={styles.saveTitle}>Scan results</span>
        <span className={styles.saveMeta}>
          {SERVICE_IDS.length} services · {DEPENDENCY_COUNT} dependencies found
        </span>
      </div>
      <ul className={styles.saveList}>
        {APPEAR_ORDER.map((id, i) => (
          <li key={id} className={styles.saveRow} style={cssVars({ "--i": i })}>
            <span className={styles.saveName}>{id}</span>
            <span className={styles.saveKind}>{SERVICE_KIND[id]}</span>
            <span className={styles.flip}>
              <span className={styles.flipFront}>found</span>
              <span className={styles.flipBack}>
                <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
                  <path d="M2.5 6.3 5 8.6l4.6-5.2" />
                </svg>
                saved
              </span>
            </span>
          </li>
        ))}
      </ul>
      <div className={styles.saveFoot}>
        <span className={styles.applyButton}>Apply</span>
        <span className={styles.saveBar}>
          <i />
        </span>
        <span className={styles.saveCount}>
          <b /> / {SERVICE_IDS.length} saved
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3 and 4. The map: it is drawn, then one service fails and recovers  */
/* ------------------------------------------------------------------ */

const CHECK = "M-4.5 0.3 -1.5 3.3 4.5-3.2";
const TRIANGLE = "M0-5 5.4 4.2H-5.4Z";

/** A small status rectangle above a point: "OK", "degraded" or "potentially affected". */
function Badge({ text, tone, y }: { text: string; tone: "ok" | "bad" | "aff"; y: number }) {
  const width = Math.round(text.length * 5.9 + 16);
  return (
    <g transform={`translate(0 ${y})`} className={styles.badge} data-tone={tone}>
      <rect x={-width / 2} y={-9} width={width} height={18} rx={5} />
      <text y={3.4} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}

function Graph({ kind, mode }: { kind: GraphKind; mode: "build" | "incident" }) {
  const g = GEOMETRY[kind];
  const half = g.pill.width / 2;
  const hh = g.pill.height / 2;
  const r = g.radius;
  const point = g.node === "point";
  const badgeY = -r - 15;
  return (
    <svg
      viewBox={`0 0 ${g.width} ${g.height}`}
      className={`${styles.graph} ${kind === "wide" ? styles.graphWide : styles.graphTall}`}
      data-mode={mode}
    >
      {g.edges.map((edge) => (
        <g key={edge.key} className={styles.edge} style={cssVars({ "--len": edge.length, "--i": APPEAR_ORDER.indexOf(edge.to) })}>
          <path className={styles.edgeLine} d={edge.d} />
          <path className={styles.edgeArrow} d={edge.arrow} />
        </g>
      ))}
      {mode === "incident" &&
        g.edges.filter(isHotEdge).map((edge) => (
          <path key={`hot-${edge.key}`} className={styles.hotLine} d={edge.back} data-hop={hopOf(edge.to)} style={cssVars({ "--len": edge.length })} />
        ))}
      {APPEAR_ORDER.map((id, i) => {
        const [x, y] = g.position[id];
        const hop = hopOf(id);
        const state = id === INCIDENT_SERVICE ? "failing" : hop !== undefined ? "affected" : "fine";
        const glyphAt = point ? "translate(0 0)" : `translate(${-half + 15} 0)`;
        return (
          <g key={id} className={styles.node} data-state={state} data-hop={hop} style={cssVars({ "--i": i })}>
            <g transform={`translate(${x} ${y})`}>
              <g className={styles.nodeBody}>
                {point ? (
                  <>
                    <circle className={styles.nodeRing} r={r + 9} />
                    <circle className={styles.nodePill} r={r} />
                  </>
                ) : (
                  <>
                    <rect className={styles.nodeRing} x={-half - 8} y={-hh - 8} width={g.pill.width + 16} height={g.pill.height + 16} rx={hh + 8} />
                    <rect className={styles.nodePill} x={-half} y={-hh} width={g.pill.width} height={g.pill.height} rx={hh} />
                  </>
                )}
                <g transform={glyphAt}>
                  <circle className={styles.gWait} r="4" />
                  <path className={styles.gOk} d={CHECK} />
                  <path className={styles.gBad} d={TRIANGLE} />
                  <path className={styles.gAff} d={TRIANGLE} />
                </g>
                <text
                  className={styles.nodeName}
                  x={point ? 0 : -half + 27}
                  y={point ? r + 17 : g.font * 0.36}
                  fontSize={g.font}
                  textAnchor={point ? "middle" : "start"}
                >
                  {id}
                </text>
              </g>
              {point && (
                <g className={styles.badges}>
                  <g className={styles.bOk}>
                    <Badge text="OK" tone="ok" y={badgeY} />
                  </g>
                  {mode === "incident" && state === "failing" && (
                    <g className={styles.bBad}>
                      <Badge text="degraded" tone="bad" y={badgeY} />
                    </g>
                  )}
                  {mode === "incident" && state === "affected" && (
                    <g className={styles.bAff}>
                      <Badge text="potentially affected" tone="aff" y={badgeY} />
                    </g>
                  )}
                </g>
              )}
            </g>
          </g>
        );
      })}
    </svg>
  );
}

export function MapScene() {
  return (
    <div className={styles.mapScene}>
      <div className={styles.graphBox}>
        <Graph kind="wide" mode="build" />
        <Graph kind="tall" mode="build" />
      </div>
      <p className={styles.mapCaption}>
        <StateGlyph kind="healthy" />
        {SERVICE_IDS.length} services saved and linked. All OK.
      </p>
    </div>
  );
}

export function IncidentScene() {
  return (
    <div className={styles.mapScene}>
      <div className={styles.graphBox}>
        <Graph kind="wide" mode="incident" />
        <Graph kind="tall" mode="incident" />
      </div>
      <div className={styles.incidentCaption}>
        <p data-phase="bad">
          <StateGlyph kind="degraded" />
          {INCIDENT_SERVICE} degraded. {summarizeImpact(SAMPLE_IMPACT)}
        </p>
        <p data-phase="ok">
          <StateGlyph kind="healthy" />
          {INCIDENT_SERVICE} recovered. Every service is OK again.
        </p>
      </div>
    </div>
  );
}
