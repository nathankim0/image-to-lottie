// Party poppers in the bottom corners pull back, pop, and throw confetti that arcs up and falls.
// Part: popper (one popper pointing up-right: tip at lower-left, open mouth at upper-right).
// The right popper is the same image mirrored. Confetti is vector, so it stays crisp and light.
import { asset, type Part } from "../image/part.js";
import {
  EASE,
  anim,
  document,
  ellipse,
  group,
  hex,
  imageLayer,
  rect,
  shapeLayer,
  solidFill,
  splitPosition,
  transform,
  type LayerContext,
} from "../lottie/build.js";
import { glow, sparkle } from "../lottie/effects.js";
import type { Layer, Vec } from "../lottie/types.js";
import { num, requirePart, str, type Preset } from "./types.js";

/** Small deterministic random generator so the same config always renders the same burst. */
function random(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

interface Popper {
  side: "left" | "right";
  tip: Vec;
  mouth: Vec;
  /** Launch direction in degrees, 0 = right, 90 = up. */
  angle: number;
}

function confettiPiece(
  ctx: LayerContext,
  ind: number,
  from: Vec,
  angleDeg: number,
  speed: number,
  start: number,
  life: number,
  floorY: number,
  color: Vec,
  kind: number,
  rnd: () => number,
): Layer {
  const a = (angleDeg * Math.PI) / 180;
  const apexT = Math.round(life * (0.24 + rnd() * 0.08));
  const rise = speed * Math.sin(a);
  const run = speed * Math.cos(a);
  const x0 = from[0]!;
  const y0 = from[1]!;
  const xApex = x0 + run * 0.72;
  const xEnd = x0 + run * (1.05 + rnd() * 0.25);
  const yApex = y0 - rise;
  const yEnd = Math.min(floorY, yApex + speed * (0.75 + rnd() * 0.5));
  const end = start + life;
  // x slows down (air drag); y decelerates to the apex, then falls faster and faster.
  const position = splitPosition(
    anim([
      [start, x0],
      [start + apexT, xApex, EASE.launch],
      [end, xEnd, EASE.settle],
    ]),
    anim([
      [start, y0],
      [start + apexT, yApex, EASE.launch],
      [end, yEnd, EASE.fall],
    ]),
  );
  // Paper flips: squeeze x back and forth while it tumbles.
  const flips = 3 + Math.floor(rnd() * 3);
  const flipKeys: [number, Vec, (typeof EASE)["sine"]][] = [];
  for (let i = 1; i <= flips * 2; i++) {
    const t = start + Math.round((life * i) / (flips * 2));
    flipKeys.push([t, [i % 2 ? 15 : 100, 100, 100], EASE.sine]);
  }
  const spin = (rnd() < 0.5 ? -1 : 1) * (240 + rnd() * 360);
  const shape =
    kind === 0 ? rect(24, 14, 2.5) : kind === 1 ? ellipse(15) : rect(7, 30, 3.5); // paper, dot, ribbon
  return shapeLayer(
    ctx,
    `confetti-${ind}`,
    ind,
    transform({
      position,
      rotation: anim([
        [start, rnd() * 90],
        [end, rnd() * 90 + spin, EASE.settle],
      ]),
      scale: anim([[start, [100, 100, 100]], ...flipKeys]),
      opacity: anim([
        [0, 0],
        [start, 0],
        [start + 1, 100],
        [end - Math.round(life * 0.2), 100],
        [end, 0, EASE.accel],
      ]),
    }),
    [group([shape, solidFill(color)])],
    { ip: Math.max(0, start - 1), op: Math.min(ctx.op, end + 1) },
  );
}

export const fanfare: Preset = {
  name: "fanfare",
  summary: "Party poppers pull back, pop, and throw arcing confetti. Plays once and holds.",
  playback: "once",
  parts: [
    { name: "popper", description: "One party popper pointing up-right: tip at the lower-left, open mouth at the upper-right." },
  ],
  options: [
    { name: "sides", type: "string", default: "both", description: "left, right, or both corners." },
    { name: "pieces", type: "number", default: "34", description: "Confetti pieces per popper." },
    { name: "colors", type: "string", default: "#ff7a8a,#ffc94a,#b49cff,#5fd3a1,#5bb8ff", description: "Confetti colors, comma-separated." },
    { name: "seed", type: "number", default: "7", description: "Change for a different confetti pattern." },
  ],
  build(input) {
    const part: Part = requirePart(input, "popper", "fanfare");
    const W = input.width ?? 600;
    const H = input.height ?? 600;
    const fps = input.fps ?? 60;
    const f = (frame60: number) => Math.round((frame60 * fps) / 60);
    const op = Math.round(2.4 * fps);
    const ctx = { op };
    const o = input.options;
    const rnd = random(num(o, "seed", 7));
    const colors = str(o, "colors", "#ff7a8a,#ffc94a,#b49cff,#5fd3a1,#5bb8ff").split(",").map(hex);
    const pieces = Math.max(4, Math.round(num(o, "pieces", 34)));
    const sides = str(o, "sides", "both");

    const b = part.bounds;
    const vw = b.right - b.left + 1;
    const scale = (0.24 * W) / vw;
    // Pivot at the tip (lower-left of the visible popper); the mouth is near its upper-right.
    const vh = b.bottom - b.top + 1;
    const tipImg: Vec = [b.left + vw * 0.05, b.bottom - vh * 0.05, 0];
    const mouthImg: Vec = [b.right - vw * 0.3, b.top + vh * 0.3];
    const margin = W * 0.08;
    const poppers: Popper[] = [];
    const tipY = H - H * 0.07;
    const toScreen = (side: "left" | "right", tipX: number): Popper => {
      const dx = (mouthImg[0]! - tipImg[0]!) * scale;
      const dy = (mouthImg[1]! - tipImg[1]!) * scale;
      return side === "left"
        ? { side, tip: [tipX, tipY], mouth: [tipX + dx, tipY + dy], angle: 52 }
        : { side, tip: [tipX, tipY], mouth: [tipX - dx, tipY + dy], angle: 128 };
    };
    if (sides !== "right") poppers.push(toScreen("left", margin));
    if (sides !== "left") poppers.push(toScreen("right", W - margin));

    const popAt = f(18);
    const layers: Layer[] = [];
    let ind = 100;
    for (const p of poppers) {
      const sx = p.side === "left" ? scale * 100 : -scale * 100;
      const sy = scale * 100;
      const dir = p.side === "left" ? 1 : -1;
      layers.push(
        imageLayer(
          ctx,
          `popper-${p.side}`,
          ind++,
          part.id,
          transform({
            anchor: tipImg,
            position: [p.tip[0]!, p.tip[1]!, 0],
            scale: anim([
              [0, [sx, sy, 100]],
              [f(6), [sx, sy, 100]],
              [popAt - 2, [sx * 0.94, sy * 1.05, 100], EASE.anticipate], // pull back
              [popAt + 3, [sx * 1.1, sy * 0.92, 100], EASE.pop], // recoil
              [popAt + 12, [sx * 0.98, sy * 1.02, 100]],
              [popAt + 22, [sx, sy, 100]],
            ]),
            rotation: anim([
              [0, 0],
              [f(6), 0],
              [popAt - 2, -7 * dir, EASE.anticipate],
              [popAt + 3, 6 * dir, EASE.pop],
              [popAt + 22, 0],
            ]),
          }),
        ),
      );
    }
    // Confetti and flash per popper. Pieces leave over a few frames, spread around the aim.
    const confetti: Layer[] = [];
    const flashes: Layer[] = [];
    for (const p of poppers) {
      for (let i = 0; i < pieces; i++) {
        const angle = p.angle + (rnd() - 0.5) * 70;
        const speed = H * (0.3 + rnd() * 0.32);
        const start = popAt + Math.floor(rnd() * 5);
        const life = f(70 + rnd() * 40);
        confetti.push(
          confettiPiece(ctx, ind++, p.mouth, angle, speed, start, life, H + 40, colors[i % colors.length]!, i % 3, rnd),
        );
      }
      flashes.push(
        glow(ctx, ind++, p.mouth, W * 0.12, hex("#fff3c4"), {
          scale: anim([
            [0, [0, 0, 100]],
            [popAt, [0, 0, 100]],
            [popAt + 5, [130, 130, 100], EASE.pop],
            [popAt + 18, [60, 60, 100], EASE.accel],
          ]),
          opacity: anim([
            [0, 0],
            [popAt, 0],
            [popAt + 2, 100],
            [popAt + 18, 0, EASE.accel],
          ]),
        }),
      );
    }
    const sparkleRgb = colors[1] ?? hex("#ffc94a");
    const sparkles = [
      sparkle(ctx, 1, [W * 0.3, H * 0.28], 22, popAt + f(16), sparkleRgb),
      sparkle(ctx, 2, [W * 0.66, H * 0.2], 28, popAt + f(24), sparkleRgb),
      sparkle(ctx, 3, [W * 0.52, H * 0.42], 18, popAt + f(34), sparkleRgb),
    ];
    // Top of the list draws on top: confetti over sparkles over poppers over flashes.
    return document({
      name: "fanfare",
      width: W,
      height: H,
      fps,
      frames: op,
      assets: [asset(part)],
      layers: [...confetti, ...sparkles, ...layers, ...flashes],
    });
  },
};
