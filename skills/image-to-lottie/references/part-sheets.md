# Part sheet prompts

Fill the angle brackets. Keep the requirements block as is; each line prevents a failure
seen in practice.

## Requirements block (append to every prompt)

```text
One image, about 1536x1024, fully transparent background.
The objects do not touch; leave wide transparent gaps between them.
Identical camera for all objects: front view, slightly from above. Same lighting and scale.
No text, letters, numbers, logos, or ground shadows.
```

## Something that opens (gift-open)

```text
Soft glossy 3D render, <material, e.g. frosted lavender glass>, studio lighting, clean shapes.
Three objects left to right:
(A) the BASE only: an open box without a lid, <ribbon color> ribbon down the front,
    soft warm light glowing inside, EMPTY inside.
(B) the LID only, with a <bow color> bow, exactly as wide as the base's top opening
    so it fits on it.
(C) one <reward object>, about 40% of the base height.
<requirements block>
```

Then `split sheet.png -o parts --names base,lid,item`.

## One object (hop, float, pop-in)

```text
Soft glossy 3D render of <object>, <material and colors>, studio lighting,
centered with comfortable padding, front view.
One image, 1024x1024, fully transparent background. No text, logos, or ground shadow.
```

No split needed; pass it as `--subject`.

## A celebration (fanfare)

```text
Soft glossy 3D render of ONE party popper (cone confetti shooter), <colors>, studio lighting.
It points diagonally: narrow tip at the lower-left, wide open mouth at the upper-right, exactly
45 degrees. The mouth is empty: no confetti or streamers. 1024x1024, fully transparent
background, centered. No text, logos, or ground shadow.
```

Pass it as `--part popper=popper.png`. The preset mirrors it for the right corner and draws the
confetti as vector shapes.

## A turning object (spin + sequence)

```text
Soft glossy 3D render of <coin or badge> seen straight from the front, simple embossed
<symbol> in the middle, centered, 768x768, fully transparent background. No text.
```

Then `spin coin.png -o frames --size <display size>` and
`build --preset sequence --frames frames --fps 24 --option hold=2`.

## Matching an existing style

Attach the approved image and say: "Match the style of <file> exactly: material, light,
camera angle, colors." Ask for all new parts on one sheet anyway.

## Reject the sheet when

- the background is not transparent (split refuses it)
- parts touch or overlap (split sees one object)
- the lid is narrower or wider than the base opening, or drawn at another angle
- the base has the reward already inside it
- any text or logo appears
