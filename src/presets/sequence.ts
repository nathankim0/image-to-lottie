// Image frames to a flipbook Lottie: each frame is an image layer shown for `hold` composition frames.
// Use it for motion that transforms cannot fake, like a coin turning (see the `spin` command).
import { asset } from "../image/part.js";
import { document, imageLayer, transform } from "../lottie/build.js";
import type { Layer } from "../lottie/types.js";
import { num, type Preset } from "./types.js";

export const sequence: Preset = {
  name: "sequence",
  summary: "Frame images in order become a flipbook. Loops by default.",
  playback: "loop",
  parts: [{ name: "frames", description: "A folder or list of same-size images, in file name order." }],
  options: [
    { name: "hold", type: "number", default: "1", description: "Composition frames each image stays on screen." },
  ],
  build(input) {
    const frames = input.frames ?? [];
    if (frames.length === 0) throw new Error('Preset "sequence" needs at least one frame image');
    const first = frames[0]!;
    const fps = input.fps ?? 24;
    const hold = Math.max(1, Math.round(num(input.options, "hold", 1)));
    const W = input.width ?? first.width;
    const H = input.height ?? first.height;
    const op = frames.length * hold;
    const ctx = { op };
    const scale = Math.min(W / first.width, H / first.height) * 100;
    // Layers listed top first; frame i is visible from i*hold to (i+1)*hold.
    const layers: Layer[] = frames.map((part, i) =>
      imageLayer(
        ctx,
        `frame-${String(i + 1).padStart(3, "0")}`,
        i + 1,
        part.id,
        transform({
          position: [W / 2, H / 2, 0],
          anchor: [part.width / 2, part.height / 2, 0],
          scale: { a: 0, k: [scale, scale, 100] },
        }),
        { ip: i * hold, op: (i + 1) * hold },
      ),
    );
    return document({ name: "sequence", width: W, height: H, fps, frames: op, assets: frames.map(asset), layers });
  },
};
