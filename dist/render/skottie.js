// Headless rendering with Skia's Skottie (the Lottie player used by Chrome and Flutter) via canvaskit-wasm.
// No browser needed: frames are drawn on a CPU surface and saved as PNG, a contact sheet, or a GIF.
import CanvasKitInit from "canvaskit-wasm/bin/full/canvaskit.js";
import gifenc from "gifenc";
import sharp from "sharp";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { hex } from "../lottie/build.js";
const require = createRequire(import.meta.url);
let kit;
function canvasKit() {
    if (!kit) {
        // canvaskit binds console.log/error once, at init. Skottie then probes every image resource as a
        // font and logs one line per miss. Hand it filtered loggers so that noise never reaches the CLI.
        const { log, error } = console;
        const quiet = (write) => (...args) => {
            if (typeof args[0] === "string" && args[0].includes("as a font"))
                return;
            write(...args);
        };
        console.log = quiet(log);
        console.error = quiet(error);
        kit = CanvasKitInit({
            locateFile: (file) => require.resolve(`canvaskit-wasm/bin/full/${file}`),
        });
        console.log = log;
        console.error = error;
    }
    return kit;
}
export async function createRenderer(anim, options = {}) {
    const CK = await canvasKit();
    // Skottie resolves images by file name, so give every asset a unique name and pass bytes for it.
    const data = structuredClone(anim.data);
    const resources = {};
    for (const a of data.assets ?? []) {
        const buf = anim.images.get(a.id);
        if (!buf)
            continue;
        const name = `${a.id}.img`;
        a.u = "";
        a.p = name;
        a.e = 0;
        resources[name] = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
    const animation = CK.MakeManagedAnimation(JSON.stringify(data), resources);
    if (!animation)
        throw new Error("Skottie could not parse this animation");
    const scale = options.scale ?? 1;
    const width = Math.round(data.w * scale);
    const height = Math.round(data.h * scale);
    const surface = CK.MakeSurface(width, height);
    if (!surface)
        throw new Error("Could not create a drawing surface");
    const canvas = surface.getCanvas();
    const bg = options.background && options.background !== "transparent" ? hex(options.background) : undefined;
    const frames = Math.round(data.op - data.ip);
    const draw = (frame) => {
        canvas.clear(bg ? CK.Color4f(bg[0], bg[1], bg[2], 1) : CK.TRANSPARENT);
        animation.seekFrame(data.ip + frame);
        animation.render(canvas, CK.LTRBRect(0, 0, width, height));
        surface.flush();
        return surface.makeImageSnapshot();
    };
    return {
        width,
        height,
        frames,
        fps: data.fr,
        pixels(frame) {
            const img = draw(frame);
            const px = img.readPixels(0, 0, {
                width,
                height,
                colorType: CK.ColorType.RGBA_8888,
                alphaType: CK.AlphaType.Unpremul,
                colorSpace: CK.ColorSpace.SRGB,
            });
            img.delete();
            return px;
        },
        png(frame) {
            const img = draw(frame);
            const bytes = img.encodeToBytes();
            img.delete();
            if (!bytes)
                throw new Error(`Could not encode frame ${frame}`);
            return bytes;
        },
        dispose() {
            animation.delete();
            surface.delete();
        },
    };
}
/** "0,mid,last,45" or "every:10" to frame numbers. */
export function parseFrames(spec, total) {
    const last = Math.max(0, total - 1);
    if (spec.startsWith("every:")) {
        const step = Math.max(1, Number(spec.slice(6)));
        const out = [];
        for (let f = 0; f <= last; f += step)
            out.push(f);
        if (out[out.length - 1] !== last)
            out.push(last);
        return out;
    }
    return spec.split(",").map((s) => {
        const t = s.trim();
        if (t === "first")
            return 0;
        if (t === "mid")
            return Math.floor(last / 2);
        if (t === "last")
            return last;
        const n = Number(t);
        if (!Number.isInteger(n) || n < 0 || n > last)
            throw new Error(`Frame "${t}" is outside 0..${last}`);
        return n;
    });
}
export async function writeFrames(r, frames, outDir) {
    await mkdir(outDir, { recursive: true });
    const paths = [];
    for (const f of frames) {
        const path = join(outDir, `frame-${String(f).padStart(4, "0")}.png`);
        await writeFile(path, r.png(f));
        paths.push(path);
    }
    return paths;
}
/** One image with the chosen frames side by side, each labeled with its frame number. */
export async function writeSheet(r, frames, outPath, columns = 4) {
    const cell = 320;
    const cellH = Math.round((cell * r.height) / r.width) + 36;
    const cols = Math.min(columns, frames.length);
    const rows = Math.ceil(frames.length / cols);
    const tiles = await Promise.all(frames.map(async (f) => {
        const img = await sharp(Buffer.from(r.png(f))).resize(cell).png().toBuffer();
        const label = Buffer.from(`<svg width="${cell}" height="36"><text x="10" y="24" font-family="Helvetica, Arial" font-size="18" fill="#444">frame ${f}</text></svg>`);
        return sharp({ create: { width: cell, height: cellH, channels: 4, background: "#ffffff" } })
            .composite([
            { input: label, left: 0, top: 0 },
            { input: img, left: 0, top: 36 },
        ])
            .png()
            .toBuffer();
    }));
    await sharp({ create: { width: cell * cols, height: cellH * rows, channels: 4, background: "#ffffff" } })
        .composite(tiles.map((input, i) => ({ input, left: (i % cols) * cell, top: Math.floor(i / cols) * cellH })))
        .png({ palette: true, quality: 90 })
        .toFile(outPath);
}
/** Animated GIF preview. GIF has no partial alpha, so render over a solid background. */
export async function writeGif(r, outPath, options = {}) {
    const { GIFEncoder, quantize, applyPalette } = gifenc;
    const fps = Math.min(options.fps ?? 24, r.fps);
    const step = r.fps / fps;
    const maxWidth = options.maxWidth ?? 320;
    const outW = Math.min(maxWidth, r.width);
    const outH = Math.round((r.height * outW) / r.width);
    const enc = GIFEncoder();
    for (let t = 0; t < r.frames; t += step) {
        const frame = Math.min(r.frames - 1, Math.round(t));
        const raw = Buffer.from(r.pixels(frame));
        const rgba = new Uint8Array(await sharp(raw, { raw: { width: r.width, height: r.height, channels: 4 } })
            .resize(outW, outH)
            .raw()
            .toBuffer());
        const palette = quantize(rgba, 256);
        enc.writeFrame(applyPalette(rgba, palette), outW, outH, { palette, delay: Math.round(1000 / fps) });
    }
    enc.finish();
    await writeFile(outPath, enc.bytes());
}
/**
 * Frames where visible pixels sit on the outermost row or column. That usually means something is
 * cropped (a lid flying off, confetti leaving the top); fine only for things meant to exit.
 */
export async function edgeFrames(anim, step = 6) {
    const r = await createRenderer(anim, { background: "transparent", scale: 0.5 });
    const hitsAt = [];
    for (const f of parseFrames(`every:${step}`, r.frames)) {
        const px = r.pixels(f);
        const w = r.width;
        const h = r.height;
        const a = (x, y) => px[(x + y * w) * 4 + 3];
        let hits = 0;
        for (let x = 0; x < w; x++)
            hits += Number(a(x, 0) > 24) + Number(a(x, h - 1) > 24);
        for (let y = 0; y < h; y++)
            hits += Number(a(0, y) > 24) + Number(a(w - 1, y) > 24);
        if (hits > 2)
            hitsAt.push(f);
    }
    r.dispose();
    return hitsAt;
}
