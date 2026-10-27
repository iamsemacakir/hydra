import { add, easeInOut, lerp, lerp3, mul, seg, type Vec3 } from "./math";
import type { Layout3D } from "./model";
import type { Choreography } from "./render";

/**
 * Camera choreography: where the camera looks and how close it is at each moment of the film.
 * `strength` blends between the plain default framing (0) and the full moves (1), so the looping
 * hero can stay calm while the scroll film is more cinematic.
 */

type Focus = "window" | "bridge" | "hub" | "center" | "failing";
type Key = { u: number; focus: Focus; zoom: number; yaw: number; pitch: number };

const KEYS: readonly Key[] = [
  { u: 0, focus: "window", zoom: 0.62, yaw: 0.14, pitch: -0.08 },
  { u: 0.2, focus: "window", zoom: 0.64, yaw: 0.12, pitch: -0.06 },
  { u: 0.3, focus: "bridge", zoom: 0.8, yaw: 0.06, pitch: 0 },
  { u: 0.42, focus: "hub", zoom: 0.9, yaw: 0, pitch: 0.02 },
  { u: 0.56, focus: "center", zoom: 1, yaw: -0.04, pitch: 0 },
  { u: 0.72, focus: "center", zoom: 1, yaw: -0.12, pitch: 0.03 },
  { u: 0.78, focus: "failing", zoom: 0.62, yaw: 0.14, pitch: -0.1 },
  { u: 0.86, focus: "failing", zoom: 0.74, yaw: 0.04, pitch: -0.04 },
  { u: 0.93, focus: "center", zoom: 0.96, yaw: -0.04, pitch: 0 },
  { u: 1, focus: "center", zoom: 1, yaw: 0, pitch: 0 },
];

function focusPoint(focus: Focus, layout: Layout3D, failing: Vec3): Vec3 {
  const w = layout.window;
  switch (focus) {
    case "window":
      return add(w.origin, add(mul(w.across, 0.5), mul(w.down, 0.5)));
    case "hub":
      return [layout.hub[0], 40, layout.hub[2]];
    case "bridge": {
      const a = add(w.origin, add(mul(w.across, 0.5), mul(w.down, 0.5)));
      return lerp3(a, [layout.hub[0], 40, layout.hub[2]], 0.5);
    }
    case "failing":
      return failing;
    case "center":
    default:
      return layout.target;
  }
}

export function cameraPath(u: number, layout: Layout3D, strength: number, failing: Vec3): Choreography {
  let index = 0;
  for (let i = 0; i < KEYS.length - 1; i++) if (u >= KEYS[i].u) index = i;
  const a = KEYS[index];
  const b = KEYS[Math.min(index + 1, KEYS.length - 1)];
  const t = easeInOut(seg(u, a.u, b.u));

  const target = lerp3(focusPoint(a.focus, layout, failing), focusPoint(b.focus, layout, failing), t);
  const zoomScale = layout.kind === "tall" ? 0.45 : 1;
  const zoom = lerp(a.zoom, b.zoom, t);
  const yaw = lerp(a.yaw, b.yaw, t);
  const pitch = lerp(a.pitch, b.pitch, t);

  return {
    target: lerp3(layout.target, target, layout.kind === "tall" ? strength * 0.4 : strength),
    zoom: 1 + (zoom - 1) * zoomScale * strength,
    yaw: yaw * strength,
    pitch: pitch * strength,
  };
}
