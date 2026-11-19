// Fake a coin-style turn from one front image: squeeze horizontally by |cos|, darken the edge-on frames.
// Feed the frames to the `sequence` preset. This is the "PNG sequence for the spinning part" trick.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
export async function spinFrames(imagePath, outDir, count = 16, size) {
    // Frames are stored once per step, so keep them only as large as they will be shown.
    const source = size
        ? await sharp(imagePath).resize(size, size, { fit: "inside" }).png().toBuffer()
        : await sharp(imagePath).png().toBuffer();
    const meta = await sharp(source).metadata();
    const width = meta.width;
    const height = meta.height;
    await mkdir(outDir, { recursive: true });
    const paths = [];
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const squeeze = Math.max(0.04, Math.abs(Math.cos(angle)));
        const w = Math.max(2, Math.round(width * squeeze));
        const backSide = Math.cos(angle) < 0;
        // Darken toward edge-on, a little more on the back side.
        const brightness = 0.72 + 0.28 * squeeze - (backSide ? 0.08 : 0);
        let img = sharp(source).resize(w, height, { fit: "fill" }).modulate({ brightness });
        if (backSide)
            img = img.flop();
        const layer = await img.png().toBuffer();
        const path = join(outDir, `frame-${String(i + 1).padStart(3, "0")}.png`);
        await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
            .composite([{ input: layer, left: Math.round((width - w) / 2), top: 0 }])
            .png()
            .toFile(path);
        paths.push(path);
    }
    return paths;
}
