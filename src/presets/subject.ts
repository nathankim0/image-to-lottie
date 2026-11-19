// Presets that animate one subject image: hop (loop), float (loop), pop-in (once).
import { asset, bottomCenter, visibleCenter, visibleHeight, visibleWidth, type Part } from "../image/part.js";
import { EASE, anim, document, hex, imageLayer, transform } from "../lottie/build.js";
import { burst, glow, shadow, sparkle } from "../lottie/effects.js";
import type { Layer } from "../lottie/types.js";
import { num, requirePart, str, type Preset, type PresetInput } from "./types.js";

interface Stage {
  part: Part;
  W: number;
  H: number;
  fps: number;
  scale: number;
  Wd: number;
  Hd: number;
  floorY: number;
  cx: number;
  f: (frame60: number) => number;
}

function stage(input: PresetInput, preset: string, defaultSeconds: number, fill = 0.72): Stage & { op: number } {
  const part = requirePart(input, "subject", preset);
  const W = input.width ?? 600;
  const H = input.height ?? 600;
  const fps = input.fps ?? 60;
  const op = Math.round(num(input.options, "seconds", defaultSeconds) * fps);
  const scale = Math.min((fill * W) / visibleWidth(part), (fill * H) / visibleHeight(part));
  return {
    part,
    W,
    H,
    fps,
    op,
    scale,
    Wd: visibleWidth(part) * scale,
    Hd: visibleHeight(part) * scale,
    floorY: H * 0.86,
    cx: W / 2,
    f: (frame60: number) => Math.round((frame60 * fps) / 60),
  };
}

const sc = (st: Stage, x: number, y: number) => [x * st.scale * 100, y * st.scale * 100, 100];

export const hop: Preset = {
  name: "hop",
  summary: "Crouch, jump, wiggle in the air, land with a squash, breathe. Seamless loop.",
  playback: "loop",
  parts: [{ name: "subject", description: "One object that sits on the ground." }],
  options: [
    { name: "seconds", type: "number", default: "2.5", description: "Loop length." },
    { name: "jump", type: "number", default: "0.11", description: "Jump height as a share of the subject height." },
    { name: "glow", type: "string", default: "#c8f2d8", description: "Ambient glow color behind the subject." },
    { name: "sparkle", type: "string", default: "#ffc93c", description: "Sparkle color." },
  ],
  build(input) {
    const st = stage(input, "hop", 2.5, 0.66);
    const { f, op, cx, floorY, Hd, Wd } = st;
    const ctx = { op };
    const jump = Hd * num(input.options, "jump", 0.11);
    const y = (v: number) => [cx, v, 0];
    const subject = imageLayer(
      ctx,
      "subject",
      3,
      st.part.id,
      transform({
        anchor: bottomCenter(st.part),
        position: anim([
          [0, y(floorY)],
          [f(20), y(floorY)],
          [f(32), y(floorY), EASE.anticipate],
          [f(50), y(floorY - jump), EASE.launch],
          [f(58), y(floorY - jump * 1.08), EASE.sine],
          [f(72), y(floorY), EASE.fall],
          [op - 1, y(floorY)],
        ]),
        scale: anim([
          [0, sc(st, 1, 1)],
          [f(20), sc(st, 1, 1)],
          [f(32), sc(st, 1.07, 0.91), EASE.anticipate],
          [f(40), sc(st, 0.95, 1.07), EASE.launch],
          [f(50), sc(st, 1, 1)],
          [f(72), sc(st, 1, 1), EASE.fall],
          [f(76), sc(st, 1.09, 0.89), EASE.launch],
          [f(86), sc(st, 0.97, 1.04)],
          [f(96), sc(st, 1, 1)],
          [Math.round((f(96) + op) / 2), sc(st, 1.015, 1.015), EASE.sine],
          [op - 1, sc(st, 1, 1), EASE.sine],
        ]),
        rotation: anim([
          [0, 0],
          [f(32), 0],
          [f(50), -6, EASE.launch],
          [f(58), 5, EASE.sine],
          [f(66), -2, EASE.sine],
          [f(76), 0],
          [op - 1, 0],
        ]),
      }),
    );
    const sparkleRgb = hex(str(input.options, "sparkle", "#ffc93c"));
    const layers: Layer[] = [
      sparkle(ctx, 1, [cx - Wd * 0.62, floorY - Hd * 0.8], 24, f(44), sparkleRgb),
      sparkle(ctx, 2, [cx + Wd * 0.58, floorY - Hd * 0.9], 30, f(54), sparkleRgb),
      sparkle(ctx, 4, [cx + Wd * 0.64, floorY - Hd * 0.35], 18, f(66), sparkleRgb),
      subject,
      shadow(ctx, 5, [cx, floorY + 2], Wd * 0.8, {
        scale: anim([
          [0, [100, 100, 100]],
          [f(20), [100, 100, 100]],
          [f(32), [108, 108, 100], EASE.anticipate],
          [f(50), [68, 68, 100], EASE.launch],
          [f(58), [66, 66, 100], EASE.sine],
          [f(72), [100, 100, 100], EASE.fall],
          [f(76), [110, 110, 100], EASE.launch],
          [f(96), [100, 100, 100]],
          [op - 1, [100, 100, 100]],
        ]),
      }),
      glow(ctx, 6, [cx, floorY - Hd * 0.5], Math.max(Wd, Hd) * 0.62, hex(str(input.options, "glow", "#c8f2d8")), {
        scale: anim([
          [0, [96, 96, 100]],
          [Math.round(op / 2), [104, 104, 100], EASE.sine],
          [op - 1, [96, 96, 100], EASE.sine],
        ]),
        opacity: anim([
          [0, 70],
          [Math.round(op / 2), 100, EASE.sine],
          [op - 1, 70, EASE.sine],
        ]),
      }),
    ];
    return document({ name: "hop", width: st.W, height: st.H, fps: st.fps, frames: op, assets: [asset(st.part)], layers });
  },
};

