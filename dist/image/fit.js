// Find how far a lid should sink onto a base so the box reads as closed.
// Writes a labeled contact sheet of candidates; the agent (or you) picks one by eye.
import sharp from "sharp";
import { loadPart, visibleHeight } from "./part.js";
export async function fitLid(basePath, lidPath, options) {
    const base = await loadPart("base", basePath);
    const lid = await loadPart("lid", lidPath);
    const bh = visibleHeight(base);
    const shares = options.shares ?? [0.3, 0.36, 0.42, 0.46, 0.5, 0.56];
    const candidates = shares.map((share) => ({ share, overlap: Math.round(bh * share) }));
    const bg = options.background ?? "#eef3f9";
    const baseCx = (base.bounds.left + base.bounds.right) / 2;
    const lidCx = (lid.bounds.left + lid.bounds.right) / 2;
    const cellW = Math.max(base.width, lid.width) + 40;
    const cellH = base.height + lid.height + 60;
    const tiles = await Promise.all(candidates.map(async ({ overlap }) => {
        // Base drawn at its natural position; lid's visible bottom sits `overlap` px below base's visible top.
        const baseX = Math.round((cellW - base.width) / 2);
        const baseY = cellH - base.height - 10;
        const lidX = Math.round(baseX + baseCx - lidCx);
        const lidY = Math.round(baseY + base.bounds.top + overlap - lid.bounds.bottom);
        const label = Buffer.from(`<svg width="${cellW}" height="40"><text x="12" y="28" font-family="Helvetica, Arial" font-size="24" fill="#333">overlap ${overlap}</text></svg>`);
        return sharp({ create: { width: cellW, height: cellH, channels: 4, background: bg } })
            .composite([
            { input: base.path, left: baseX, top: baseY },
            { input: lid.path, left: Math.max(0, lidX), top: Math.max(0, lidY) },
            { input: label, left: 0, top: 0 },
        ])
            .png()
            .toBuffer();
    }));
    const cols = Math.min(3, tiles.length);
    const rows = Math.ceil(tiles.length / cols);
    await sharp({ create: { width: cellW * cols, height: cellH * rows, channels: 4, background: bg } })
        .composite(tiles.map((input, i) => ({ input, left: (i % cols) * cellW, top: Math.floor(i / cols) * cellH })))
        .png()
        .toFile(options.out);
    return { candidates, suggested: Math.round(bh * 0.46), sheet: options.out };
}
