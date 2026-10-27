import { DEPENDENCIES, SERVICE_IDS, type ServiceId } from "../graph";
import { fitDistance, makeCamera, project, type Camera, type Projected } from "./camera";
import {
  add,
  clamp,
  clamp01,
  dot,
  easeInOut,
  lerp,
  lerp3,
  mixRgb,
  mul,
  rgba,
  seeded,
  seg,
  sub,
  type Rgb,
  type Vec3,
} from "./math";
import { CODE_LINES, TOTAL_CHARS, layout3d, type CodeKind, type FilmLayout, type Layout3D, type NodeTimeline, type Timeline } from "./model";

/**
 * Canvas renderer for the film. It draws one frame from a Timeline using real perspective
 * projection: a grid floor, extruded service slabs, glowing dependency lines, light packets,
 * the code window as a plane in the same world, and a small heads-up display.
 * It decides nothing about the story; that is the timeline's job.
 */

export type FilmFonts = { sans: string; mono: string };
export type View = { yaw: number; pitch: number };
export type Choreography = { target: Vec3; zoom: number; yaw: number; pitch: number };
export type Pointer = { x: number; y: number; active: boolean };
export type Quality = "full" | "lite";

export type FrameInput = {
  timeline: Timeline;
  time: number;
  view: View;
  choreography: Choreography;
  pointer: Pointer;
  hover: ServiceId | null;
  quality: Quality;
  /** 1 = fully visible; used to fade the loop out and back in. */
  fade: number;
};

export type FilmRenderer = {
  resize(width: number, height: number, dpr: number): void;
  draw(frame: FrameInput): void;
  hitTest(x: number, y: number): ServiceId | null;
  layoutKind(): FilmLayout;
  /** Camera defaults for the current layout. */
  layout(): Layout3D;
};

/* Palette. The stage is always dark, whatever theme the page uses. */
const INK: Rgb = [233, 238, 247];
const DIM: Rgb = [128, 140, 162];
const CYAN: Rgb = [124, 196, 255];
const GREEN: Rgb = [61, 220, 151];
const RED: Rgb = [255, 77, 94];
const SLAB_TOP: Rgb = [28, 41, 66];
const SLAB_SIDE: Rgb = [13, 21, 36];
const TOP_SAVED: Rgb = [22, 62, 58];
const SIDE_SAVED: Rgb = [10, 32, 30];
const TOP_BAD: Rgb = [96, 24, 38];
const SIDE_BAD: Rgb = [48, 12, 22];
const LIGHT_DIR: Vec3 = [-0.42, 0.8, -0.44];
const GRID: Rgb = [110, 150, 215];

const PANEL_W = 520;
const PANEL_H = 360;
const CODE_FONT_PX = 14;
const CODE_LINE_H = 23;
const CODE_TOP = 62;

type Hit = { id: ServiceId; x0: number; y0: number; x1: number; y1: number; depth: number };
type Dust = { x: number; y: number; z: number; speed: number; glyph: string | null; phase: number };
type EdgeGeometry = { key: string; from: ServiceId; to: ServiceId; points: Vec3[] };

const GLYPHS = ["0", "1", "{", "}", "/", ";", "<", ">", "=", ":"];

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function makeGlow(color: Rgb): HTMLCanvasElement {
  const size = 96;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const g = sprite.getContext("2d");
  if (!g) return sprite;
  const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, rgba(color, 1));
  gradient.addColorStop(0.25, rgba(color, 0.42));
  gradient.addColorStop(0.6, rgba(color, 0.1));
  gradient.addColorStop(1, rgba(color, 0));
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  return sprite;
}

type GlyphKind = "unknown" | "saved" | "degraded" | "affected";

/** Status shapes, so state never depends on colour alone. */
function drawGlyph(ctx: CanvasRenderingContext2D, kind: GlyphKind, x: number, y: number, size: number, color: Rgb) {
  const r = size / 2;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([]);
  ctx.strokeStyle = rgba(color, 1);
  ctx.fillStyle = rgba(color, 1);
  ctx.beginPath();
  if (kind === "unknown" || kind === "saved") {
    ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
  } else {
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 1.05, y + r * 0.8);
    ctx.lineTo(x - r * 1.05, y + r * 0.8);
    ctx.closePath();
  }
  if (kind === "saved" || kind === "degraded") ctx.fill();
  else ctx.stroke();
}