export const float: Preset = {
  name: "float",
  summary: "Gentle bob with a slight sway, breathing shadow and glow. Seamless loop.",
  playback: "loop",
  parts: [{ name: "subject", description: "One object that hovers." }],
  options: [
    { name: "seconds", type: "number", default: "3", description: "Loop length." },
    { name: "distance", type: "number", default: "0.05", description: "Bob distance as a share of the subject height." },
    { name: "glow", type: "string", default: "#c8f2d8", description: "Ambient glow color." },
  ],
  build(input) {
    const st = stage(input, "float", 3, 0.66);
    const { op, cx, floorY, Hd, Wd } = st;
    const ctx = { op };
    const mid = Math.round(op / 2);
    const lift = Hd * num(input.options, "distance", 0.05);
    const restY = floorY - Hd * 0.12;
    const layers: Layer[] = [
      imageLayer(
        ctx,
        "subject",
        1,
        st.part.id,
        transform({
          anchor: bottomCenter(st.part),
          scale: { a: 0, k: sc(st, 1, 1) },
          position: anim([
            [0, [cx, restY, 0]],
            [mid, [cx, restY - lift, 0], EASE.sine],
            [op - 1, [cx, restY, 0], EASE.sine],
          ]),
          rotation: anim([
            [0, -1.5],
            [mid, 1.5, EASE.sine],
            [op - 1, -1.5, EASE.sine],
          ]),
        }),
      ),
      shadow(ctx, 2, [cx, floorY], Wd * 0.7, {
        scale: anim([
          [0, [100, 100, 100]],
          [mid, [86, 86, 100], EASE.sine],
          [op - 1, [100, 100, 100], EASE.sine],
        ]),
        opacity: anim([
          [0, 100],
          [mid, 70, EASE.sine],
          [op - 1, 100, EASE.sine],
        ]),
      }),
      glow(ctx, 3, [cx, restY - Hd * 0.5], Math.max(Wd, Hd) * 0.62, hex(str(input.options, "glow", "#c8f2d8")), {
        opacity: anim([
          [0, 65],
          [mid, 100, EASE.sine],
          [op - 1, 65, EASE.sine],
        ]),
      }),
    ];
    return document({ name: "float", width: st.W, height: st.H, fps: st.fps, frames: op, assets: [asset(st.part)], layers });
  },
};

export const popIn: Preset = {
  name: "pop-in",
  summary: "Subject springs in with a glow burst, particles, and sparkles. Plays once and holds.",
  playback: "once",
  parts: [{ name: "subject", description: "One reward or result object." }],
  options: [
    { name: "seconds", type: "number", default: "1.6", description: "Total length; the end holds still." },
    { name: "glow", type: "string", default: "#ffeea0", description: "Burst glow color." },
    { name: "sparkle", type: "string", default: "#ffcc40", description: "Sparkle and particle color." },
  ],
  build(input) {
    const st = stage(input, "pop-in", 1.6, 0.6);
    const { f, op, cx, H, Hd, Wd } = st;
    const ctx = { op };
    const cy = H * 0.5;
    const sparkleRgb = hex(str(input.options, "sparkle", "#ffcc40"));
    const layers: Layer[] = [
      sparkle(ctx, 1, [cx - Wd * 0.6, cy - Hd * 0.45], 24, f(22), sparkleRgb),
      sparkle(ctx, 2, [cx + Wd * 0.58, cy - Hd * 0.55], 30, f(28), sparkleRgb),
      sparkle(ctx, 3, [cx + Wd * 0.5, cy + Hd * 0.35], 18, f(36), sparkleRgb),
      imageLayer(
        ctx,
        "subject",
        10,
        st.part.id,
        transform({
          anchor: visibleCenter(st.part),
          position: [cx, cy, 0],
          scale: anim([
            [0, sc(st, 0, 0)],
            [f(4), sc(st, 0, 0)],
            [f(20), sc(st, 1.14, 1.14), EASE.pop],
            [f(28), sc(st, 0.96, 0.96)],
            [f(36), sc(st, 1, 1)],
          ]),
          rotation: anim([
            [f(4), -14],
            [f(20), 6, EASE.pop],
            [f(32), 0],
          ]),
          opacity: anim([
            [0, 0],
            [f(4), 0],
            [f(8), 100, EASE.launch],
          ]),
        }),
      ),
      ...burst(ctx, 20, [cx, cy], f(12), [sparkleRgb, [1, 1, 1]], { count: 10, distance: Math.max(Wd, Hd) * 0.75, spread: [0, 340] }),
      glow(ctx, 40, [cx, cy], Math.max(Wd, Hd) * 0.7, hex(str(input.options, "glow", "#ffeea0")), {
        scale: anim([
          [0, [0, 0, 100]],
          [f(6), [0, 0, 100]],
          [f(18), [120, 120, 100], EASE.pop],
          [f(40), [100, 100, 100]],
        ]),
        opacity: anim([
          [0, 0],
          [f(6), 0],
          [f(10), 100, EASE.launch],
          [f(60), 70],
        ]),
      }),
    ];
    return document({ name: "pop-in", width: st.W, height: st.H, fps: st.fps, frames: op, assets: [asset(st.part)], layers });
  },
};
