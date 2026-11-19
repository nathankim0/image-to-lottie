// End-to-end checks against the built package (run `npm test`, which builds first).
// Fixtures are drawn here with sharp, so the tests need no image files.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { anim, EASE } from "../dist/lottie/build.js";
import { splitSheet } from "../dist/image/split.js";
import { loadPart } from "../dist/image/part.js";
import { spinFrames } from "../dist/image/spin.js";
import { getPreset } from "../dist/presets/index.js";
import { loadAnimation } from "../dist/pack/load.js";
import { writeDotLottie, writeInlineJson, writeWithImages } from "../dist/pack/pack.js";
import { createRenderer, parseFrames } from "../dist/render/skottie.js";
import { editLayer, inspect } from "../dist/edit/edit.js";

const dir = await mkdtemp(join(tmpdir(), "image-to-lottie-"));

/** Transparent canvas with solid rectangles. */
async function sheet(path, width, height, rects) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${rects
    .map(([x, y, w, h, color]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`)
    .join("")}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path);
  return path;
}

test("anim puts the easing of a key on the segment that ends there", () => {
  const p = anim([
    [10, 0],
    [0, 5],
    [20, 1, EASE.pop],
  ]);
  assert.equal(p.a, 1);
  assert.deepEqual(
    p.k.map((k) => k.t),
    [0, 10, 20],
  );
  // segment 10 -> 20 uses EASE.pop: stored as out-handle of key 10 and in-handle of key 20
  assert.deepEqual(p.k[1].o, { x: [EASE.pop[0][0]], y: [EASE.pop[0][1]] });
  assert.deepEqual(p.k[1].i, { x: [EASE.pop[1][0]], y: [EASE.pop[1][1]] });
  assert.equal(p.k[2].o, undefined);
});

test("split finds objects in reading order, merges specks, and names them", async () => {
  const path = await sheet(join(dir, "sheet.png"), 600, 300, [
    [20, 100, 160, 150, "#c08bff"], // base
    [220, 120, 160, 80, "#ff7a7a"], // lid
    [262, 100, 8, 8, "#ff7a7a"], // small detached piece near the lid
    [440, 140, 80, 80, "#ffc94a"], // item
  ]);
  const parts = await splitSheet(path, { outDir: join(dir, "parts"), names: ["base", "lid", "item"], padding: 4 });
  assert.deepEqual(
    parts.map((p) => p.name),
    ["base", "lid", "item"],
  );
  const lid = parts[1];
  assert.ok(lid.top <= 100 - 4, "the detached piece is merged into the lid crop");
  const base = await loadPart("base", parts[0].path);
  assert.equal(base.bounds.left, 4);
  assert.equal(base.bounds.top, 4);
});

test("split rejects an opaque background", async () => {
  const path = join(dir, "opaque.png");
  await sharp({ create: { width: 40, height: 40, channels: 4, background: "#ffffff" } }).png().toFile(path);
  await assert.rejects(splitSheet(path, { outDir: join(dir, "x") }), /opaque background/);
});

async function buildGift() {
  const parts = {
    base: await loadPart("base", join(dir, "parts", "base.png")),
    lid: await loadPart("lid", join(dir, "parts", "lid.png")),
    item: await loadPart("item", join(dir, "parts", "item.png")),
  };
  const data = getPreset("gift-open").build({ parts, options: { overlap: 60, items: 3 } });
  const out = join(dir, "gift", "gift.json");
  await writeWithImages(data, Object.values(parts), out);
  return { data, out };
}

test("gift-open builds a valid document with a parented lid and three items", async () => {
  const { data } = await buildGift();
  assert.equal(data.w, 600);
  assert.equal(data.h, 720);
  assert.equal(data.op, 150);
  assert.deepEqual(
    data.assets.map((a) => a.id),
    ["base", "lid", "item"],
  );
  const lid = data.layers.find((l) => l.nm === "box-lid");
  const base = data.layers.find((l) => l.nm === "box-base");
  assert.equal(lid.parent, base.ind);
  assert.equal(data.layers.filter((l) => l.nm.startsWith("item-")).length, 3);
  const names = data.layers.map((l) => l.nm);
  assert.ok(names.indexOf("box-base") < names.indexOf("item-1"), "items render behind the box front");
});

test("Skottie renders the built file headlessly", async () => {
  const { out } = await buildGift();
  const r = await createRenderer(await loadAnimation(out), { background: "transparent" });
  assert.equal(r.frames, 150);
  const px = r.pixels(100);
  let visible = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] > 8) visible++;
  r.dispose();
  assert.ok(visible > 1000, `expected visible pixels, got ${visible}`);
});

test("dotLottie and inline JSON keep every image", async () => {
  const { out } = await buildGift();
  const loaded = await loadAnimation(out);
  const lottiePath = join(dir, "gift.lottie");
  await writeDotLottie(loaded, lottiePath);
  const back = await loadAnimation(lottiePath);
  assert.equal(back.images.size, 3);
  assert.equal(back.data.layers.length, loaded.data.layers.length);

  const inlinePath = join(dir, "gift.inline.json");
  await writeInlineJson(loaded, inlinePath);
  const inline = JSON.parse(await readFile(inlinePath, "utf8"));
  assert.ok(inline.assets.every((a) => a.p.startsWith("data:image/png;base64,") && a.e === 1));
});

test("single-subject presets loop seamlessly or hold", async () => {
  const subject = await loadPart("subject", join(dir, "parts", "item.png"));
  for (const name of ["hop", "float"]) {
    const data = getPreset(name).build({ parts: { subject }, options: {} });
    const layer = data.layers.find((l) => l.nm === "subject");
    const pos = layer.ks.p.k;
    assert.deepEqual(pos[0].s, pos[pos.length - 1].s, `${name} starts and ends at the same position`);
  }
  const pop = getPreset("pop-in").build({ parts: { subject }, options: { seconds: 1 } });
  assert.equal(pop.op, 60);
});

test("spin frames feed the sequence preset", async () => {
  const coin = await sheet(join(dir, "coin.png"), 100, 100, [[10, 10, 80, 80, "#ffc94a"]]);
  const paths = await spinFrames(coin, join(dir, "spin"), 8, 64);
  assert.equal(paths.length, 8);
  const frames = await Promise.all(paths.map((p, i) => loadPart(`f${i}`, p)));
  assert.equal(frames[0].width, 64);
  const data = getPreset("sequence").build({ parts: {}, frames, fps: 12, options: { hold: 2 } });
  assert.equal(data.op, 16);
  assert.deepEqual(
    data.layers.map((l) => [l.ip, l.op]).slice(0, 2),
    [
      [0, 2],
      [2, 4],
    ],
  );
});

test("inspect and edit change one layer and warn about lost animation", async () => {
  const { out } = await buildGift();
  const data = JSON.parse(await readFile(out, "utf8"));
  const before = inspect(data).layers.find((l) => l.name === "box-lid");
  assert.ok(before.animated.includes("position"));
  const warnings = editLayer(data, "box-lid", { opacity: 50, shift: 5 });
  assert.equal(warnings.length, 1);
  const lid = data.layers.find((l) => l.nm === "box-lid");
  assert.deepEqual(lid.ks.o, { a: 0, k: 50 });
  assert.equal(lid.ks.p.k[0].t, 5);
  await writeFile(join(dir, "edited.json"), JSON.stringify(data));
  assert.throws(() => editLayer(data, "nope", { opacity: 1 }), /No layer "nope"/);
});

test("parseFrames understands names, lists, and steps", () => {
  assert.deepEqual(parseFrames("first,mid,last", 150), [0, 74, 149]);
  assert.deepEqual(parseFrames("every:50", 150), [0, 50, 100, 149]);
  assert.throws(() => parseFrames("200", 150), /outside/);
});

test("fanfare mirrors the right popper and throws seeded confetti on split x/y curves", async () => {
  const popper = await loadPart("popper", join(dir, "parts", "item.png"));
  const build = (seed) => getPreset("fanfare").build({ parts: { popper }, options: { pieces: 10, seed } });
  const data = build(3);
  const left = data.layers.find((l) => l.nm === "popper-left");
  const right = data.layers.find((l) => l.nm === "popper-right");
  assert.ok(left.ks.s.k[0].s[0] > 0 && right.ks.s.k[0].s[0] < 0, "right popper is mirrored");
  const confetti = data.layers.filter((l) => l.nm.startsWith("confetti-"));
  assert.equal(confetti.length, 20);
  assert.equal(confetti[0].ks.p.s, true, "x and y move on separate curves");
  assert.deepEqual(build(3), data, "same seed, same burst");
  assert.notDeepEqual(build(4).layers[0].ks.p, data.layers[0].ks.p, "another seed, another burst");
  const one = getPreset("fanfare").build({ parts: { popper }, options: { pieces: 10, sides: "left" } });
  assert.equal(one.layers.filter((l) => l.nm.startsWith("popper-")).length, 1);

  const out = join(dir, "fanfare", "fanfare.json");
  await writeWithImages(data, [popper], out);
  const r = await createRenderer(await loadAnimation(out), { background: "transparent" });
  const px = r.pixels(40);
  let visible = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] > 8) visible++;
  r.dispose();
  assert.ok(visible > 500, `confetti and poppers render, got ${visible}`);
});
