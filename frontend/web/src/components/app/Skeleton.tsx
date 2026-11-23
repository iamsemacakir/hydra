import type { CSSProperties } from "react";

/*
 * Loading placeholders in the shape of the content that is coming: the layout shows at once, so the
 * wait feels shorter, and nothing jumps when the data arrives. Hidden from assistive technology; the
 * container that holds them carries aria-busy.
 */

export function SkeletonBar({ width = "100%", height = 14, style }: { width?: number | string; height?: number; style?: CSSProperties }) {
  return <span className="skeleton skeleton-bar" style={{ width, height, ...style }} aria-hidden="true" />;
}

/** Rows like a feed: a pill on the left, a title and a line of detail on the right. */
export function SkeletonFeed({ rows = 4 }: { rows?: number }) {
  return (
    <ol className="feed" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <li className="feed-item" key={i}>
          <SkeletonBar width={72} height={22} style={{ borderRadius: 999 }} />
          <div><SkeletonBar width={`${78 - (i % 3) * 12}%`} height={14} /><SkeletonBar width="38%" height={12} style={{ marginTop: 8 }} /></div>
        </li>
      ))}
    </ol>
  );
}

/** Table rows with the given number of columns. */
export function SkeletonRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <tbody aria-hidden="true">
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="skeleton-row">
          {Array.from({ length: columns }, (_, c) => <td key={c}><SkeletonBar width={c === 0 ? "70%" : `${45 + ((r + c) % 3) * 15}%`} height={14} /></td>)}
        </tr>
      ))}
    </tbody>
  );
}

/** A small tree of node boxes, where the topology will be drawn. */
export function SkeletonGraph() {
  const rows = [[0], [0], [-1, 1], [-2, 0, 2]];
  return (
    <div className="skeleton-graph" aria-hidden="true">
      {rows.map((row, r) => (
        <div className="skeleton-graph-row" key={r}>
          {row.map((slot) => <span className="skeleton skeleton-node" key={slot} style={{ "--slot": slot } as CSSProperties} />)}
        </div>
      ))}
    </div>
  );
}
