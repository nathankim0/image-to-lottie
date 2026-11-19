const TYPES = { 0: "precomp", 1: "solid", 2: "image", 3: "null", 4: "shape", 5: "text" };
const PROPS = { p: "position", s: "scale", r: "rotation", o: "opacity", a: "anchor" };
export function inspect(data) {
    const layers = data.layers.map((l) => {
        const ks = l.ks;
        return {
            index: l.ind,
            name: l.nm,
            type: TYPES[l.ty] ?? `type ${l.ty}`,
            inFrame: l.ip,
            outFrame: l.op,
            animated: Object.entries(PROPS)
                .filter(([key]) => ks[key]?.a === 1 || (ks[key]?.s === true && ks[key]?.x?.a === 1))
                .map(([, name]) => name),
            parent: l.parent,
            image: l.refId,
        };
    });
    const seconds = (data.op - data.ip) / data.fr;
    return {
        summary: `${data.nm ?? "untitled"}: ${data.w}x${data.h}, ${data.fr} fps, ${data.op - data.ip} frames (${seconds.toFixed(2)}s), ${data.layers.length} layers, ${data.assets?.length ?? 0} assets`,
        layers,
    };
}
function setStatic(prop, value) {
    return { prop: { a: 0, k: value }, replaced: prop.a === 1 };
}
/** Find a layer by exact name or by index number. */
export function findLayer(data, ref) {
    const byName = data.layers.filter((l) => l.nm === ref);
    if (byName.length === 1)
        return byName[0];
    if (byName.length > 1)
        throw new Error(`Several layers are named "${ref}"; use the index instead`);
    const n = Number(ref);
    const byIndex = data.layers.find((l) => l.ind === n);
    if (byIndex)
        return byIndex;
    throw new Error(`No layer "${ref}". Run inspect to list layers.`);
}
/** Apply edits in place. Returns warnings, e.g. when an animated property becomes static. */
export function editLayer(data, ref, edit) {
    const layer = findLayer(data, ref);
    const warnings = [];
    const note = (name, replaced) => {
        if (replaced)
            warnings.push(`${layer.nm}: ${name} was animated; it is now a fixed value`);
    };
    if (edit.position) {
        const current = layer.ks.p;
        const r = setStatic("s" in current && current.s === true ? current.x : current, [edit.position[0], edit.position[1], 0]);
        layer.ks.p = r.prop;
        note("position", r.replaced);
    }
    if (edit.scale !== undefined) {
        const [x, y] = Array.isArray(edit.scale) ? edit.scale : [edit.scale, edit.scale];
        const r = setStatic(layer.ks.s, [x, y, 100]);
        layer.ks.s = r.prop;
        note("scale", r.replaced);
    }
    if (edit.rotation !== undefined) {
        const r = setStatic(layer.ks.r, edit.rotation);
        layer.ks.r = r.prop;
        note("rotation", r.replaced);
    }
    if (edit.opacity !== undefined) {
        const r = setStatic(layer.ks.o, edit.opacity);
        layer.ks.o = r.prop;
        note("opacity", r.replaced);
    }
    if (edit.shift) {
        const props = [];
        for (const v of Object.values(layer.ks)) {
            if ("s" in v && v.s === true)
                props.push(v.x, v.y);
            else
                props.push(v);
        }
        for (const prop of props)
            if (prop.a === 1)
                for (const k of prop.k)
                    k.t += edit.shift;
    }
    if (edit.inFrame !== undefined)
        layer.ip = edit.inFrame;
    if (edit.outFrame !== undefined)
        layer.op = edit.outFrame;
    return warnings;
}
