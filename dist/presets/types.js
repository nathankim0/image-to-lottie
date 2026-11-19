export function num(options, key, fallback) {
    const v = options[key];
    if (v === undefined || v === null || v === "")
        return fallback;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n))
        throw new Error(`Option "${key}" must be a number, got "${String(v)}"`);
    return n;
}
export function str(options, key, fallback) {
    const v = options[key];
    return v === undefined || v === null || v === "" ? fallback : String(v);
}
export function requirePart(input, name, preset) {
    const part = input.parts[name];
    if (!part)
        throw new Error(`Preset "${preset}" needs a "${name}" part`);
    return part;
}
