import type { Part } from "../image/part.js";
import type { Animation } from "../lottie/types.js";

export interface PresetInput {
  parts: Record<string, Part>;
  /** Ordered frames, used by the sequence preset. */
  frames?: Part[];
  width?: number;
  height?: number;
  fps?: number;
  options: Record<string, unknown>;
}

export interface OptionDoc {
  name: string;
  type: "number" | "string" | "boolean";
  default: string;
  description: string;
}

export interface Preset {
  name: string;
  summary: string;
  /** Plays once and holds the last frame, or loops seamlessly. */
  playback: "once" | "loop";
  parts: { name: string; description: string }[];
  options: OptionDoc[];
  build(input: PresetInput): Animation;
}

export function num(options: Record<string, unknown>, key: string, fallback: number): number {
  const v = options[key];
  if (v === undefined || v === null || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new Error(`Option "${key}" must be a number, got "${String(v)}"`);
  return n;
}

export function str(options: Record<string, unknown>, key: string, fallback: string): string {
  const v = options[key];
  return v === undefined || v === null || v === "" ? fallback : String(v);
}

export function requirePart(input: PresetInput, name: string, preset: string): Part {
  const part = input.parts[name];
  if (!part) throw new Error(`Preset "${preset}" needs a "${name}" part`);
  return part;
}
