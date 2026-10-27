import { cross, dot, normalize, sub, type Vec3 } from "./math";

/**
 * A minimal perspective camera that orbits a target point.
 *
 * World axes: x to the right, y up, z away from the viewer. `yaw` swings the camera around the
 * target, `pitch` lifts it above the floor. Points are projected to canvas pixels with a plain
 * pinhole model, so the floor, the slabs and the packets all share one real perspective.
 */

export type CameraParams = { target: Vec3; yaw: number; pitch: number; distance: number };

export type Camera = {
  eye: Vec3;
  right: Vec3;
  up: Vec3;
  forward: Vec3;
  /** Focal length in pixels. */
  focal: number;
  /** Screen centre in pixels. */
  cx: number;
  cy: number;
};

/** A projected point: pixel position, pixels per world unit at that depth, and distance along the view axis. */
export type Projected = { x: number; y: number; scale: number; depth: number };

export const FOV_DEGREES = 34;
const NEAR = 30;

/** Focal length in pixels for a viewport height. */
export const focalFor = (height: number, fovDegrees = FOV_DEGREES) => height / 2 / Math.tan((fovDegrees * Math.PI) / 360);

export function makeCamera(params: CameraParams, width: number, height: number): Camera {
  const { target, yaw, pitch, distance } = params;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const eye: Vec3 = [
    target[0] + distance * cp * Math.sin(yaw),
    target[1] + distance * sp,
    target[2] - distance * cp * Math.cos(yaw),
  ];
  const forward = normalize(sub(target, eye));
  const right = normalize(cross([0, 1, 0], forward));
  const up = cross(forward, right);
  return { eye, right, up, forward, focal: focalFor(height), cx: width / 2, cy: height / 2 };
}

export function project(camera: Camera, point: Vec3): Projected | null {
  const d = sub(point, camera.eye);
  const depth = dot(d, camera.forward);
  if (depth < NEAR) return null;
  const scale = camera.focal / depth;
  return { x: camera.cx + dot(d, camera.right) * scale, y: camera.cy - dot(d, camera.up) * scale, scale, depth };
}

/** Distance that makes `worldWidth` x `worldHeight` fill about 90% of a viewport. */
export function fitDistance(worldWidth: number, worldHeight: number, width: number, height: number): number {
  const focal = focalFor(height);
  return Math.max((worldWidth * focal) / (width * 0.9), (worldHeight * focal) / (height * 0.9));
}
