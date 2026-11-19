---
name: image-to-lottie
description: Turn AI-generated raster images into Lottie JSON and dotLottie animations. Use when someone wants a 3D-looking or illustrated object animated (a gift box opening, a reward popping in, an icon hopping or floating, a coin turning), wants frame images or a single picture turned into a Lottie, or wants an existing Lottie inspected, edited, rendered to PNG/GIF, or packed as .lottie. Raster parts plus 2D motion, verified with headless Skottie.
---

# image-to-lottie

Animate raster art the way product teams do it: render a few still images (often 3D),
then move them with 2D transforms. The tool is the `image-to-lottie` CLI; this skill is
the order to use it in and the checks that keep results honest.

Install the CLI once (Node 20+):
`npm install -g https://github.com/nathankim0/image-to-lottie/releases/latest/download/image-to-lottie.tgz`.
Without installing, prefix commands with `npx -y github:nathankim0/image-to-lottie`.
`image-to-lottie presets` lists presets, their parts, and options.

## Decide the route

| Want | Route |
| --- | --- |
| Something opens, splits, or reveals contents | parts sheet, `split`, `fit`, `build --preset gift-open` |
| One object hops, floats, or pops in | one image, `build --preset hop / float / pop-in --subject` |
| Celebration, success, "you won" | one popper image pointing up-right, `build --preset fanfare --part popper=popper.png` |
| Motion a transform cannot fake (turning, morphing, flipping) | frames, `spin` or your own frames, `build --preset sequence --frames` |
| Change an existing Lottie | `inspect`, `edit`, `render`, `check` |
| Ship it | `pack --lottie` (dotLottie, images inside) or `--inline` (single JSON) |

Ask only if the background matters (transparent is the default) or the user has brand colors.

## 1. Make the images

Generate parts on ONE sheet in one request, so style, light, camera, and scale match.
Separate images drift apart; this is the most common failure. Use the prompt templates in
`references/part-sheets.md`. Requirements for every sheet:

- fully transparent background, objects not touching, wide gaps
- same camera for every part (front view, slightly from above, works best)
- a lid exactly as wide as the base's top opening; a base that is empty inside
- no text, numbers, or logos

Look at the sheet before going on. Regenerate rather than fix a bad sheet.

## 2. Cut and fit

```bash
image-to-lottie split sheet.png -o parts --names base,lid,item
image-to-lottie fit parts/base.png parts/lid.png -o fit.png
```

`split` fails on an opaque background and when the count of objects differs from `--names`;
both mean the sheet needs regenerating. Open `fit.png` and choose the **smallest overlap where
the opening is fully hidden**. A slightly smaller value that shows a sliver of light is not
"closed"; the preset uses that look on its own during the shake.

## 3. Build

Write a config next to the parts (paths are relative to it):

```json
{
  "preset": "gift-open",
  "width": 600,
  "height": 720,
  "parts": { "base": "parts/base.png", "lid": "parts/lid.png", "item": "parts/item.png" },
  "options": { "overlap": 182, "items": 3 }
}
```

```bash
image-to-lottie build config.json -o out/anim.json --lottie out/anim.lottie
```

Flags work without a config too: `build --preset hop --subject star.png -o out/hop.json`.

## 4. Verify, every time

```bash
image-to-lottie check out/anim.lottie
image-to-lottie render out/anim.json --frames first,mid,last --sheet out/sheet.png --bg "#eef3f9"
```

Look at the sheet. For openings also check the frames around the pop (the preset's frames
50 to 76 at 60 fps). Fix and rebuild until all of these hold:

- nothing important is cropped by the canvas edge
- the final frame is a clean composition (for `once` presets it is what users keep seeing)
- loops: first and last frame match
- items emerge from inside the box, not in front of it

Make a GIF only when someone needs to see motion: `--gif out/preview.gif`.

## 5. Ship

- dotLottie (`.lottie`): one file with images inside; use with `@lottiefiles/dotlottie-web`
  or `-react`. Best default for web.
- JSON + images: smallest JSON, images served separately. Set the asset base for your app
  (`u` in the JSON, or keep files next to the JSON).
- Inline JSON (`pack --inline`): one portable JSON for players that do not read `.lottie`.

Keep images near their display size before building. A 768 px PNG shown at 200 px costs
about 15 times more bytes. `spin --size` does this for frames.

## Motion rules the presets follow

Read `references/motion.md` before writing a new preset or editing timing. In short: one
hero beat per animation, anticipation before it, a settle after it; ease by behavior
(entering, settling, falling, looping), never linear for movement; supporting layers
(shadow, glow, sparkles, particles) each have a job and stay quieter than the hero.
