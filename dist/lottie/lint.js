function maxScale(prop) {
    if (!prop)
        return 1;
    const values = prop.a === 1 ? prop.k.map((k) => k.s) : [Array.isArray(prop.k) ? prop.k : [100, 100]];
    let max = 0;
    for (const v of values)
        max = Math.max(max, Math.abs(v[0] ?? 100), Math.abs(v[1] ?? v[0] ?? 100));
    return max / 100;
}
/** Image assets far larger than the largest size they are ever shown at. */
export function oversizedImages(data) {
    const byInd = new Map(data.layers.map((l) => [l.ind, l]));
    const shown = new Map();
    for (const layer of data.layers) {
        if (layer.ty !== 2 || !layer.refId)
            continue;
        let scale = maxScale(layer.ks.s);
        let parent = layer.parent !== undefined ? byInd.get(layer.parent) : undefined;
        for (let depth = 0; parent && depth < 8; depth++) {
            scale *= maxScale(parent.ks.s);
            parent = parent.parent !== undefined ? byInd.get(parent.parent) : undefined;
        }
        shown.set(layer.refId, Math.max(shown.get(layer.refId) ?? 0, scale));
    }
    const warnings = [];
    for (const asset of data.assets ?? []) {
        const scale = shown.get(asset.id);
        if (scale === undefined)
            continue;
        const displayed = Math.round(asset.w * scale);
        if (asset.w > displayed * 2.5 && asset.w - displayed > 200) {
            warnings.push(`image "${asset.id}" is ${asset.w}px wide but shown at most ~${displayed}px; resize it to about ${displayed * 2}px to cut file size`);
        }
    }
    return warnings;
}
