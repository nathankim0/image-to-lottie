# Pitfalls

Mistakes made while building real animations with this tool, and what prevents each one.
Read this before the first build of a session.

## Direction

- **Redesigning in circles.** Several full redesigns (dark, light, envelope, cards) happened
  because the look was guessed. Get one to three reference images, or a named style, before
  generating any art. Ask once; it saves every later round.
- **Claiming how other teams do it without a source.** Say "unverified" or look it up.

## Images

- **Parts generated one at a time do not match.** Generate every part on one sheet in one
  request, then `split`. Same style, light, camera, and scale come for free.
- **A whole object when parts were needed.** If anything opens, separates, or flies off, the
  moving piece must be its own image. Decide the parts before generating.
- **An image agent working inside a repo commits on its own.** Repos with "commit after every
  change" rules make delegated agents try to commit. Tell them: "Only write the named file. Do not
  run git or edit anything else." Review the image, then commit it yourself.
- **Huge images for small display.** A 768 px frame shown at 200 px made a 7 MB `.lottie`.
  `build` and `check` now warn; resize to about twice the display size. `spin --size` does it for
  frames.

## Fitting and motion

- **Guessing the lid position.** Use `fit` and pick the smallest overlap that hides the opening.
- **Things flying off the canvas.** A lid's flight and confetti apex both went past the edge on
  the first try. `check` warns with frame numbers; render those frames and look. It is fine only
  for things meant to leave, like confetti falling out of the bottom.
- **Translucent leftovers over the hero.** A fading lid drawn over the rising items looked
  muddy. Finish exits before the hero settles, or move them away from it.
- **Effects too small for the canvas.** Confetti sized for 300 px looked like dust at 600 px.
  Size effects relative to the canvas (`fanfare` does) and look at a contact sheet at real size.

## Verifying

- **Timed screenshots of a live player miss short beats.** A 0.3 s burst was gone by the time
  the screenshot landed, and it looked broken. Pin frames instead: `render --frames`, or in a web
  player call `setFrame(n)` while paused, then capture.
- **WebGL canvases read back blank.** `toDataURL()` on a player canvas returns an empty image.
  Use `render` (headless Skottie) or a real screenshot.
- **"It renders" is not "it looks right".** Always open the contact sheet: the hero beat, the
  frames around it, and the last frame.

## Shipping

- **Wrong image paths in an app.** A JSON whose images sit at `/images/anim/` needs that prefix.
  Use `build --asset-base /images/anim/`, or ship `.lottie` with the images inside.
- **`npm install -g github:...` breaks.** npm links a temporary clone that it then deletes.
  Install from the release tarball (see README) or use `npx github:...`.
