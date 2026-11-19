#!/usr/bin/env node
import { Command, Option } from "commander";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { loadFrames, loadParts, readConfig } from "./config.js";
import { editLayer, inspect } from "./edit/edit.js";
import { oversizedImages } from "./lottie/lint.js";
import { fitLid } from "./image/fit.js";
import { spinFrames } from "./image/spin.js";
import { splitSheet } from "./image/split.js";
import { loadAnimation } from "./pack/load.js";
import { writeDotLottie, writeInlineJson, writeWithImages } from "./pack/pack.js";
import { getPreset, presets } from "./presets/index.js";
import { createRenderer, edgeFrames, parseFrames, writeFrames, writeGif, writeSheet } from "./render/skottie.js";
const pkg = createRequire(import.meta.url)("../package.json");
const program = new Command();
program
    .name("image-to-lottie")
    .description("Turn raster part images into Lottie JSON and dotLottie with motion presets.")
    .version(pkg.version);
const collect = (value, previous = []) => [...previous, value];
const pair = (s, sep = "x") => {
    const [a, b] = s.split(sep).map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b))
        throw new Error(`Expected two numbers like 600${sep}720, got "${s}"`);
    return [a, b];
};
program
    .command("presets")
    .description("List motion presets with their parts and options")
    .action(() => {
    for (const p of Object.values(presets)) {
        console.log(`\n${p.name}  (${p.playback})\n  ${p.summary}`);
        console.log("  parts:");
        for (const part of p.parts)
            console.log(`    ${part.name.padEnd(8)} ${part.description}`);
        if (p.options.length)
            console.log("  options:");
        for (const o of p.options)
            console.log(`    ${o.name.padEnd(10)} ${o.description} (default ${o.default})`);
    }
});
program
    .command("split")
    .description("Cut a part sheet (objects on a transparent image) into one PNG per object")
    .argument("<sheet>", "PNG with a transparent background")
    .requiredOption("-o, --out <dir>", "output folder")
    .option("--names <list>", "comma-separated names in reading order, e.g. base,lid,item")
    .option("--padding <px>", "transparent padding around each part", "8")
    .action(async (sheet, opts) => {
    const parts = await splitSheet(sheet, {
        outDir: opts.out,
        names: opts.names?.split(",").map((s) => s.trim()),
        padding: Number(opts.padding),
    });
    for (const p of parts)
        console.log(`${p.name}\t${p.width}x${p.height}\t${p.path}`);
});
program
    .command("fit")
    .description("Write a contact sheet of lid-on-base overlaps to pick the one that looks closed")
    .argument("<base>", "open box image")
    .argument("<lid>", "lid image")
    .requiredOption("-o, --out <png>", "contact sheet path")
    .action(async (base, lid, opts) => {
    const r = await fitLid(base, lid, { out: opts.out });
    console.log(`sheet: ${r.sheet}`);
    console.log(`candidates: ${r.candidates.map((c) => c.overlap).join(", ")}`);
    console.log(`suggested starting point: overlap ${r.suggested}. Pick the smallest overlap where the opening is fully hidden.`);
});
program
    .command("spin")
    .description("Make coin-style turning frames from one front image (use with the sequence preset)")
    .argument("<image>", "front view image")
    .requiredOption("-o, --out <dir>", "frames folder")
    .option("--count <n>", "frames per full turn", "16")
    .option("--size <px>", "longest side of each frame; keep it near the display size", "320")
    .action(async (image, opts) => {
    const paths = await spinFrames(image, opts.out, Number(opts.count), Number(opts.size));
    console.log(`${paths.length} frames in ${opts.out}`);
});
program
    .command("build")
    .description("Build a Lottie from a config file or from flags")
    .argument("[config]", "build config JSON (preset, parts, options)")
    .addOption(new Option("--preset <name>", "preset name").choices(Object.keys(presets)))
    .option("--part <name=path>", "part image, repeatable", collect)
    .option("--subject <path>", "shortcut for --part subject=<path>")
    .option("--frames <dir>", "frame images folder (sequence preset)")
    .option("--option <key=value>", "preset option, repeatable", collect)
    .option("--size <WxH>", "canvas size, e.g. 600x720")
    .option("--fps <n>", "frame rate")
    .requiredOption("-o, --out <json>", "output Lottie JSON; images are copied next to it")
    .option("--lottie <path>", "also write a dotLottie (.lottie) with images inside")
    .option("--inline <path>", "also write a single-file JSON with base64 images")
    .option("--asset-base <url>", 'image path prefix written into the JSON, e.g. "/images/anim/" for a web app')
    .action(async (configPath, opts) => {
    let config;
    let dir = process.cwd();
    if (configPath) {
        ({ config, dir } = await readConfig(configPath));
    }
    else {
        if (!opts.preset)
            throw new Error("Pass a config file or --preset");
        config = { preset: opts.preset, parts: {}, options: {} };
    }
    config.parts ??= {};
    config.options ??= {};
    if (opts.preset)
        config.preset = opts.preset;
    for (const p of opts.part ?? []) {
        const [name, ...rest] = p.split("=");
        config.parts[name] = resolve(rest.join("="));
    }
    if (opts.subject)
        config.parts.subject = resolve(opts.subject);
    if (opts.frames)
        config.frames = resolve(opts.frames);
    for (const o of opts.option ?? []) {
        const [key, ...rest] = o.split("=");
        config.options[key] = rest.join("=");
    }
    if (opts.size)
        [config.width, config.height] = pair(opts.size);
    if (opts.fps)
        config.fps = Number(opts.fps);
    const preset = getPreset(config.preset);
    const parts = await loadParts(config.parts, dir);
    const frames = config.frames ? await loadFrames(config.frames, dir) : undefined;
    const data = preset.build({
        parts,
        frames,
        width: config.width,
        height: config.height,
        fps: config.fps,
        options: config.options,
    });
    if (opts.assetBase)
        for (const a of data.assets)
            a.u = opts.assetBase;
    await writeWithImages(data, [...Object.values(parts), ...(frames ?? [])], opts.out);
    for (const w of oversizedImages(data))
        console.warn(`warning: ${w}`);
    console.log(`lottie: ${opts.out} (${data.w}x${data.h}, ${data.op} frames @ ${data.fr} fps, ${preset.playback})`);
    if (opts.lottie || opts.inline) {
        const loaded = await loadAnimation(opts.out);
        if (opts.lottie)
            console.log(`dotlottie: ${opts.lottie} (${await writeDotLottie(loaded, opts.lottie)} bytes)`);
        if (opts.inline)
            console.log(`inline json: ${opts.inline} (${await writeInlineJson(loaded, opts.inline)} bytes)`);
    }
});
program
    .command("render")
    .description("Render frames with Skottie (no browser): PNG frames, a contact sheet, or a GIF")
    .argument("<file>", ".json or .lottie")
    .option("--frames <spec>", 'frames: "0,mid,last", "12,30", or "every:10"', "first,mid,last")
    .option("--out <dir>", "write each frame as PNG here")
    .option("--sheet <png>", "write one labeled contact sheet")
    .option("--gif <path>", "write an animated GIF preview")
    .option("--gif-width <px>", "GIF width", "320")
    .option("--gif-fps <n>", "GIF frame rate", "24")
    .option("--bg <color>", '#rrggbb or "transparent"', "#ffffff")
    .option("--scale <n>", "render scale", "1")
    .action(async (file, opts) => {
    const anim = await loadAnimation(file);
    const r = await createRenderer(anim, { background: opts.bg, scale: Number(opts.scale) });
    const frames = parseFrames(opts.frames, r.frames);
    if (!opts.out && !opts.sheet && !opts.gif)
        throw new Error("Choose at least one of --out, --sheet, --gif");
    if (opts.out)
        console.log(`frames: ${(await writeFrames(r, frames, opts.out)).length} in ${opts.out}`);
    if (opts.sheet) {
        await mkdir(dirname(resolve(opts.sheet)), { recursive: true });
        await writeSheet(r, frames, opts.sheet);
        console.log(`sheet: ${opts.sheet} (frames ${frames.join(", ")})`);
    }
    if (opts.gif) {
        await mkdir(dirname(resolve(opts.gif)), { recursive: true });
        await writeGif(r, opts.gif, { maxWidth: Number(opts.gifWidth), fps: Number(opts.gifFps) });
        console.log(`gif: ${opts.gif}`);
    }
    r.dispose();
});
program
    .command("check")
    .description("Verify a Lottie: parses, images resolve, Skottie renders visible pixels at mid and last")
    .argument("<file>", ".json or .lottie")
    .action(async (file) => {
    const anim = await loadAnimation(file);
    const missing = anim.data.assets.filter((a) => a.p && !anim.images.has(a.id)).map((a) => a.id);
    if (missing.length)
        throw new Error(`Missing images for assets: ${missing.join(", ")}`);
    const r = await createRenderer(anim, { background: "transparent" });
    const report = [];
    const shares = [];
    for (const f of parseFrames("first,mid,last", r.frames)) {
        const px = r.pixels(f);
        let visible = 0;
        for (let i = 3; i < px.length; i += 4)
            if (px[i] > 8)
                visible++;
        const share = visible / (px.length / 4);
        shares.push(share);
        report.push(`frame ${f}: ${(share * 100).toFixed(1)}% visible${share === 0 && f === 0 ? " (blank start, fine for entrances)" : ""}`);
    }
    r.dispose();
    const touching = await edgeFrames(anim);
    console.log(inspect(anim.data).summary);
    console.log(report.join("\n"));
    if (touching.length) {
        console.warn(`warning: content touches the canvas edge at frames ${touching.join(", ")}. Render them and look; it is fine only for things meant to leave the frame.`);
    }
    for (const w of oversizedImages(anim.data))
        console.warn(`warning: ${w}`);
    // An entrance may start empty; the middle and the end must show something.
    if (shares.slice(1).some((s) => s === 0))
        throw new Error("The middle or last frame is blank");
    console.log("ok");
});
program
    .command("pack")
    .description("Convert a Lottie into dotLottie (.lottie) or single-file JSON with images inside")
    .argument("<file>", ".json (with sibling images) or .lottie")
    .option("--lottie <path>", "write dotLottie")
    .option("--inline <path>", "write JSON with base64 images")
    .action(async (file, opts) => {
    if (!opts.lottie && !opts.inline)
        throw new Error("Choose --lottie and/or --inline");
    const anim = await loadAnimation(file);
    if (opts.lottie)
        console.log(`dotlottie: ${opts.lottie} (${await writeDotLottie(anim, opts.lottie)} bytes)`);
    if (opts.inline)
        console.log(`inline json: ${opts.inline} (${await writeInlineJson(anim, opts.inline)} bytes)`);
});
program
    .command("inspect")
    .description("List layers of any Lottie: type, frames, what is animated")
    .argument("<file>", ".json or .lottie")
    .action(async (file) => {
    const { summary, layers } = inspect((await loadAnimation(file)).data);
    console.log(summary);
    for (const l of layers) {
        const extra = [l.parent ? `parent ${l.parent}` : "", l.image ? `image ${l.image}` : ""].filter(Boolean).join(", ");
        console.log(`${String(l.index).padStart(3)}  ${l.name.padEnd(16)} ${l.type.padEnd(6)} ${l.inFrame}-${l.outFrame}  animated: ${l.animated.join(", ") || "none"}${extra ? `  (${extra})` : ""}`);
    }
});
program
    .command("edit")
    .description("Change one layer of a Lottie JSON: position, scale, rotation, opacity, timing")
    .argument("<file>", "Lottie JSON")
    .requiredOption("--layer <name|index>", "layer name or index from inspect")
    .option("--position <x,y>", "fixed position")
    .option("--scale <percent|x,y>", "fixed scale in percent")
    .option("--rotation <deg>", "fixed rotation")
    .option("--opacity <0-100>", "fixed opacity")
    .option("--in <frame>", "first visible frame")
    .option("--out-frame <frame>", "frame where the layer disappears")
    .option("--shift <frames>", "move all of the layer's keyframes later (negative: earlier)")
    .option("-o, --output <json>", "write here instead of overwriting")
    .action(async (file, opts) => {
    const data = JSON.parse(await readFile(file, "utf8"));
    const edit = {};
    if (opts.position)
        edit.position = pair(opts.position, ",");
    if (opts.scale)
        edit.scale = opts.scale.includes(",") ? pair(opts.scale, ",") : Number(opts.scale);
    if (opts.rotation)
        edit.rotation = Number(opts.rotation);
    if (opts.opacity)
        edit.opacity = Number(opts.opacity);
    if (opts.in)
        edit.inFrame = Number(opts.in);
    if (opts.outFrame)
        edit.outFrame = Number(opts.outFrame);
    if (opts.shift)
        edit.shift = Number(opts.shift);
    const warnings = editLayer(data, opts.layer, edit);
    const target = opts.output ?? file;
    await writeFile(target, JSON.stringify(data));
    for (const w of warnings)
        console.warn(`warning: ${w}`);
    console.log(`edited: ${target}`);
});
program.parseAsync().catch((e) => {
    console.error(`error: ${e.message}`);
    process.exit(1);
});
