// Supporting layers shared by presets: soft glow, contact shadow, sparkles, burst particles.
// Each one has a job (emphasis, grounding, reward, impact); presets decide when to use them.
import { EASE, anim, ellipse, group, radialFill, shapeLayer, solidFill, star4, transform, } from "./build.js";
export function glow(ctx, ind, center, radius, rgb, motion = {}) {
    const light = rgb.map((c) => c + (1 - c) * 0.35);
    return shapeLayer(ctx, "glow", ind, transform({ position: [center[0], center[1], 0], scale: motion.scale, opacity: motion.opacity }), [
        group([
            ellipse(radius * 2),
            radialFill(radius, [
                [0, ...rgb],
                [0.5, ...light],
                [1, ...light],
            ], [
                [0, 0.95],
                [0.5, 0.45],
                [1, 0],
            ]),
        ]),
    ]);
}
export function shadow(ctx, ind, center, width, motion = {}) {
    return shapeLayer(ctx, "shadow", ind, transform({ position: [center[0], center[1], 0], scale: motion.scale, opacity: motion.opacity }), [group([ellipse(width, Math.max(12, width * 0.11)), solidFill([0.1, 0.12, 0.16])], 16)]);
}
/** Four-point star that blooms, turns, and fades. */
export function sparkle(ctx, ind, at, radius, start, rgb) {
    return shapeLayer(ctx, `sparkle-${ind}`, ind, transform({
        position: [at[0], at[1], 0],
        scale: anim([
            [start, [0, 0, 100]],
            [start + 10, [115, 115, 100], EASE.pop],
            [start + 16, [100, 100, 100], EASE.settle],
            [start + 34, [0, 0, 100], EASE.accel],
        ]),
        rotation: anim([
            [start, -30],
            [start + 34, 45, EASE.sine],
        ]),
    }), [group([star4(radius), solidFill(rgb)])]);
}
/** Dots flying out from one origin: reads as impact. */
export function burst(ctx, firstInd, origin, start, colors, options = {}) {
    const count = options.count ?? 8;
    const distance = options.distance ?? 220;
    const [from, to] = options.spread ?? [15, 165];
    const layers = [];
    for (let i = 0; i < count; i++) {
        const angle = ((from + ((to - from) * i) / Math.max(1, count - 1)) * Math.PI) / 180;
        const dist = distance * (0.75 + 0.25 * ((i * 7) % 4) / 3);
        const delay = (i * 3) % 4;
        const t0 = start + delay;
        const end = [origin[0] + Math.cos(angle) * dist, origin[1] - Math.sin(angle) * dist, 0];
        const size = 10 + ((i * 5) % 3) * 3;
        layers.push(shapeLayer(ctx, `particle-${i}`, firstInd + i, transform({
            position: anim([
                [t0, [origin[0], origin[1], 0]],
                [t0 + 26, end, EASE.launch],
            ]),
            scale: anim([
                [t0, [0, 0, 100]],
                [t0 + 6, [100, 100, 100], EASE.launch],
                [t0 + 26, [20, 20, 100], EASE.accel],
            ]),
            opacity: anim([
                [0, 0],
                [t0, 0],
                [t0 + 2, 100],
                [t0 + 26, 0, EASE.accel],
            ]),
        }), [group([ellipse(size), solidFill(colors[i % colors.length])])]));
    }
    return layers;
}
