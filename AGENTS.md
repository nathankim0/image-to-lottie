# AGENTS.md

Instructions for any coding agent (Claude Code, Codex, others) working in this repository. `CLAUDE.md` is a symlink to this file; edit `AGENTS.md` only.

## What this repo is

`image-to-lottie` is a TypeScript CLI plus an agent skill. It turns raster part images (usually AI-generated on one sheet) into Lottie JSON and dotLottie with motion presets, and verifies results by rendering them headlessly with Skia's Skottie (canvaskit-wasm). Users install it from GitHub with npm and add the skill with `npx skills add`.

```text
src/cli.ts                 command line: presets, split, fit, spin, build, render, check, pack, inspect, edit
src/lottie/                Lottie builders (keyframes, easing, layers) and shared effect layers
src/presets/               motion presets: gift-open, hop, float, pop-in, fanfare, sequence
src/image/                 part loading, sheet split, lid fit, spin frames (sharp)
src/render/skottie.ts      headless Skottie rendering: PNG frames, contact sheet, GIF
src/pack/                  load .json/.lottie, write dotLottie and inline JSON
src/edit/edit.ts           inspect and edit layers of any Lottie
skills/image-to-lottie/    agent skill: SKILL.md and references
examples/                  source art, configs, and committed outputs (.lottie, sheet.png, preview.gif)
dist/                      compiled CLI, committed so GitHub installs need no build step
test/pipeline.test.js      end-to-end tests against dist/
assets/banner.png          README banner
```

## Rules for every change

1. **Commit and push after every change.** One logical change per commit. Push to `main` right after committing. Do not leave work uncommitted at the end of a task.
2. **Release only for distribution changes.** A change is a distribution change when it alters what users install or how the project behaves: `src/`, `skills/`, `package.json` (version, bin, dependencies), or a changed install command. For these:
   - bump the version one step in `package.json` (`npm version --no-git-tag-version <patch|minor|major>`): patch for fixes and small tweaks, minor for new features, major for breaking changes
   - move the `Unreleased` notes in `CHANGELOG.md` under the new version
   - commit `Release vX.Y.Z`, push, then tag and release:
     ```bash
     git tag -a vX.Y.Z -m "vX.Y.Z"
     git push origin vX.Y.Z
     npm pack && mv image-to-lottie-X.Y.Z.tgz image-to-lottie.tgz
     gh release create vX.Y.Z image-to-lottie.tgz --title "vX.Y.Z" --notes-file <notes>
     rm image-to-lottie.tgz
     ```
     The README installs `releases/latest/download/image-to-lottie.tgz`, so every release must attach a tarball with exactly that name.
3. **Docs-only changes do not release.** README, AGENTS.md, images, comments, and typo fixes are committed and pushed with no version bump, tag, or release.
4. **Keep READMEs in sync.** Any change to `README.md` gets the same change in `README.ko.md`, and the reverse.
5. **Validate before committing** a distribution change: `npm test` must pass (it builds first).
6. **Never commit secrets or private information**: no tokens, employer or internal names, personal emails, or home paths.

## Project rules

- New source is TypeScript under `src/`, ESM, strict. Tests run against `dist/`, so `npm test` builds first.
- `dist/` is committed, so `npx github:nathankim0/image-to-lottie` needs no build step. Run `npm run build` and commit `dist/` together with every `src/` change. Global installs use the release tarball, because `npm install -g github:...` links a temporary clone that npm deletes.
- A preset must state its parts and options in its `Preset` object; `image-to-lottie presets` prints them, and the README tables mirror them.
- Motion follows `skills/image-to-lottie/references/motion.md`: named easing from `EASE`, one hero beat, supporting layers quieter than the hero. No linear movement.
- Verify visual changes by rendering, not by reading JSON: `node dist/cli.js render <file> --frames ... --sheet <png>` and look at the image. Regenerate the committed example outputs when a preset's look changes.
- Example art must be original and free of brands, logos, and text. Generate it fresh; never copy art from another project.
- Keep committed example outputs small: `.lottie`, `sheet.png`, and `preview.gif` only (see `.gitignore`).

## Commit messages

Imperative, short subject. Example: `Add float preset with breathing shadow`.
