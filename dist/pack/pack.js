// Export: Lottie JSON with sibling images, single-file JSON with base64 images, or dotLottie (.lottie).
import { DotLottie } from "@dotlottie/dotlottie-js";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import { mimeOf } from "./load.js";
/** Write JSON and copy each part image next to it, referenced by bare file name. */
export async function writeWithImages(data, parts, outPath) {
    const dir = dirname(outPath);
    await mkdir(dir, { recursive: true });
    for (const part of parts) {
        const target = join(dir, part.file);
        if (resolve(target) !== resolve(part.path))
            await copyFile(part.path, target);
    }
    await writeFile(outPath, JSON.stringify(data));
}
export function inlineImages(anim) {
    const data = structuredClone(anim.data);
    for (const a of data.assets) {
        const buf = anim.images.get(a.id);
        if (!buf)
            continue;
        a.u = "";
        a.p = `data:${mimeOf(buf)};base64,${buf.toString("base64")}`;
        a.e = 1;
    }
    return data;
}
export async function writeInlineJson(anim, outPath) {
    const text = JSON.stringify(inlineImages(anim));
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, text);
    return Buffer.byteLength(text);
}
/** dotLottie stores the JSON and the images in one zip; players unpack images on load. */
export async function writeDotLottie(anim, outPath, id) {
    const animationId = (id ?? basename(outPath, extname(outPath))).replace(/[^a-zA-Z0-9_-]/g, "_");
    const dl = new DotLottie();
    dl.addAnimation({ id: animationId, data: inlineImages(anim) });
    await dl.build();
    const buf = Buffer.from(await dl.toArrayBuffer());
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, buf);
    return buf.byteLength;
}
