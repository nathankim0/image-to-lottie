// Build config: one JSON file describes the preset, the parts, and options. Paths are relative to it.
import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, resolve } from "node:path";
import { loadPart } from "./image/part.js";
const IMAGE_EXT = new Set([".png", ".webp", ".jpg", ".jpeg"]);
export async function readConfig(path) {
    const config = JSON.parse(await readFile(path, "utf8"));
    if (!config.preset)
        throw new Error(`${path} needs a "preset" field`);
    return { config, dir: dirname(resolve(path)) };
}
export async function loadParts(parts, dir) {
    const out = {};
    for (const [name, p] of Object.entries(parts))
        out[name] = await loadPart(name, isAbsolute(p) ? p : join(dir, p));
    return out;
}
export async function loadFrames(frames, dir) {
    let paths;
    if (Array.isArray(frames)) {
        paths = frames.map((p) => (isAbsolute(p) ? p : join(dir, p)));
    }
    else {
        const folder = isAbsolute(frames) ? frames : join(dir, frames);
        paths = (await readdir(folder))
            .filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
            .map((f) => join(folder, f));
    }
    if (paths.length === 0)
        throw new Error("No frame images found");
    return Promise.all(paths.map((p, i) => loadPart(`f${String(i + 1).padStart(3, "0")}`, p)));
}