export function createRenderer(canvas: HTMLCanvasElement, fonts: FilmFonts): FilmRenderer | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const g: CanvasRenderingContext2D = ctx;

  // measureText is slow and the same few strings are measured every frame; remember the widths.
  const widths = new Map<string, number>();
  function textWidth(text: string): number {
    const key = `${g.font}|${text}`;
    let width = widths.get(key);
    if (width === undefined) {
      width = g.measureText(text).width;
      // Font sizes change with the camera, so the cache must not grow without bound.
      if (widths.size > 500) widths.clear();
      widths.set(key, width);
    }
    return width;
  }

  let width = 1;
  let height = 1;
  let dpr = 1;
  let kind: FilmLayout = "wide";
  let L: Layout3D = layout3d(kind);
  let hits: Hit[] = [];
  let edgeGeometry: EdgeGeometry[] = [];

  const glow = { cyan: makeGlow(CYAN), green: makeGlow(GREEN), red: makeGlow(RED), white: makeGlow([255, 255, 255]) };

  const random = seeded(7);
  const dust: Dust[] = Array.from({ length: 90 }, (_, i) => ({
    x: random(),
    y: random(),
    z: 0.2 + random() * 0.8,
    speed: 0.004 + random() * 0.012,
    glyph: i % 6 === 0 ? GLYPHS[Math.floor(random() * GLYPHS.length)] : null,
    phase: random() * Math.PI * 2,
  }));

  /* ---------- geometry that only depends on the layout ---------- */

  function halfExtent(ux: number, uz: number): number {
    const ax = Math.abs(ux) < 1e-6 ? Infinity : L.slab.w / 2 / Math.abs(ux);
    const az = Math.abs(uz) < 1e-6 ? Infinity : L.slab.d / 2 / Math.abs(uz);
    return Math.min(ax, az);
  }

  function buildEdges(): EdgeGeometry[] {
    return DEPENDENCIES.map(([from, to]) => {
      const [ax, az] = L.nodes[from];
      const [bx, bz] = L.nodes[to];
      const len = Math.hypot(bx - ax, bz - az) || 1;
      const ux = (bx - ax) / len;
      const uz = (bz - az) / len;
      const h = halfExtent(ux, uz) + 9;
      const sx = ax + ux * h;
      const sz = az + uz * h;
      const ex = bx - ux * h;
      const ez = bz - uz * h;
      const points: Vec3[] = [];
      const steps = 32;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const mt = 1 - t;
        let c1x: number, c1z: number, c2x: number, c2z: number;
        if (L.flowAxis === "x") {
          const mid = (sx + ex) / 2;
          [c1x, c1z, c2x, c2z] = [mid, sz, mid, ez];
        } else {
          const mid = (sz + ez) / 2;
          [c1x, c1z, c2x, c2z] = [sx, mid, ex, mid];
        }
        const x = mt ** 3 * sx + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t ** 3 * ex;
        const z = mt ** 3 * sz + 3 * mt * mt * t * c1z + 3 * mt * t * t * c2z + t ** 3 * ez;
        points.push([x, 1.5, z]);
      }
      return { key: `${from}>${to}`, from, to, points };
    });
  }

  /* ---------- small helpers bound to the current frame ---------- */

  let cam: Camera;
  let refScale = 1;

  const pr = (p: Vec3) => project(cam, p);

  function unprojectToFloor(px: number, py: number): Vec3 | null {
    const dx = (px - cam.cx) / cam.focal;
    const dy = -(py - cam.cy) / cam.focal;
    const dir: Vec3 = add(add(cam.forward, mul(cam.right, dx)), mul(cam.up, dy));
    if (dir[1] > -1e-4) return null;
    const t = -cam.eye[1] / dir[1];
    return add(cam.eye, mul(dir, t));
  }

  function glowAt(sprite: HTMLCanvasElement, x: number, y: number, radius: number, alpha: number) {
    if (alpha <= 0.002 || radius <= 0.5) return;
    g.globalAlpha = clamp01(alpha);
    g.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
    g.globalAlpha = 1;
  }

  function strokePath(points: ReadonlyArray<{ x: number; y: number }>) {
    if (points.length < 2) return;
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.stroke();
  }

  /** The first `fraction` of a projected polyline. */
  function partial(points: readonly Projected[], fraction: number): Array<{ x: number; y: number }> {
    const last = (points.length - 1) * clamp01(fraction);
    const whole = Math.floor(last);
    const out: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= whole && i < points.length; i++) out.push({ x: points[i].x, y: points[i].y });
    const rest = last - whole;
    if (rest > 0 && whole + 1 < points.length) {
      out.push({ x: lerp(points[whole].x, points[whole + 1].x, rest), y: lerp(points[whole].y, points[whole + 1].y, rest) });
    }
    return out;
  }

  function projectAll(points: readonly Vec3[]): Projected[] | null {
    const out: Projected[] = [];
    for (const point of points) {
      const p = pr(point);
      if (!p) return null;
      out.push(p);
    }
    return out;
  }

  const slabTop = (node: NodeTimeline, time: number): number => {
    const rise = clamp(node.rise, 0, 1.15);
    const base = lerp(2, L.slab.h, rise);
    return base + node.heat * (12 + Math.sin(time * 9) * 1.6) + node.affected * 3;
  };

  /* ---------- layers ---------- */

  function drawBackground() {
    const sky = g.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#04060a");
    sky.addColorStop(0.55, "#070b13");
    sky.addColorStop(1, "#0b1424");
    g.fillStyle = sky;
    g.fillRect(0, 0, width, height);
    const haze = g.createRadialGradient(width * 0.6, height * 0.62, 0, width * 0.6, height * 0.62, Math.max(width, height) * 0.75);
    haze.addColorStop(0, "rgba(38,88,170,0.24)");
    haze.addColorStop(1, "rgba(38,88,170,0)");
    g.fillStyle = haze;
    g.fillRect(0, 0, width, height);
  }

  function drawDust(frame: FrameInput) {
    const lite = frame.quality === "lite";
    g.save();
    g.globalCompositeOperation = "lighter";
    for (const d of dust) {
      if (lite && d.glyph) continue;
      const px = (((d.x + frame.view.yaw * 0.06 * d.z) % 1) + 1) % 1;
      const py = (((d.y - frame.time * d.speed) % 1) + 1) % 1;
      const x = px * width;
      const y = py * height;
      const twinkle = 0.6 + 0.4 * Math.sin(frame.time * 1.3 + d.phase);
      if (d.glyph) {
        g.font = `${Math.round(8 + d.z * 6)}px ${fonts.mono}`;
        g.fillStyle = rgba(CYAN, 0.1 + 0.14 * d.z * twinkle);
        g.fillText(d.glyph, x, y);
      } else {
        g.fillStyle = rgba(INK, (0.12 + 0.35 * d.z) * twinkle);
        const s = 0.6 + d.z * 1.5;
        g.fillRect(x, y, s, s);
      }
    }
    g.restore();
  }

  function drawFloor(frame: FrameInput, light: Vec3 | null) {
    const step = frame.quality === "lite" ? 100 : 70;
    const f = L.floor;
    const radius = kind === "wide" ? 620 : 520;
    const LEVELS = 6;
    const buckets: Array<Array<[Projected, Projected]>> = Array.from({ length: LEVELS }, () => []);
    const [cx, , cz] = L.target;

    const addLine = (x0: number, z0: number, x1: number, z1: number) => {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / step));
      let prev = pr([x0, 0, z0]);
      for (let i = 1; i <= n; i++) {
        const ax = lerp(x0, x1, (i - 1) / n);
        const az = lerp(z0, z1, (i - 1) / n);
        const bx = lerp(x0, x1, i / n);
        const bz = lerp(z0, z1, i / n);
        const next = pr([bx, 0, bz]);
        if (prev && next) {
          const mx = (ax + bx) / 2;
          const mz = (az + bz) / 2;
          const fade = Math.exp(-(((mx - cx) ** 2 + (mz - cz) ** 2) / (radius * radius)));
          const lit = light ? Math.exp(-(((mx - light[0]) ** 2 + (mz - light[2]) ** 2) / (230 * 230))) : 0;
          const a = (0.05 + 0.15 * fade + 0.5 * lit) * fade + 0.02;
          const level = Math.min(LEVELS - 1, Math.floor((a / 0.5) * LEVELS));
          buckets[level].push([prev, next]);
        }
        prev = next;
      }
    };

    for (let x = Math.ceil(f.x0 / step) * step; x <= f.x1; x += step) addLine(x, f.z0, x, f.z1);
    for (let z = Math.ceil(f.z0 / step) * step; z <= f.z1; z += step) addLine(f.x0, z, f.x1, z);

    g.lineWidth = 1;
    buckets.forEach((segments, level) => {
      if (segments.length === 0) return;
      g.strokeStyle = rgba(GRID, ((level + 0.5) / LEVELS) * 0.5);
      g.beginPath();
      for (const [a, b] of segments) {
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
      }
      g.stroke();
    });
  }

  function drawPads(tl: Timeline) {
    // Blueprint outlines show where each service will stand before it arrives.
    for (const id of SERVICE_IDS) {
      const n = tl.nodes[id];
      const alpha = 0.22 * (1 - clamp01(n.rise));
      if (alpha <= 0.01) continue;
      const [x, z] = L.nodes[id];
      const hw = L.slab.w / 2;
      const hd = L.slab.d / 2;
      const corners = projectAll([
        [x - hw, 0.4, z - hd],
        [x + hw, 0.4, z - hd],
        [x + hw, 0.4, z + hd],
        [x - hw, 0.4, z + hd],
        [x - hw, 0.4, z - hd],
      ]);
      if (!corners) continue;
      g.strokeStyle = rgba(CYAN, alpha);
      g.lineWidth = 1;
      g.setLineDash([4, 4]);
      strokePath(corners);
      g.setLineDash([]);
    }
  }

  function drawEdges(tl: Timeline, time: number) {
    for (const edge of tl.edges) {
      const geometry = edgeGeometry.find((e) => e.key === edge.key);
      if (!geometry) continue;
      const pts = projectAll(geometry.points);
      if (!pts) continue;
      const mid = pts[Math.floor(pts.length / 2)];
      const lw = clamp(mid.scale / refScale, 0.7, 1.5);

      if (edge.draw > 0.001) {
        const shown = partial(pts, edge.draw);
        g.save();
        g.globalCompositeOperation = "lighter";
        g.lineCap = "round";
        g.lineJoin = "round";
        g.lineWidth = 7 * lw;
        g.strokeStyle = rgba(CYAN, 0.09 * edge.draw);
        strokePath(shown);
        g.restore();

        g.lineCap = "round";
        g.lineJoin = "round";
        g.lineWidth = 1.7 * lw;
        g.strokeStyle = rgba(mixRgb(CYAN, INK, 0.25), 0.34 + 0.45 * edge.draw);
        strokePath(shown);

        if (edge.draw < 0.999 && shown.length > 0) {
          const tip = shown[shown.length - 1];
          g.save();
          g.globalCompositeOperation = "lighter";
          glowAt(glow.cyan, tip.x, tip.y, 16 * lw, 0.9);
          g.restore();
        }

        if (edge.draw >= 0.97) arrowHead(pts, lw, CYAN, 0.9 * edge.draw);

        if (tl.flow && edge.draw >= 0.999 && edge.hot < 0.15) {
          g.save();
          g.globalCompositeOperation = "lighter";
          g.lineWidth = 3 * lw;
          g.lineCap = "round";
          g.setLineDash([0.1, 14 * lw]);
          g.lineDashOffset = -time * 26 * lw;
          g.strokeStyle = rgba(GREEN, 0.8);
          strokePath(pts);
          g.restore();
        }
      }

      const intensity = Math.max(edge.hot, edge.wave > 0 ? 0.65 : 0);
      if (intensity > 0.01 && edge.draw >= 0.99) {
        // The red wave runs from the failing end back towards the service that depends on it.
        const reversed = [...pts].reverse();
        const shown = partial(reversed, edge.wave);
        g.save();
        g.globalCompositeOperation = "lighter";
        g.lineCap = "round";
        g.lineJoin = "round";
        g.lineWidth = 10 * lw;
        g.strokeStyle = rgba(RED, 0.2 * intensity);
        strokePath(shown);
        g.restore();
        g.lineWidth = 2.5 * lw;
        g.lineCap = "round";
        g.strokeStyle = rgba(RED, 0.95 * Math.min(1, intensity + 0.2));
        strokePath(shown);
        if (edge.wave > 0 && edge.wave < 1 && shown.length > 0) {
          const tip = shown[shown.length - 1];
          g.save();
          g.globalCompositeOperation = "lighter";
          glowAt(glow.red, tip.x, tip.y, 26 * lw, 1);
          glowAt(glow.white, tip.x, tip.y, 7 * lw, 0.9);
          g.restore();
        }
      }
    }
  }

  function arrowHead(pts: readonly Projected[], lw: number, color: Rgb, alpha: number) {
    const a = pts[pts.length - 4];
    const b = pts[pts.length - 1];
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const size = 8 * lw;
    g.fillStyle = rgba(color, alpha);
    g.beginPath();
    g.moveTo(b.x, b.y);
    g.lineTo(b.x - Math.cos(angle - 0.45) * size, b.y - Math.sin(angle - 0.45) * size);
    g.lineTo(b.x - Math.cos(angle + 0.45) * size, b.y - Math.sin(angle + 0.45) * size);
    g.closePath();
    g.fill();
  }

  function ringPoints(center: Vec3, radius: number, y: number, samples: number): Projected[] | null {
    const points: Vec3[] = [];
    for (let i = 0; i <= samples; i++) {
      const a = (i / samples) * Math.PI * 2;
      points.push([center[0] + Math.cos(a) * radius, y, center[2] + Math.sin(a) * radius]);
    }
    return projectAll(points);
  }

  function drawShock(tl: Timeline, frame: FrameInput) {
    const incident = tl.incident;
    if (!incident) return;
    const [x, z] = L.nodes[incident.id];
    const center: Vec3 = [x, 0, z];
    const samples = frame.quality === "lite" ? 36 : 64;
    const c = pr(center);
    g.save();
    g.globalCompositeOperation = "lighter";
    incident.shock.forEach((k) => {
      if (k <= 0 || k >= 1) return;
      const ring = ringPoints(center, 36 + k * 250, 0.6, samples);
      if (!ring) return;
      g.lineWidth = 2.4 * clamp(ring[0].scale / refScale, 0.7, 1.4);
      g.strokeStyle = rgba(RED, (1 - k) * 0.9);
      strokePath(ring);
      g.lineWidth = 9;
      g.strokeStyle = rgba(RED, (1 - k) * 0.12);
      strokePath(ring);
    });
    if (c) glowAt(glow.red, c.x, c.y, (60 + 50 * incident.shock[0]) * c.scale, (1 - incident.shock[0]) * 0.75);
    const k = incident.recoverRing;
    if (k > 0 && k < 1) {
      const ring = ringPoints(center, 30 + k * 220, 0.6, samples);
      if (ring) {
        g.lineWidth = 2.4;
        g.strokeStyle = rgba(GREEN, (1 - k) * 0.85);
        strokePath(ring);
      }
    }
    g.restore();
  }

  /* ---------- 3D bodies ---------- */

  type Face = { points: Vec3[]; normal: Vec3; kind: "top" | "side" };

  function boxFaces(cx: number, cz: number, w: number, d: number, y0: number, y1: number): Face[] {
    const x0 = cx - w / 2;
    const x1 = cx + w / 2;
    const z0 = cz - d / 2;
    const z1 = cz + d / 2;
    return [
      { kind: "top", normal: [0, 1, 0], points: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]] },
      { kind: "side", normal: [0, 0, -1], points: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]] },
      { kind: "side", normal: [0, 0, 1], points: [[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]] },
      { kind: "side", normal: [-1, 0, 0], points: [[x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1]] },
      { kind: "side", normal: [1, 0, 0], points: [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]] },
    ];
  }

  function fillFace(face: Face, color: Rgb, outline: Rgb, outlineAlpha: number, lineWidth: number, dashed: boolean) {
    const pts = projectAll(face.points);
    if (!pts) return;
    const centroid: Vec3 = [
      (face.points[0][0] + face.points[2][0]) / 2,
      (face.points[0][1] + face.points[2][1]) / 2,
      (face.points[0][2] + face.points[2][2]) / 2,
    ];
    if (dot(face.normal, sub(cam.eye, centroid)) <= 0) return;
    const shade = face.kind === "top" ? 1 : 0.55 + 0.45 * Math.max(0, dot(face.normal, LIGHT_DIR));
    g.fillStyle = rgba([color[0] * shade, color[1] * shade, color[2] * shade], 0.96);
    g.beginPath();
    g.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
    g.closePath();
    g.fill();
    g.strokeStyle = rgba(outline, outlineAlpha);
    g.lineWidth = lineWidth;
    g.setLineDash(dashed && face.kind === "top" ? [5, 4] : []);
    g.stroke();
    g.setLineDash([]);
  }

  function drawSlab(id: ServiceId, tl: Timeline, frame: FrameInput, lightBoost: number) {
    const n = tl.nodes[id];
    if (n.rise <= 0.01) return;
    const [x, z] = L.nodes[id];
    const top = slabTop(n, frame.time);
    const bad = Math.max(n.heat, n.affected * 0.85);
    const saved = clamp01(n.badge);
    const hovered = frame.hover === id;
    const edgeColor = mixRgb(mixRgb(CYAN, GREEN, saved), RED, bad);
    const topColor = mixRgb(mixRgb(SLAB_TOP, TOP_SAVED, saved * 0.85), TOP_BAD, bad);
    const sideColor = mixRgb(mixRgb(SLAB_SIDE, SIDE_SAVED, saved * 0.85), SIDE_BAD, bad);
    const lift = (hovered ? 26 : 0) + lightBoost * 14;
    const lit = mixRgb(topColor, INK, 0.05 + lift / 220);

    const base = pr([x, 0, z]);
    const pulse = 0.65 + 0.35 * Math.sin(frame.time * 6);
    if (base) {
      g.save();
      g.globalCompositeOperation = "lighter";
      const glowSprite = bad > 0.4 ? glow.red : saved > 0.5 ? glow.green : glow.cyan;
      const radius = L.slab.w * (bad > 0.4 ? 1.7 : 1.1) * base.scale;
      glowAt(glowSprite, base.x, base.y, radius, clamp01(n.rise) * (0.2 + 0.25 * lightBoost + (bad > 0.4 ? 0.3 * pulse * n.heat : 0)));
      g.restore();
    }

    const faces = boxFaces(x, z, L.slab.w, L.slab.d, 0, top);
    const dashed = n.affected > 0.4 && n.heat < 0.5;
    for (const face of faces) {
      fillFace(face, face.kind === "top" ? lit : sideColor, edgeColor, face.kind === "top" ? 0.95 : 0.55, hovered ? 2.2 : 1.3, dashed);
    }

    // Emissive rim on the top face
    const topPts = projectAll(faces[0].points);
    if (topPts) {
      g.save();
      g.globalCompositeOperation = "lighter";
      g.lineWidth = 5;
      g.strokeStyle = rgba(edgeColor, 0.13 + 0.12 * lightBoost + (hovered ? 0.2 : 0));
      g.beginPath();
      g.moveTo(topPts[0].x, topPts[0].y);
      for (let i = 1; i < topPts.length; i++) g.lineTo(topPts[i].x, topPts[i].y);
      g.closePath();
      g.stroke();
      g.restore();
    }
  }

  function drawHub(tl: Timeline, frame: FrameInput) {
    const [hx, , hz] = L.hub;
    const hubIn = tl.hubIn;
    if (hubIn <= 0.01) return;
    const radius = 38;
    const sides = 8;
    const height = 58 * hubIn;
    const pulse = tl.hubPulse;
    const edgeColor = mixRgb(CYAN, INK, 0.2 + 0.4 * pulse);
    const base = pr([hx, 0, hz]);
    if (base) {
      g.save();
      g.globalCompositeOperation = "lighter";
      glowAt(glow.cyan, base.x, base.y, 150 * base.scale, 0.3 * hubIn + 0.25 * pulse);
      g.restore();
    }
    const rotation = Math.PI / sides;
    for (let i = 0; i < sides; i++) {
      const a0 = rotation + (i / sides) * Math.PI * 2;
      const a1 = rotation + ((i + 1) / sides) * Math.PI * 2;
      const p0: Vec3 = [hx + Math.cos(a0) * radius, 0, hz + Math.sin(a0) * radius];
      const p1: Vec3 = [hx + Math.cos(a1) * radius, 0, hz + Math.sin(a1) * radius];
      const mid = (a0 + a1) / 2;
      const normal: Vec3 = [Math.cos(mid), 0, Math.sin(mid)];
      fillFace(
        { kind: "side", normal, points: [p0, p1, [p1[0], height, p1[2]], [p0[0], height, p0[2]]] },
        mixRgb([16, 28, 52], [30, 56, 100], pulse * 0.5),
        edgeColor,
        0.7,
        1.2,
        false,
      );
    }
    const topPts: Vec3[] = [];
    for (let i = 0; i < sides; i++) {
      const a = rotation + (i / sides) * Math.PI * 2;
      topPts.push([hx + Math.cos(a) * radius, height, hz + Math.sin(a) * radius]);
    }
    const top = projectAll(topPts);
    if (top) {
      g.fillStyle = rgba(mixRgb([34, 62, 112], [90, 150, 230], pulse * 0.7), 0.96);
      g.beginPath();
      g.moveTo(top[0].x, top[0].y);
      for (let i = 1; i < top.length; i++) g.lineTo(top[i].x, top[i].y);
      g.closePath();
      g.fill();
      g.strokeStyle = rgba(edgeColor, 0.95);
      g.lineWidth = 1.4;
      g.stroke();
    }

    // Core and rings
    const coreY = height + 34 + Math.sin(frame.time * 2) * 3;
    const core = pr([hx, coreY, hz]);
    if (core) {
      g.save();
      g.globalCompositeOperation = "lighter";
      glowAt(glow.cyan, core.x, core.y, (46 + 40 * pulse) * core.scale, 0.85 * hubIn);
      glowAt(glow.white, core.x, core.y, (14 + 8 * pulse) * core.scale, 0.95 * hubIn);
      g.restore();
    }
    const spin = frame.time * (0.6 + 1.4 * pulse);
    const samples = frame.quality === "lite" ? 36 : 56;
    const tilts = [0.0, 1.1, -0.7];
    const radii = [64, 82, 98];
    tilts.forEach((tilt, index) => {
      const pts: Vec3[] = [];
      for (let i = 0; i <= samples; i++) {
        const a = (i / samples) * Math.PI * 2 + spin * (index % 2 === 0 ? 1 : -1);
        const rx = Math.cos(a) * radii[index];
        const rz = Math.sin(a) * radii[index];
        const y = rz * Math.sin(tilt);
        const z2 = rz * Math.cos(tilt);
        pts.push([hx + rx, coreY + y, hz + z2]);
      }
      const projected = projectAll(pts);
      if (!projected) return;
      g.save();
      g.globalCompositeOperation = "lighter";
      g.lineWidth = 1.3;
      g.strokeStyle = rgba(CYAN, (0.22 + 0.4 * pulse) * hubIn);
      strokePath(projected);
      const bead = projected[Math.floor(((spin * 0.7 + index) % 1) * samples) % projected.length];
      glowAt(glow.cyan, bead.x, bead.y, 9 * bead.scale * 3, 0.8 * hubIn);
      g.restore();
    });
  }

  function windowPoint(x: number, y: number): Vec3 {
    const w = L.window;
    return add(add(w.origin, mul(w.across, x / PANEL_W)), mul(w.down, y / PANEL_H));
  }

  const lineBaseline = (i: number) => CODE_TOP + i * CODE_LINE_H;

  function drawWindow(tl: Timeline, frame: FrameInput) {
    if (tl.windowAlpha <= 0.01) return;
    const w = L.window;
    const p0 = pr(w.origin);
    const px = pr(add(w.origin, w.across));
    const py = pr(add(w.origin, w.down));
    if (!p0 || !px || !py) return;

    g.save();
    g.setTransform(
      (dpr * (px.x - p0.x)) / PANEL_W,
      (dpr * (px.y - p0.y)) / PANEL_W,
      (dpr * (py.x - p0.x)) / PANEL_H,
      (dpr * (py.y - p0.y)) / PANEL_H,
      dpr * p0.x,
      dpr * p0.y,
    );
    const alpha = tl.windowAlpha;
    g.globalAlpha = alpha;

    // Soft halo
    g.save();
    g.globalCompositeOperation = "lighter";
    g.shadowColor = rgba(CYAN, 0.55);
    g.shadowBlur = 40;
    roundedRect(g, 0, 0, PANEL_W, PANEL_H, 16);
    g.fillStyle = rgba(CYAN, 0.02);
    g.fill();
    g.restore();

    roundedRect(g, 0, 0, PANEL_W, PANEL_H, 16);
    g.fillStyle = "rgba(8,13,23,0.94)";
    g.fill();
    g.lineWidth = 1.5;
    g.strokeStyle = rgba(CYAN, 0.4);
    g.stroke();

    // Title bar
    g.save();
    roundedRect(g, 0, 0, PANEL_W, PANEL_H, 16);
    g.clip();
    g.fillStyle = "rgba(255,255,255,0.045)";
    g.fillRect(0, 0, PANEL_W, 42);
    g.fillStyle = "rgba(255,255,255,0.07)";
    g.fillRect(0, 42, PANEL_W, 1);
    g.restore();
    ([[22, "255,95,86"], [42, "255,189,46"], [62, "39,201,63"]] as const).forEach(([x, c]) => {
      g.fillStyle = `rgba(${c},0.8)`;
      g.beginPath();
      g.arc(x, 21, 5.5, 0, Math.PI * 2);
      g.fill();
    });
    g.font = `500 12px ${fonts.mono}`;
    g.fillStyle = rgba(INK, 0.85);
    g.fillText("compose.yaml", 92, 25);
    g.fillStyle = rgba(DIM, 0.9);
    g.textAlign = "right";
    g.fillText("read-only", PANEL_W - 18, 25);
    g.textAlign = "left";

    // Code
    g.font = `500 ${CODE_FONT_PX}px ${fonts.mono}`;
    const charW = textWidth("0");
    const left = 52;
    const total = CODE_LINES.length;

    if (tl.scan > 0 && tl.scan < 1) {
      const y = lineBaseline(0) - 17 + tl.scan * total * CODE_LINE_H;
      const band = g.createLinearGradient(0, y - 8, 0, y + CODE_LINE_H);
      band.addColorStop(0, rgba(CYAN, 0));
      band.addColorStop(1, rgba(CYAN, 0.2));
      g.fillStyle = band;
      g.fillRect(8, y - 8, PANEL_W - 16, CODE_LINE_H + 8);
      g.fillStyle = rgba(CYAN, 0.9);
      g.fillRect(8, y + CODE_LINE_H - 2, PANEL_W - 16, 1.5);
    }

    let remaining = Math.floor(tl.typed);
    const caret = { x: left, y: lineBaseline(0), set: false };
    CODE_LINES.forEach((line, i) => {
      const y = lineBaseline(i);
      const saved = i < tl.savedLines;
      g.globalAlpha = alpha * (saved ? 0.62 : 1);
      g.fillStyle = rgba(DIM, 0.55);
      g.textAlign = "right";
      g.fillText(String(i + 1), 34, y);
      g.textAlign = "left";
      let x = left;
      for (const token of line) {
        if (remaining <= 0) break;
        const text = token.text.slice(0, remaining);
        remaining -= text.length;
        g.fillStyle = codeColor(token.kind);
        g.fillText(text, x, y);
        x += text.length * charW;
        if (text.length < token.text.length) break;
      }
      if (remaining <= 0 && !caret.set) {
        caret.x = x;
        caret.y = y;
        caret.set = true;
      }
      if (saved) {
        g.globalAlpha = alpha;
        drawCheck(PANEL_W - 30, y - 5, 5.5, GREEN);
      }
    });
    g.globalAlpha = alpha;

    const typing = Math.floor(tl.typed) < TOTAL_CHARS;
    if (caret.set && (typing || Math.sin(frame.time * 7) > 0) && tl.scan === 0) {
      g.fillStyle = rgba(CYAN, 0.95);
      g.fillRect(caret.x + 1, caret.y - 13, 7.5, 17);
    }

    // Footer
    g.fillStyle = "rgba(255,255,255,0.045)";
    g.fillRect(0, PANEL_H - 34, PANEL_W, 34);
    g.fillStyle = rgba(GREEN, 0.9);
    g.beginPath();
    g.arc(22, PANEL_H - 17, 3.5, 0, Math.PI * 2);
    g.fill();
    g.font = `500 11.5px ${fonts.mono}`;
    g.fillStyle = rgba(DIM, 1);
    g.fillText("read-only. Nothing is executed.", 34, PANEL_H - 13);
    g.restore();
  }

  function codeColor(kind: CodeKind): string {
    if (kind === "name") return rgba(INK, 0.95);
    if (kind === "value") return rgba(CYAN, 0.95);
    return rgba([150, 162, 186], 0.95);
  }

  function drawCheck(x: number, y: number, size: number, color: Rgb) {
    g.strokeStyle = rgba(color, 1);
    g.lineWidth = 2;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.beginPath();
    g.moveTo(x - size, y);
    g.lineTo(x - size * 0.3, y + size * 0.7);
    g.lineTo(x + size, y - size * 0.7);
    g.stroke();
  }

  /* ---------- packets ---------- */

  function coreWorld(tl: Timeline): Vec3 {
    return [L.hub[0], 58 * tl.hubIn + 34, L.hub[2]];
  }

  function drawPackets(tl: Timeline, frame: FrameInput) {
    const lite = frame.quality === "lite";
    g.save();
    g.globalCompositeOperation = "lighter";
    const core = coreWorld(tl);
    for (const packet of tl.packets) {
      let from: Vec3;
      let to: Vec3;
      let lift: number;
      if (packet.kind === "line") {
        from = windowPoint(PANEL_W - 14, lineBaseline(packet.index) - 5);
        to = core;
        lift = 70 + (packet.index % 4) * 20;
      } else {
        const [x, z] = L.nodes[packet.id];
        from = core;
        to = [x, L.slab.h + 6, z];
        lift = 90 + 0.2 * Math.hypot(x - core[0], z - core[2]);
      }
      const at = (t: number): Vec3 => {
        const e = easeInOut(clamp01(t));
        const p = lerp3(from, to, e);
        return [p[0], p[1] + lift * 4 * e * (1 - e), p[2]];
      };
      const sprite = packet.kind === "node" && packet.t > 0.55 ? glow.green : glow.cyan;
      const trail = lite ? 5 : 10;
      for (let k = trail; k >= 0; k--) {
        const t = packet.t - k * 0.018;
        if (t < 0) continue;
        const p = pr(at(t));
        if (!p) continue;
        const f = 1 - k / (trail + 1);
        glowAt(sprite, p.x, p.y, (4 + 11 * f) * clamp(p.scale / refScale, 0.7, 1.5), 0.15 + 0.5 * f);
      }
      const head = pr(at(packet.t));
      if (head) {
        const s = clamp(head.scale / refScale, 0.7, 1.5);
        glowAt(sprite, head.x, head.y, 22 * s, 0.95);
        glowAt(glow.white, head.x, head.y, 7 * s, 1);
      }
    }
    g.restore();
  }

  /* ---------- labels, badges, HUD ---------- */

  function drawLabels(tl: Timeline, frame: FrameInput) {
    const order = SERVICE_IDS.map((id) => {
      const [x, z] = L.nodes[id];
      const depth = pr([x, 0, z])?.depth ?? 0;
      return { id, depth };
    }).sort((a, b) => b.depth - a.depth);

    hits = [];
    // Labels already placed this frame. A new label that would land on one is lifted until it is clear.
    const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
    for (const { id } of order) {
      const n = tl.nodes[id];
      if (n.rise <= 0.06) continue;
      const [x, z] = L.nodes[id];
      const top = slabTop(n, frame.time);
      const anchor = pr([x, top, z]);
      if (!anchor) continue;
      const alpha = clamp01(n.rise * 1.4);
      const fontPx = clamp(12.5 * clamp(anchor.scale / refScale, 0.8, 1.25), 10.5, 15);
      const status: GlyphKind = n.heat >= 0.5 ? "degraded" : n.affected >= 0.5 ? "affected" : n.badge >= 0.5 || n.recovered >= 0.5 ? "saved" : "unknown";
      const color = status === "degraded" || status === "affected" ? RED : status === "saved" ? GREEN : CYAN;

      g.font = `600 ${fontPx}px ${fonts.sans}`;
      const textW = textWidth(id);
      const padX = 9;
      const glyphW = fontPx + 2;
      const pillW = textW + padX * 2 + glyphW;
      const pillH = fontPx + 12;
      const px = anchor.x - pillW / 2;
      let py = anchor.y - pillH - 10;
      const hovered = frame.hover === id;

      const badgeExtra = n.badge > 0.02 ? clamp(fontPx * 0.84, 9.5, 12.5) + 9 + 5 : 0;
      const overlaps = (lift: number) =>
        placed.some((r) => px - 4 < r.x1 && px + pillW + 4 > r.x0 && py - lift - badgeExtra - 3 < r.y1 && py - lift + pillH + 3 > r.y0);
      let lift = 0;
      while (lift < 4 * 26 && overlaps(lift)) lift += 26;
      if (lift > 0) {
        g.globalAlpha = alpha * 0.5;
        g.strokeStyle = rgba(color, 0.8);
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(anchor.x, anchor.y - 3);
        g.lineTo(anchor.x, py - lift + pillH);
        g.stroke();
      }
      py -= lift;
      placed.push({ x0: px, y0: py - badgeExtra, x1: px + pillW, y1: py + pillH });

      g.globalAlpha = alpha;
      roundedRect(g, px, py, pillW, pillH, pillH / 2);
      g.fillStyle = "rgba(5,9,16,0.82)";
      g.fill();
      g.lineWidth = hovered ? 1.8 : 1;
      g.strokeStyle = rgba(color, hovered ? 1 : 0.6);
      g.stroke();
      drawGlyph(g, status, px + padX + fontPx / 2 - 1, py + pillH / 2, fontPx * 0.7, color);
      g.fillStyle = rgba(INK, 1);
      g.textBaseline = "middle";
      g.fillText(id, px + padX + glyphW, py + pillH / 2 + 0.5);
      g.textBaseline = "alphabetic";

      // Badge
      let badgeTop = py;
      if (n.badge > 0.02) {
        const label = n.heat >= 0.5 ? "degraded" : n.affected >= 0.5 ? "potentially affected" : n.recovered >= 0.5 ? "recovered" : "saved";
        const bad = n.heat >= 0.5 || n.affected >= 0.5;
        const badgeColor = bad ? RED : GREEN;
        const bp = clamp(n.badge, 0, 1.12);
        const bf = clamp(fontPx * 0.84, 9.5, 12.5);
        g.font = `600 ${bf}px ${fonts.mono}`;
        const tw = textWidth(label);
        const bw = tw + 14 + bf + 6;
        const bh = bf + 9;
        const cx = anchor.x;
        const cy = py - 5 - bh / 2;
        g.save();
        g.translate(cx, cy);
        g.scale(bp, bp);
        g.globalAlpha = alpha * clamp01(n.badge * 1.5);
        roundedRect(g, -bw / 2, -bh / 2, bw, bh, 4);
        g.fillStyle = n.heat >= 0.5 ? rgba(RED, 0.9) : rgba(badgeColor, 0.14);
        g.fill();
        g.lineWidth = 1.2;
        g.setLineDash(n.affected >= 0.5 && n.heat < 0.5 ? [4, 3] : []);
        g.strokeStyle = rgba(badgeColor, 0.95);
        g.stroke();
        g.setLineDash([]);
        const ink: Rgb = n.heat >= 0.5 ? [255, 255, 255] : badgeColor;
        if (bad) {
          drawGlyph(g, n.heat >= 0.5 ? "degraded" : "affected", -bw / 2 + 9, 0, bf * 0.75, ink);
        } else {
          drawCheck(-bw / 2 + 9, 0, bf * 0.4, ink);
        }
        g.fillStyle = rgba(ink, 1);
        g.textBaseline = "middle";
        g.fillText(label, -bw / 2 + 9 + bf * 0.7 + 4, 0.5);
        g.textBaseline = "alphabetic";
        g.restore();
        badgeTop = cy - bh / 2;
      }
      g.globalAlpha = 1;

      if (hovered && frame.pointer.active) {
        g.font = `500 11px ${fonts.sans}`;
        g.fillStyle = rgba(DIM, 1);
        g.textAlign = "center";
        g.fillText("Click to break it", anchor.x, anchor.y + 16);
        g.textAlign = "left";
      }

      // Hit box: the slab, its label and badge.
      const corners = projectAll(boxFaces(x, z, L.slab.w, L.slab.d, 0, top).flatMap((f) => f.points));
      if (corners) {
        const xs = corners.map((c) => c.x);
        const ys = corners.map((c) => c.y);
        hits.push({
          id,
          x0: Math.min(px, ...xs) - 6,
          y0: Math.min(badgeTop, ...ys) - 4,
          x1: Math.max(px + pillW, ...xs) + 6,
          y1: Math.max(...ys) + 6,
          depth: anchor.depth,
        });
      }
    }

    // Hub label
    const core = pr(coreWorld(tl));
    if (core && tl.hubIn > 0.3) {
      const fontPx = clamp(14 * clamp(core.scale / refScale, 0.8, 1.2), 12, 16);
      g.font = `700 ${fontPx}px ${fonts.sans}`;
      const text = "Hydra";
      const tw = textWidth(text);
      const w = tw + 24;
      const h = fontPx + 12;
      const x = core.x - w / 2;
      const y = core.y - 52 * core.scale - h;
      g.globalAlpha = tl.hubIn;
      roundedRect(g, x, y, w, h, h / 2);
      g.fillStyle = "rgba(5,9,16,0.85)";
      g.fill();
      g.lineWidth = 1;
      g.strokeStyle = rgba(CYAN, 0.7);
      g.stroke();
      g.fillStyle = rgba(INK, 1);
      g.textBaseline = "middle";
      g.fillText(text, x + 12, y + h / 2 + 0.5);
      g.textBaseline = "alphabetic";
      g.globalAlpha = 1;
    }
  }

  function drawHud(tl: Timeline) {
    const margin = width < 700 ? 12 : 22;
    const cardW = Math.min(width < 700 ? 232 : 268, width - margin * 2);
    const x = width - margin - cardW;
    const y = margin;
    const ingest = seg(tl.u, 0.215, 0.24) * (1 - (tl.incident ? tl.incident.alert : 0));

    if (ingest > 0.01) {
      const rows: Array<{ label: string; value: number; total: number }> = [
        { label: "lines read", value: tl.savedLines, total: tl.totalLines },
        { label: "services saved", value: tl.savedNodes, total: SERVICE_IDS.length },
        { label: "dependencies linked", value: tl.drawnEdges, total: DEPENDENCIES.length },
      ];
      const h = 50 + rows.length * 28;
      g.save();
      g.globalAlpha = ingest;
      g.translate(0, (1 - ingest) * -8);
      roundedRect(g, x, y, cardW, h, 14);
      g.fillStyle = "rgba(6,10,18,0.82)";
      g.fill();
      g.lineWidth = 1;
      g.strokeStyle = rgba(CYAN, 0.35);
      g.stroke();
      g.font = `600 11px ${fonts.mono}`;
      g.fillStyle = rgba(CYAN, 1);
      g.fillText("SAVING TO HYDRA", x + 16, y + 26);
      rows.forEach((row, i) => {
        const ry = y + 52 + i * 28;
        const done = row.value >= row.total;
        g.font = `500 12px ${fonts.sans}`;
        g.fillStyle = rgba(INK, 0.92);
        g.fillText(row.label, x + 16, ry + 4);
        g.font = `600 12px ${fonts.mono}`;
        g.textAlign = "right";
        g.fillStyle = rgba(done ? GREEN : INK, 1);
        g.fillText(`${row.value}/${row.total}`, x + cardW - 16, ry + 4);
        g.textAlign = "left";
        g.fillStyle = "rgba(255,255,255,0.08)";
        g.fillRect(x + 16, ry + 11, cardW - 32, 3);
        g.fillStyle = rgba(done ? GREEN : CYAN, 1);
        g.fillRect(x + 16, ry + 11, (cardW - 32) * (row.value / row.total), 3);
      });
      g.restore();
    }

    const incident = tl.incident;
    if (incident && incident.alert > 0.01) {
      const recovered = incident.banner === "recovered";
      const color = recovered ? GREEN : RED;
      const h = 86;
      g.save();
      g.globalAlpha = incident.alert;
      g.translate((1 - incident.alert) * 24, 0);
      roundedRect(g, x, y, cardW, h, 14);
      g.fillStyle = recovered ? "rgba(6,22,16,0.9)" : "rgba(30,8,14,0.9)";
      g.fill();
      g.lineWidth = 1.4;
      g.strokeStyle = rgba(color, 0.9);
      g.stroke();
      g.font = `700 10.5px ${fonts.mono}`;
      const tag = recovered ? "RECOVERED" : "ALERT";
      const tw = textWidth(tag) + 14;
      roundedRect(g, x + 16, y + 14, tw, 20, 4);
      g.fillStyle = rgba(color, 1);
      g.fill();
      g.fillStyle = rgba(recovered ? [4, 30, 20] : [255, 255, 255], 1);
      g.textBaseline = "middle";
      g.fillText(tag, x + 23, y + 24.5);
      g.textBaseline = "alphabetic";
      g.font = `600 14px ${fonts.sans}`;
      g.fillStyle = rgba(INK, 1);
      g.fillText(recovered ? `${incident.id} is healthy again` : `${incident.id} is degraded`, x + 16, y + 56);
      g.font = `500 12px ${fonts.sans}`;
      g.fillStyle = rgba(DIM, 1);
      const n = incident.affectedShown;
      g.fillText(recovered ? "The map returns to normal." : `${n} ${n === 1 ? "service" : "services"} potentially affected`, x + 16, y + 74);
      g.restore();
    }
  }

  function drawOverlays(tl: Timeline) {
    const vignette = g.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.35, width / 2, height / 2, Math.max(width, height) * 0.78);
    vignette.addColorStop(0, "rgba(2,4,8,0)");
    vignette.addColorStop(1, "rgba(2,4,8,0.62)");
    g.fillStyle = vignette;
    g.fillRect(0, 0, width, height);

    const incident = tl.incident;
    if (incident && incident.banner === "alert") {
      const edge = g.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.4, width / 2, height / 2, Math.max(width, height) * 0.8);
      edge.addColorStop(0, "rgba(255,60,80,0)");
      edge.addColorStop(1, `rgba(255,60,80,${0.2 * incident.alert})`);
      g.fillStyle = edge;
      g.fillRect(0, 0, width, height);
      if (incident.flash > 0.01) {
        g.fillStyle = `rgba(255,70,90,${0.1 * incident.flash})`;
        g.fillRect(0, 0, width, height);
      }
    }
  }

  /* ---------- public API ---------- */

  return {
    resize(w, h, ratio) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      dpr = ratio;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      kind = width / height < 1.3 ? "tall" : "wide";
      L = layout3d(kind);
      edgeGeometry = buildEdges();
    },

    draw(frame) {
      const tl = frame.timeline;
      const distance = fitDistance(L.fit.width, L.fit.height, width, height);
      const choreo = frame.choreography;
      cam = makeCamera(
        {
          target: choreo.target,
          yaw: L.yaw + choreo.yaw + frame.view.yaw,
          pitch: clamp(L.pitch + choreo.pitch + frame.view.pitch, 0.3, 1.35),
          distance: distance * choreo.zoom,
        },
        width,
        height,
      );
      refScale = cam.focal / distance;

      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      g.setLineDash([]);
      g.textBaseline = "alphabetic";
      g.textAlign = "left";

      drawBackground();
      drawDust(frame);

      // The cursor is a light on the floor; without a cursor a slow ambient light wanders instead.
      const ambient: Vec3 = [L.target[0] + Math.sin(frame.time * 0.35) * 300, 0, L.target[2] + Math.cos(frame.time * 0.27) * 110];
      const light = frame.pointer.active ? unprojectToFloor(frame.pointer.x, frame.pointer.y) ?? ambient : ambient;

      drawFloor(frame, light);
      const lightScreen = pr(light);
      if (lightScreen) {
        g.save();
        g.globalCompositeOperation = "lighter";
        glowAt(glow.cyan, lightScreen.x, lightScreen.y, 210 * lightScreen.scale, frame.pointer.active ? 0.3 : 0.14);
        g.restore();
      }
      drawPads(tl);
      drawEdges(tl, frame.time);
      drawShock(tl, frame);

      type Item = { depth: number; draw: () => void };
      const items: Item[] = [];
      const windowCenter = add(L.window.origin, add(mul(L.window.across, 0.5), mul(L.window.down, 0.5)));
      items.push({ depth: pr(windowCenter)?.depth ?? 0, draw: () => drawWindow(tl, frame) });
      items.push({ depth: pr([L.hub[0], 0, L.hub[2]])?.depth ?? 0, draw: () => drawHub(tl, frame) });
      for (const id of SERVICE_IDS) {
        const [x, z] = L.nodes[id];
        const boost = light ? Math.exp(-(((x - light[0]) ** 2 + (z - light[2]) ** 2) / (200 * 200))) : 0;
        items.push({ depth: pr([x, 0, z])?.depth ?? 0, draw: () => drawSlab(id, tl, frame, boost) });
      }
      items.sort((a, b) => b.depth - a.depth);
      for (const item of items) item.draw();

      drawPackets(tl, frame);
      drawLabels(tl, frame);
      drawOverlays(tl);
      drawHud(tl);
      if (frame.fade < 0.999) {
        g.fillStyle = `rgba(4,6,10,${1 - clamp01(frame.fade)})`;
        g.fillRect(0, 0, width, height);
      }
    },

    hitTest(x, y) {
      let best: Hit | null = null;
      for (const hit of hits) {
        if (x < hit.x0 || x > hit.x1 || y < hit.y0 || y > hit.y1) continue;
        if (!best || hit.depth < best.depth) best = hit;
      }
      return best ? best.id : null;
    },

    layoutKind: () => kind,
    layout: () => L,
  };
}

