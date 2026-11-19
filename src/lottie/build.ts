// Small builders for Lottie JSON: keyframes with named easing, transforms, layers.
import type { Animation, ImageAsset, Keyframe, Layer, Prop, SplitPosition, Transform, Vec } from "./types.js";

/** Cubic-bezier easing as [[x1, y1], [x2, y2]]. */
export type Ease = readonly [readonly [number, number], readonly [number, number]];

// Named easing anchors. Pick by what the layer is doing, not by layer type.
export const EASE = {
  /** Deep ease-out, no bounce: landing, settling. */
  settle: [[0.0, 0.65], [0.51, 0.99]],
  /** Smooth both ends: loops, breathing, floating. */
  sine: [[0.37, 0.0], [0.63, 1.0]],
  /** Slow start into a squash, before a jump. */
  anticipate: [[0.4, 0.0], [0.2, 1.0]],
  /** Fast in, soft land: things leaving the ground or entering. */
  launch: [[0.2, 0.75], [0.34, 0.94]],
  /** Fast out with a soft settle: the hero beat. */
  pop: [[0.94, 0.75], [0.34, 0.94]],
  /** Gentle start, fast end: exits, falling. */
  accel: [[0.55, 0.0], [1.0, 1.0]],
  /** Gravity-like fall. */
  fall: [[0.55, 0.0], [0.9, 0.6]],
} as const satisfies Record<string, Ease>;

/** One keyframe: [frame, value] or [frame, value, easeIntoThisKeyframe]. */
export type Key = readonly [number, number | Vec] | readonly [number, number | Vec, Ease];

/** Animated property. The ease on a key controls the segment that ends at that key. */
export function anim(keys: readonly Key[], fallback: Ease = EASE.settle): Prop {
  const sorted = [...keys].sort((a, b) => a[0] - b[0]);
  const k: Keyframe[] = sorted.map((key, idx) => {
    const [t, v] = key;
    const frame: Keyframe = { t, s: Array.isArray(v) ? [...v] : [v as number] };
    const next = sorted[idx + 1];
    if (next) {
      const e = (next[2] ?? fallback) as Ease;
      frame.o = { x: [e[0][0]], y: [e[0][1]] };
      frame.i = { x: [e[1][0]], y: [e[1][1]] };
    }
    return frame;
  });
  return { a: 1, k };
}

export function fixed(value: unknown): Prop {
  return { a: 0, k: value };
}

export interface TransformInput {
  position: Prop | Vec | SplitPosition;
  anchor?: Prop | Vec;
  scale?: Prop;
  rotation?: Prop;
  opacity?: Prop;
}

export function transform(t: TransformInput): Transform {
  const asProp = (v: Prop | Vec | undefined, d: Vec): Prop =>
    v === undefined ? fixed(d) : Array.isArray(v) ? fixed(v) : v;
  return {
    o: t.opacity ?? fixed(100),
    r: t.rotation ?? fixed(0),
    p: isSplit(t.position) ? t.position : asProp(t.position, [0, 0, 0]),
    a: asProp(t.anchor, [0, 0, 0]),
    s: t.scale ?? fixed([100, 100, 100]),
  };
}

function isSplit(p: unknown): p is SplitPosition {
  return typeof p === "object" && p !== null && (p as SplitPosition).s === true;
}

/** Position whose x and y move on separate curves, e.g. drag on x and gravity on y. */
export function splitPosition(x: Prop, y: Prop): SplitPosition {
  return { s: true, x, y };
}

export function rect(w: number, h: number, roundness = 0): unknown {
  return { ty: "rc", p: fixed([0, 0]), s: fixed([w, h]), r: fixed(roundness), d: 1 };
}

export interface LayerContext {
  op: number;
}

export function imageLayer(
  ctx: LayerContext,
  nm: string,
  ind: number,
  refId: string,
  ks: Transform,
  extra: Partial<Layer> = {},
): Layer {
  return { ty: 2, nm, ind, ip: 0, op: ctx.op, st: 0, sr: 1, ao: 0, bm: 0, ks, refId, ...extra };
}

export function shapeLayer(
  ctx: LayerContext,
  nm: string,
  ind: number,
  ks: Transform,
  shapes: unknown[],
  extra: Partial<Layer> = {},
): Layer {
  return { ty: 4, nm, ind, ip: 0, op: ctx.op, st: 0, sr: 1, ao: 0, bm: 0, ks, shapes, ...extra };
}

/** Shape group with its transform last, as the spec requires. */
export function group(items: unknown[], opacity = 100): unknown {
  return {
    ty: "gr",
    nm: "group",
    it: [
      ...items,
      {
        ty: "tr",
        p: fixed([0, 0]),
        a: fixed([0, 0]),
        s: fixed([100, 100]),
        r: fixed(0),
        o: fixed(opacity),
        sk: fixed(0),
        sa: fixed(0),
      },
    ],
  };
}

export function ellipse(w: number, h: number = w): unknown {
  return { ty: "el", p: fixed([0, 0]), s: fixed([w, h]), d: 1 };
}

export function star4(radius: number): unknown {
  return {
    ty: "sr",
    sy: 1,
    d: 1,
    pt: fixed(4),
    p: fixed([0, 0]),
    r: fixed(0),
    or: fixed(radius),
    os: fixed(0),
    ir: fixed(radius * 0.28),
    is: fixed(0),
  };
}

export function solidFill(rgb: Vec, opacity = 100): unknown {
  return { ty: "fl", c: fixed([...rgb, 1]), o: fixed(opacity), r: 1 };
}

/** Radial gradient fill: color stops [pos, r, g, b]..., then alpha stops [pos, a]... */
export function radialFill(radius: number, colorStops: Vec[], alphaStops: Vec[]): unknown {
  return {
    ty: "gf",
    o: fixed(100),
    r: 1,
    t: 2,
    s: fixed([0, 0]),
    e: fixed([radius, 0]),
    h: fixed(0),
    a: fixed(0),
    g: { p: colorStops.length, k: fixed([...colorStops.flat(), ...alphaStops.flat()]) },
  };
}

/** "#rrggbb" to [r, g, b] in 0..1. */
export function hex(color: string): Vec {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) throw new Error(`Expected a #rrggbb color, got "${color}"`);
  const n = parseInt(m[1]!, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function document(input: {
  name: string;
  width: number;
  height: number;
  fps: number;
  frames: number;
  assets: ImageAsset[];
  layers: Layer[];
}): Animation {
  return {
    v: "5.7.0",
    fr: input.fps,
    ip: 0,
    op: input.frames,
    w: input.width,
    h: input.height,
    nm: input.name,
    ddd: 0,
    assets: input.assets,
    layers: input.layers,
  };
}
