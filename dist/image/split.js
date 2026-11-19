// Split a part sheet (several objects on one transparent image) into one PNG per object.
// Generating all parts in one image keeps their style, light, and scale consistent.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
export async function splitSheet(sheetPath, options) {
    const threshold = options.alphaThreshold ?? 20;
    const padding = options.padding ?? 8;
    const { data, info } = await sharp(sheetPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    const solid = new Uint8Array(width * height);
    let opaqueCorners = 0;
    for (const [x, y] of [
        [0, 0],
        [width - 1, 0],
        [0, height - 1],
        [width - 1, height - 1],
    ]) {
        if (data[(y * width + x) * channels + 3] > threshold)
            opaqueCorners++;
    }
    if (opaqueCorners === 4) {
        throw new Error(`${sheetPath} has an opaque background. Generate the sheet on a transparent background.`);
    }
    for (let i = 0; i < width * height; i++)
        solid[i] = data[i * channels + 3] > threshold ? 1 : 0;
    // Connected components (8-neighbour) with an explicit stack.
    const label = new Int32Array(width * height);
    const boxes = [];
    const stack = [];
    for (let start = 0; start < width * height; start++) {
        if (!solid[start] || label[start])
            continue;
        const id = boxes.length + 1;
        const box = { left: width, top: height, right: -1, bottom: -1, pixels: 0 };
        label[start] = id;
        stack.push(start);
        while (stack.length) {
            const p = stack.pop();
            const x = p % width;
            const y = (p - x) / width;
            box.pixels++;
            if (x < box.left)
                box.left = x;
            if (x > box.right)
                box.right = x;
            if (y < box.top)
                box.top = y;
            if (y > box.bottom)
                box.bottom = y;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= width || ny >= height)
                        continue;
                    const q = ny * width + nx;
                    if (solid[q] && !label[q]) {
                        label[q] = id;
                        stack.push(q);
                    }
                }
            }
        }
        boxes.push(box);
    }
    if (boxes.length === 0)
        throw new Error(`${sheetPath} has no visible objects`);
    const largest = Math.max(...boxes.map((b) => b.pixels));
    const minShare = options.minShare ?? 0.1;
    // Objects are components at least `minShare` of the largest. Smaller pieces (a detached bow tip,
    // a sparkle) join the nearest object when they are close to it; far-away specks are dropped as noise.
    const big = boxes.filter((b) => b.pixels >= largest * minShare);
    const reach = Math.max(width, height) * 0.08;
    for (const b of boxes) {
        if (big.includes(b))
            continue;
        const cx = (b.left + b.right) / 2;
        const cy = (b.top + b.bottom) / 2;
        let best = big[0];
        let bestD = Infinity;
        for (const g of big) {
            const dx = Math.max(g.left - cx, 0, cx - g.right);
            const dy = Math.max(g.top - cy, 0, cy - g.bottom);
            const d = Math.hypot(dx, dy);
            if (d < bestD) {
                bestD = d;
                best = g;
            }
        }
        if (bestD > reach)
            continue;
        best.left = Math.min(best.left, b.left);
        best.top = Math.min(best.top, b.top);
        best.right = Math.max(best.right, b.right);
        best.bottom = Math.max(best.bottom, b.bottom);
        best.pixels += b.pixels;
    }
    // Reading order: rows top to bottom, then left to right.
    const rowTolerance = height * 0.15;
    big.sort((a, b) => (Math.abs(a.top - b.top) > rowTolerance ? a.top - b.top : a.left - b.left));
    await mkdir(options.outDir, { recursive: true });
    const results = [];
    for (const [i, b] of big.entries()) {
        const name = options.names?.[i] ?? `part-${i + 1}`;
        const left = Math.max(0, b.left - padding);
        const top = Math.max(0, b.top - padding);
        const w = Math.min(width, b.right + padding + 1) - left;
        const h = Math.min(height, b.bottom + padding + 1) - top;
        const path = join(options.outDir, `${name}.png`);
        await sharp(sheetPath).extract({ left, top, width: w, height: h }).png().toFile(path);
        results.push({ name, path, left, top, width: w, height: h, pixels: b.pixels });
    }
    if (options.names && options.names.length !== results.length) {
        throw new Error(`Found ${results.length} objects but got ${options.names.length} names. Parts written: ${results.map((r) => r.name).join(", ")}`);
    }
    return results;
}
