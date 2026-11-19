import { giftOpen } from "./gift-open.js";
import { sequence } from "./sequence.js";
import { float, hop, popIn } from "./subject.js";
import type { Preset } from "./types.js";

export const presets: Record<string, Preset> = {
  [giftOpen.name]: giftOpen,
  [hop.name]: hop,
  [float.name]: float,
  [popIn.name]: popIn,
  [sequence.name]: sequence,
};

export function getPreset(name: string): Preset {
  const preset = presets[name];
  if (!preset) throw new Error(`Unknown preset "${name}". Available: ${Object.keys(presets).join(", ")}`);
  return preset;
}

export type { Preset, PresetInput } from "./types.js";
