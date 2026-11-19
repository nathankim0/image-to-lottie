// Load a Lottie from .json (with sibling or inline images) or .lottie into one in-memory form.
import { DotLottie } from "@dotlottie/dotlottie-js";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
const DATA_URI = /^data:([^;]+);base64,(.*)$/s;
export async function loadAnimation(path) {
    if (path.endsWith(".lottie")) {
        const buf = await readFile(path);
        const dl = await new DotLottie().fromArrayBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
        const first = dl.animations[0];
        if (!first)
            throw new Error(`${path} has no animations`);
        const data = (await first.toJSON({ inlineAssets: true }));
        return { data, images: extractImages(data, "") };
    }
    const data = JSON.parse(await readFile(path, "utf8"));
    return { data, images: await readImages(data, dirname(path)) };
}
function extractImages(data, _dir) {
    const images = new Map();
    for (const a of data.assets ?? []) {
        if (!a.p)
            continue;
        const m = DATA_URI.exec(a.p);
        if (m)
            images.set(a.id, Buffer.from(m[2], "base64"));
    }
    return images;
}
async function readImages(data, dir) {
    const images = extractImages(data, dir);
    for (const a of data.assets ?? []) {
        if (!a.p || images.has(a.id) || a.p.startsWith("data:"))
            continue;
        const candidates = [join(dir, a.u ?? "", a.p), join(dir, a.p)];
        let found;
        for (const c of candidates) {
            try {
                found = await readFile(c);
                break;
            }
            catch {
                // try next
            }
        }
        if (!found)
            throw new Error(`Image for asset "${a.id}" not found. Tried: ${candidates.join(", ")}`);
        images.set(a.id, found);
    }
    return images;
}
export function mimeOf(buf) {
    if (buf[0] === 0x89 && buf[1] === 0x50)
        return "image/png";
    if (buf[0] === 0xff && buf[1] === 0xd8)
        return "image/jpeg";
    if (buf.subarray(8, 12).toString() === "WEBP")
        return "image/webp";
    return "image/png";
}
