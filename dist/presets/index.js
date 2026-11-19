import { giftOpen } from "./gift-open.js";
import { sequence } from "./sequence.js";
import { float, hop, popIn } from "./subject.js";
export const presets = {
    [giftOpen.name]: giftOpen,
    [hop.name]: hop,
    [float.name]: float,
    [popIn.name]: popIn,
    [sequence.name]: sequence,
};
export function getPreset(name) {
    const preset = presets[name];
    if (!preset)
        throw new Error(`Unknown preset "${name}". Available: ${Object.keys(presets).join(", ")}`);
    return preset;
}
