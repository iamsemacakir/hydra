/*
 * Moves the live map: a small spring simulation for the services, the requests flowing along each dependency,
 * and the pulses a failure or a recovery sends along them. It writes straight to the DOM that LiveMap.tsx
 * rendered (transforms and SVG attributes), so React re-renders only when something meaningful changes.
 *
 * Positions are in map units (see MAP in mapModel.ts). One frame loop runs only while the map is on screen and
 * something moves; it stops by itself when everything has settled.
 */
import { DEPENDENCIES, MAP, SERVICES, curvePath, linkCurve, linkId, type EdgeState, type ServiceId } from "./mapModel";

type Vec = { x: number; y: number };

type Body = {
  id: ServiceId;
  home: Vec;
  pos: Vec;
  vel: Vec;
  force: Vec;
  depth: number;
  phase: number;
  el: HTMLElement | null;
  shownX: number;
  shownY: number;
};

type Link = {
  key: string;
  from: Body;
  to: Body;
  line: SVGPathElement | null;
  particles: SVGCircleElement[];
  progress: number[];
  pulse: SVGCircleElement | null;
  state: EdgeState;
  pulseStart: number;
  pulsing: boolean;
};

type Grab = { body: Body; offset: Vec; at: number };

/** Pull of each service towards its place on the map. */
const SPRING = 62;
/** How quickly movement dies down, per second. */
const DAMPING = 10.5;
/** How strongly linked services keep their distance from each other, so dragging one tugs its neighbours. */
const TETHER = 15;
/** Services push apart when closer than this, in map units. */
const PERSONAL_SPACE = 150;
const REPEL = 14;
/** The pointer gently pushes nearby services away and tilts the whole map towards itself. */
const PUSH_RADIUS = 180;
const PUSH = 24;
const PARALLAX = 22;
/** A slow breath, so the map never looks frozen while requests flow. */
const BREATH = 6;
const BREATH_RATE = (2 * Math.PI) / 7;
/** Requests travel this many map units per second. */
const FLOW_SPEED = 150;
const PARTICLES_PER_LINK = 2;
const PARTICLE_PX = 2.8;
const PULSE_PX = 5.5;
const EDGE = 48;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function pointOn(curve: readonly number[], t: number): Vec {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * curve[0] + b * curve[2] + c * curve[4] + d * curve[6],
    y: a * curve[1] + b * curve[3] + c * curve[5] + d * curve[7],
  };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export class MapEngine {
  private readonly root: HTMLElement;
  private readonly bodies: Body[] = [];
  private readonly byId = new Map<ServiceId, Body>();
  private readonly links: Link[] = [];
  private readonly pulseMs: number;
  private readonly resizeObserver: ResizeObserver | null = null;
  private scale = 1;
  private visible = false;
  private flow = false;
  private physics = false;
  private frame = 0;
  private lastTime = 0;
  private clock = 0;
  private cursor: Vec | null = null;
  private grab: Grab | null = null;
  private particlesShown = false;

  constructor(root: HTMLElement, pulseMs: number) {
    this.root = root;
    this.pulseMs = pulseMs;
    for (const service of SERVICES) {
      const body: Body = {
        id: service.id,
        home: { x: service.x, y: service.y },
        pos: { x: service.x, y: service.y },
        vel: { x: 0, y: 0 },
        force: { x: 0, y: 0 },
        depth: service.depth,
        phase: service.order * 1.9,
        el: root.querySelector<HTMLElement>(`[data-body="${service.id}"]`),
        shownX: 0,
        shownY: 0,
      };
      this.bodies.push(body);
      this.byId.set(service.id, body);
    }
    DEPENDENCIES.forEach((dependency, index) => {
      const key = linkId(dependency);
      const group = root.querySelector<SVGGElement>(`[data-link="${key}"]`);
      const from = this.byId.get(dependency.from);
      const to = this.byId.get(dependency.to);
      if (!from || !to) return;
      const particles = group ? [...group.querySelectorAll<SVGCircleElement>("[data-particle]")] : [];
      this.links.push({
        key,
        from,
        to,
        line: group?.querySelector<SVGPathElement>("[data-line]") ?? null,
        particles,
        progress: particles.map((_, k) => (k / PARTICLES_PER_LINK + index * 0.37) % 1),
        pulse: group?.querySelector<SVGCircleElement>("[data-pulse]") ?? null,
        state: "idle",
        pulseStart: 0,
        pulsing: false,
      });
    });
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.measure());
      this.resizeObserver.observe(root);
    }
    this.measure();
  }

  /** Runs the loop only while the map can be seen. */
  setVisible(visible: boolean): void {
    this.visible = visible;
    if (visible) this.wake();
    else this.sleep();
  }

  /** Requests flowing and the slow breath. Off while paused and for reduced motion. */
  setFlow(flow: boolean): void {
    if (this.flow === flow) return;
    this.flow = flow;
    if (!flow) this.hideParticles();
    this.wake();
  }

  /** Springs, dragging and the pointer. Off for reduced motion: then the map simply stays where it is. */
  setPhysics(physics: boolean): void {
    this.physics = physics;
    if (!physics) {
      this.grab = null;
      this.cursor = null;
      for (const body of this.bodies) {
        body.pos = { ...body.home };
        body.vel = { x: 0, y: 0 };
      }
      this.render(performance.now(), 0);
    }
    this.wake();
  }

  /** Starts a pulse on every dependency a failure or a recovery has just started to travel along. */
  setEdgeStates(states: Readonly<Record<string, EdgeState>>): void {
    const now = performance.now();
    for (const link of this.links) {
      const next = states[link.key] ?? "idle";
      if (next !== link.state && (next === "charging" || next === "healing") && this.physics) {
        link.pulsing = true;
        link.pulseStart = now;
        link.pulse?.setAttribute("data-kind", next === "charging" ? "fail" : "heal");
      }
      link.state = next;
    }
    this.wake();
  }

  setCursor(clientX: number, clientY: number): void {
    if (!this.physics) return;
    this.cursor = this.toMap(clientX, clientY);
    this.wake();
  }

  clearCursor(): void {
    this.cursor = null;
    this.wake();
  }

  grabService(id: ServiceId, clientX: number, clientY: number): void {
    const body = this.byId.get(id);
    if (!body || !this.physics) return;
    const point = this.toMap(clientX, clientY);
    this.grab = { body, offset: { x: body.pos.x - point.x, y: body.pos.y - point.y }, at: performance.now() };
    this.wake();
  }

  dragTo(clientX: number, clientY: number): void {
    const grab = this.grab;
    if (!grab) return;
    const point = this.toMap(clientX, clientY);
    const x = clamp(point.x + grab.offset.x, EDGE, MAP.width - EDGE);
    const y = clamp(point.y + grab.offset.y, EDGE, MAP.height - EDGE);
    const now = performance.now();
    const dt = Math.max(0.008, (now - grab.at) / 1000);
    grab.body.vel = { x: (x - grab.body.pos.x) / dt, y: (y - grab.body.pos.y) / dt };
    grab.body.pos = { x, y };
    grab.at = now;
    this.wake();
  }

  release(): void {
    const grab = this.grab;
    if (!grab) return;
    const { vel } = grab.body;
    const speed = Math.hypot(vel.x, vel.y);
    const limit = 1800;
    if (speed > limit) {
      vel.x *= limit / speed;
      vel.y *= limit / speed;
    }
    this.grab = null;
    this.wake();
  }

  /** Where a service is right now, in pixels from the map's top left corner. */
  positionOf(id: ServiceId): Vec {
    const body = this.byId.get(id);
    if (!body) return { x: 0, y: 0 };
    return { x: body.pos.x * this.scale, y: body.pos.y * this.scale };
  }

  destroy(): void {
    this.sleep();
    this.resizeObserver?.disconnect();
  }

  private measure(): void {
    const width = this.root.clientWidth;
    if (width === 0) return;
    this.scale = width / MAP.width;
    const particleRadius = (PARTICLE_PX / this.scale).toFixed(2);
    const pulseRadius = (PULSE_PX / this.scale).toFixed(2);
    for (const link of this.links) {
      for (const particle of link.particles) particle.setAttribute("r", particleRadius);
      link.pulse?.setAttribute("r", pulseRadius);
    }
    for (const body of this.bodies) {
      body.shownX = Number.NaN;
      body.shownY = Number.NaN;
    }
    this.render(performance.now(), 0);
  }

  private toMap(clientX: number, clientY: number): Vec {
    const box = this.root.getBoundingClientRect();
    return {
      x: ((clientX - box.left) / box.width) * MAP.width,
      y: ((clientY - box.top) / box.height) * MAP.height,
    };
  }

  private wake(): void {
    if (this.frame || !this.visible) return;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private sleep(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private readonly tick = (now: number): void => {
    const dt = Math.min(0.05, Math.max(0, (now - this.lastTime) / 1000));
    this.lastTime = now;
    if (this.flow) this.clock += dt;
    const moving = this.physics && this.step(dt);
    this.render(now, this.flow ? dt : 0);
    const pulsing = this.links.some((link) => link.pulsing);
    if (this.visible && (this.flow || moving || this.grab !== null || pulsing)) {
      this.frame = requestAnimationFrame(this.tick);
    } else {
      this.frame = 0;
    }
  };

  /** One step of the springs. Returns whether anything is still moving. */
  private step(dt: number): boolean {
    const cursor = this.cursor;
    for (const body of this.bodies) {
      let tx = body.home.x;
      let ty = body.home.y;
      if (this.flow) {
        tx += Math.sin(this.clock * BREATH_RATE + body.phase) * BREATH;
        ty += Math.cos(this.clock * BREATH_RATE * 0.8 + body.phase) * BREATH;
      }
      if (cursor) {
        tx += (cursor.x / MAP.width - 0.5) * PARALLAX * body.depth;
        ty += (cursor.y / MAP.height - 0.5) * PARALLAX * body.depth;
        const dx = body.home.x - cursor.x;
        const dy = body.home.y - cursor.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 1 && distance < PUSH_RADIUS) {
          const strength = (1 - distance / PUSH_RADIUS) ** 2 * PUSH;
          tx += (dx / distance) * strength;
          ty += (dy / distance) * strength;
        }
      }
      body.force = { x: (tx - body.pos.x) * SPRING, y: (ty - body.pos.y) * SPRING };
    }
    for (const link of this.links) {
      const { from, to } = link;
      const fx = (to.pos.x - from.pos.x - (to.home.x - from.home.x)) * TETHER;
      const fy = (to.pos.y - from.pos.y - (to.home.y - from.home.y)) * TETHER;
      from.force.x += fx;
      from.force.y += fy;
      to.force.x -= fx;
      to.force.y -= fy;
    }
    for (let i = 0; i < this.bodies.length; i += 1) {
      for (let j = i + 1; j < this.bodies.length; j += 1) {
        const a = this.bodies[i];
        const b = this.bodies[j];
        const dx = a.pos.x - b.pos.x;
        const dy = a.pos.y - b.pos.y;
        const distance = Math.hypot(dx, dy) || 0.001;
        if (distance >= PERSONAL_SPACE) continue;
        const push = (PERSONAL_SPACE - distance) * REPEL;
        a.force.x += (dx / distance) * push;
        a.force.y += (dy / distance) * push;
        b.force.x -= (dx / distance) * push;
        b.force.y -= (dy / distance) * push;
      }
    }
    let moving = false;
    const damping = Math.exp(-DAMPING * dt);
    for (const body of this.bodies) {
      if (this.grab?.body === body) {
        moving = true;
        continue;
      }
      body.vel.x = (body.vel.x + body.force.x * dt) * damping;
      body.vel.y = (body.vel.y + body.force.y * dt) * damping;
      body.pos.x = clamp(body.pos.x + body.vel.x * dt, EDGE, MAP.width - EDGE);
      body.pos.y = clamp(body.pos.y + body.vel.y * dt, EDGE, MAP.height - EDGE);
      if (Math.abs(body.vel.x) + Math.abs(body.vel.y) > 1.5) moving = true;
      else if (Math.abs(body.force.x) + Math.abs(body.force.y) > 40) moving = true;
    }
    return moving;
  }

  /** Writes the current state to the DOM. `dt` moves the requests along; 0 leaves them where they are. */
  private render(now: number, dt: number): void {
    const scale = this.scale;
    for (const body of this.bodies) {
      if (!body.el) continue;
      const x = (body.pos.x - body.home.x) * scale;
      const y = (body.pos.y - body.home.y) * scale;
      if (Math.abs(x - body.shownX) < 0.05 && Math.abs(y - body.shownY) < 0.05) continue;
      body.shownX = x;
      body.shownY = y;
      body.el.style.transform = Math.abs(x) < 0.05 && Math.abs(y) < 0.05 ? "" : `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    }

    for (const link of this.links) {
      const curve = linkCurve(link.from.pos, link.to.pos);
      link.line?.setAttribute("d", curvePath(curve));

      if (this.flow) {
        const length = Math.hypot(link.to.pos.x - link.from.pos.x, link.to.pos.y - link.from.pos.y) * 1.08 + 1;
        link.particles.forEach((particle, k) => {
          const t = (link.progress[k] + (dt * FLOW_SPEED) / length) % 1;
          link.progress[k] = t;
          const point = pointOn(curve, t);
          particle.setAttribute("cx", point.x.toFixed(1));
          particle.setAttribute("cy", point.y.toFixed(1));
          particle.setAttribute("opacity", Math.min(1, t / 0.14, (1 - t) / 0.14).toFixed(2));
        });
        this.particlesShown = true;
      }

      if (link.pulse && link.pulsing) {
        const t = (now - link.pulseStart) / this.pulseMs;
        if (t >= 1) {
          link.pulsing = false;
          link.pulse.setAttribute("opacity", "0");
        } else {
          const point = pointOn(curve, 1 - easeInOut(Math.max(0, t)));
          link.pulse.setAttribute("cx", point.x.toFixed(1));
          link.pulse.setAttribute("cy", point.y.toFixed(1));
          link.pulse.setAttribute("opacity", Math.min(1, t / 0.12, (1 - t) / 0.12).toFixed(2));
        }
      }
    }
  }

  private hideParticles(): void {
    if (!this.particlesShown) return;
    for (const link of this.links) for (const particle of link.particles) particle.setAttribute("opacity", "0");
    this.particlesShown = false;
  }
}
