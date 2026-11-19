// A raster part: an image file plus the facts presets need (size and visible bounds).
import sharp from "sharp";
import { basename } from "node:path";
import type { ImageAsset } from "../lottie/types.js";

export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Part {
  id: string;
  path: string;
  file: string;
  width: number;
  height: number;
  /** Bounds of pixels with alpha above the threshold. Equals the full image for opaque images. */
  bounds: Bounds;
}

export async function loadPart(id: string, path: string, alphaThreshold = 20): Promise<Part> {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3]! > alphaThreshold) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (right < 0) throw new Error(`${path} has no visible pixels`);
  return { id, path, file: basename(path), width, height, bounds: { left, top, right, bottom } };
}

/** Visible bottom center, the natural pivot for things that sit on the ground. */
export function bottomCenter(part: Part): [number, number, number] {
  return [(part.bounds.left + part.bounds.right) / 2, part.bounds.bottom, 0];
}

export function visibleCenter(part: Part): [number, number, number] {
  return [(part.bounds.left + part.bounds.right) / 2, (part.bounds.top + part.bounds.bottom) / 2, 0];
}

export function visibleHeight(part: Part): number {
  return part.bounds.bottom - part.bounds.top + 1;
}

export function visibleWidth(part: Part): number {
  return part.bounds.right - part.bounds.left + 1;
}

export function asset(part: Part): ImageAsset {
  return { id: part.id, w: part.width, h: part.height, u: "", p: part.file, e: 0 };
}
