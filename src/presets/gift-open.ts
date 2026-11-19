// A box shakes twice, crouches, pops its lid, and items rise out of it in a fan.
// Parts: base (open box without lid), lid, item (one reward, repeated).
import { asset, bottomCenter, visibleHeight, visibleWidth } from "../image/part.js";
import { EASE, anim, document, hex, imageLayer, transform } from "../lottie/build.js";
import { burst, glow, shadow, sparkle } from "../lottie/effects.js";
import type { Layer } from "../lottie/types.js";
import { num, requirePart, str, type Preset } from "./types.js";

export const giftOpen: Preset = {
  name: "gift-open",
  summary: "Box shakes, pops its lid, and items fan out above it. Plays once and holds.",
  playback: "once",
  parts: [
    { name: "base", description: "Open box without a lid, front view. Empty inside." },
    { name: "lid", description: "The lid alone, same width and camera as the base." },
    { name: "item", description: "One reward object. It is repeated `items` times." },
  ],
  options: [
    { name: "overlap", type: "number", default: "46% of base height", description: "Pixels (in base image space) the lid's visible bottom sits below the base's visible top. Find it with `fit`." },
    { name: "items", type: "number", default: "3", description: "How many items rise out (1 to 5)." },
    { name: "itemWidth", type: "number", default: "0.6", description: "Item width as a share of the box width." },
    { name: "glow", type: "string", default: "#ffeea0", description: "Burst glow color." },
    { name: "sparkle", type: "string", default: "#ffcc40", description: "Sparkle color." },
  ],
  build(input) {
    const base = requirePart(input, "base", "gift-open");
    const lid = requirePart(input, "lid", "gift-open");
    const item = requirePart(input, "item", "gift-open");
    const W = input.width ?? 600;
    const H = input.height ?? 720;
    const fps = input.fps ?? 60;
    const op = Math.round(2.5 * fps);
    const f = (frame60: number) => Math.round((frame60 * fps) / 60);
    const ctx = { op };
    const o = input.options;

    const bw = visibleWidth(base);
    const bh = visibleHeight(base);
    const scale = (0.62 * W) / bw; // box takes 62% of the width
    const Wd = bw * scale;
    const Hd = bh * scale;
    const floorY = H - 30;
    const topY = floorY - Hd;
    const cx = W / 2;
    const opening = [cx, topY + Hd * 0.035];

    // Lid sits on the base in base image space (it is parented to the base).
    const overlap = num(o, "overlap", Math.round(bh * 0.46));
    const baseAnchor = bottomCenter(base);
    const lidAnchor = bottomCenter(lid);
    const lx = (base.bounds.left + base.bounds.right) / 2;
    const ly = base.bounds.top + overlap;
    const lift = (share: number) => ly - bh * share;

    const s = (x: number, y: number) => [x * scale * 100, y * scale * 100, 100];
    const baseLayer = imageLayer(
      ctx,
      "box-base",
      20,
      base.id,
      transform({
        position: [cx, floorY, 0],
        anchor: baseAnchor,
        scale: anim([
          [0, s(1, 1)],
          [f(40), s(1, 1)],
          [f(50), s(1.07, 0.91), EASE.anticipate],
          [f(56), s(0.95, 1.07), EASE.pop],
          [f(63), s(1.02, 0.98)],
          [f(72), s(1, 1)],
        ]),
        rotation: anim([
          [0, 0],
          [f(12), 0],
          [f(17), -5, EASE.sine],
          [f(22), 4, EASE.sine],
          [f(27), -3, EASE.sine],
          [f(32), 2, EASE.sine],
          [f(38), 0, EASE.sine],
        ]),
      }),
    );

    const lidLayer = imageLayer(
      ctx,
      "box-lid",
      10,
      lid.id,
      transform({
        anchor: lidAnchor,
        position: anim([
          [0, [lx, ly, 0]],
          [f(14), [lx, ly, 0]],
          [f(19), [lx, lift(0.057), 0], EASE.launch],
          [f(24), [lx, ly, 0], EASE.accel],
          [f(29), [lx, lift(0.042), 0], EASE.launch],
          [f(34), [lx, ly, 0], EASE.accel],
          [f(50), [lx, ly, 0]],
          [f(64), [lx - bw * 0.1, lift(0.42), 0], EASE.pop],
          [f(80), [lx - bw * 0.2, lift(0.58), 0], EASE.accel],
        ]),
        rotation: anim([
          [0, 0],
          [f(50), 0],
          [f(64), -22, EASE.pop],
          [f(80), -40, EASE.accel],
        ]),
        opacity: anim([
          [0, 100],
          [f(60), 100],
          [f(76), 0, EASE.accel],
        ]),
      }),
      { parent: 20 },
    );

    // Items start inside the box (behind its front face) and fan out above it.
    const count = Math.min(5, Math.max(1, Math.round(num(o, "items", 3))));
    const itemScale = ((num(o, "itemWidth", 0.6) * Wd) / visibleWidth(item)) * 100;
    const itemAnchor = [(item.bounds.left + item.bounds.right) / 2, (item.bounds.top + item.bounds.bottom) / 2, 0];
    const spreads = count === 1 ? [0] : Array.from({ length: count }, (_, i) => -1 + (2 * i) / (count - 1));
    const order = spreads.map((sp, i) => ({ sp, i })).sort((a, b) => Math.abs(a.sp) - Math.abs(b.sp));
    const items: Layer[] = order.map(({ sp }, rank) => {
      const start = f(56 + rank * 4);
      const ex = cx + sp * Wd * 0.3 * (count > 3 ? 1.25 : 1);
      const ey = topY - Hd * (0.57 - 0.18 * Math.abs(sp));
      const rot = sp * 20 - (sp === 0 ? 4 : 0);
      return imageLayer(
        ctx,
        `item-${rank + 1}`,
        31 + rank,
        item.id,
        transform({
          anchor: itemAnchor,
          position: anim([
            [start, [cx, opening[1]! + Hd * 0.38, 0]],
            [start + f(18), [ex, ey - 18, 0], EASE.pop],
            [start + f(30), [ex, ey, 0]],
            [f(118), [ex, ey - 8, 0], EASE.sine],
            [op - 1, [ex, ey - 4, 0], EASE.sine],
          ]),
          scale: anim([
            [start, [itemScale * 0.65, itemScale * 0.65, 100]],
            [start + f(18), [itemScale * 1.13, itemScale * 1.13, 100], EASE.pop],
            [start + f(30), [itemScale, itemScale, 100]],
          ]),
          rotation: anim([
            [start, 0],
            [start + f(18), rot * 1.25, EASE.pop],
            [start + f(30), rot],
          ]),
          opacity: anim([
            [0, 0],
            [start, 0],
            [start + 4, 100, EASE.launch],
          ]),
        }),
      );
    });

    const sparkleRgb = hex(str(o, "sparkle", "#ffcc40"));
    const glowRgb = hex(str(o, "glow", "#ffeea0"));
    const layers: Layer[] = [
      sparkle(ctx, 1, [cx - Wd * 0.42, topY - Hd * 0.55], 26, f(84), sparkleRgb),
      sparkle(ctx, 2, [cx + Wd * 0.45, topY - Hd * 0.68], 32, f(92), sparkleRgb),
      sparkle(ctx, 3, [cx + Wd * 0.37, topY - Hd * 0.17], 20, f(102), sparkleRgb),
      lidLayer,
      baseLayer,
      ...items,
      ...burst(ctx, 40, [opening[0]!, opening[1]! - 10], f(52), [sparkleRgb, [0.45, 0.88, 0.63], [1, 1, 1]], {
        distance: Hd * 0.7,
      }),
      glow(ctx, 60, [cx, topY - Hd * 0.3], Wd * 0.62, glowRgb, {
        scale: anim([
          [0, [0, 0, 100]],
          [f(50), [0, 0, 100]],
          [f(58), [125, 125, 100], EASE.pop],
          [f(76), [100, 100, 100]],
          [f(118), [106, 106, 100], EASE.sine],
          [op - 1, [100, 100, 100], EASE.sine],
        ]),
        opacity: anim([
          [0, 0],
          [f(50), 0],
          [f(54), 100, EASE.launch],
          [f(90), 75],
        ]),
      }),
      shadow(ctx, 61, [cx, floorY + 4], Wd * 0.9, {
        scale: anim([
          [0, [100, 100, 100]],
          [f(50), [108, 108, 100], EASE.anticipate],
          [f(56), [94, 94, 100], EASE.pop],
          [f(72), [100, 100, 100]],
        ]),
      }),
    ];

    return document({
      name: "gift-open",
      width: W,
      height: H,
      fps,
      frames: op,
      assets: [asset(base), asset(lid), asset(item)],
      layers,
    });
  },
};
