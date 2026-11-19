# Changelog

## Unreleased

### Added

- `check` warns when content touches the canvas edge (with frame numbers) and when an image is far larger than it is ever shown; `build` warns about oversized images too.
- `build --asset-base <url>` writes the image path prefix a web app serves from.
- `fanfare` options `tipAt` and `mouthAt` for poppers drawn at other angles; confetti size scales with the canvas.
- Examples `trophy-hop` (`hop`) and `bell-float` (`float`), cut from one generated sheet.
- Skill reference `pitfalls.md`: mistakes made while building the examples and what prevents each.

### Changed

- `gift-open`: the lid flies a shorter path and fades sooner, so it no longer leaves the canvas or lingers over the items.

## v0.2.0 (2026-11-19)

### Added

- `fanfare` preset: party poppers pull back, pop, and throw seeded confetti that arcs up and falls (x and y on separate curves), with paper flips, a mouth flash, and sparkles. Options: `sides`, `pieces`, `colors`, `seed`.
- Split x/y positions in the Lottie builders, so each axis can have its own easing. `inspect` and `edit` understand them.

## v0.1.0 (2026-11-19)

### Added

- `build` with five presets: `gift-open` (box shakes, lid pops, items fan out), `hop`, `float`, `pop-in`, and `sequence` (frame images to a flipbook).
- `split`: cut a part sheet into one PNG per object, merging nearby detached pieces.
- `fit`: contact sheet of lid-on-base overlaps to pick the closed look.
- `spin`: coin-style turning frames from one front image.
- `render` and `check`: headless Skottie rendering to PNG frames, a labeled contact sheet, or a GIF, and a blank-frame check.
- `pack`: dotLottie (`.lottie`, images inside) and single-file JSON with base64 images.
- `inspect` and `edit`: list layers of any Lottie and change one layer's position, scale, rotation, opacity, or timing.
- Agent skill `image-to-lottie` with part-sheet prompts and motion rules.
- Install from the release tarball (`npm install -g .../releases/latest/download/image-to-lottie.tgz`) or run with `npx github:nathankim0/image-to-lottie`.
