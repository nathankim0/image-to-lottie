// Export: Lottie JSON with sibling images, single-file JSON with base64 images, or dotLottie (.lottie).
import { DotLottie } from "@dotlottie/dotlottie-js";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve } from "node:path";
import type { Animation } from "../lottie/types.js";
import type { Part } from "../image/part.js";
import { mimeOf, type LoadedAnimation } from "./load.js";

/** Write JSON and copy each part image next to it, referenced by bare file name. */
export async function writeWithImages(data: Animation, parts: Part[], outPath: string): Promise<void> {
  const dir = dirname(outPath);
  await mkdir(dir, { recursive: true });
  for (const part of parts) {
    const target = join(dir, part.file);
    if (resolve(target) !== resolve(part.path)) await copyFile(part.path, target);
  }
  await writeFile(outPath, JSON.stringify(data));
}

export function inlineImages(anim: LoadedAnimation): Animation {
  const data = structuredClone(anim.data);
  for (const a of data.assets) {
    const buf = anim.images.get(a.id);
    if (!buf) continue;
    a.u = "";
    a.p = `data:${mimeOf(buf)};base64,${buf.toString("base64")}`;
    a.e = 1;
  }
  return data;
}

export async function writeInlineJson(anim: LoadedAnimation, outPath: string): Promise<number> {
  const text = JSON.stringify(inlineImages(anim));
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, text);
  return Buffer.byteLength(text);
}

/** dotLottie stores the JSON and the images in one zip; players unpack images on load. */
export async function writeDotLottie(anim: LoadedAnimation, outPath: string, id?: string): Promise<number> {
  const animationId = (id ?? basename(outPath, extname(outPath))).replace(/[^a-zA-Z0-9_-]/g, "_");
  const dl = new DotLottie();
  dl.addAnimation({ id: animationId, data: inlineImages(anim) as never });
  await dl.build();
  const buf = Buffer.from(await dl.toArrayBuffer());
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);
  return buf.byteLength;
}
