# Motion rules

What the presets do, so a new preset or an edit keeps the same feel.

## Beats

Every animation tells one small story:

1. **Anticipation**: a shake, a crouch (squash wider and shorter), a lid lifting a little.
2. **Action**: the one hero beat. A pop, a jump, a reveal. Fast out, soft landing.
3. **Settle**: a small overshoot past the target, then rest. Then hold or loop.

Only one hero beat per animation. Supporting motion starts slightly after it (2 to 8 frames
at 60 fps) and ends before it settles.

## Easing by behavior

| Behavior | Name in code | Bezier |
| --- | --- | --- |
| Settling, landing | `settle` | 0, .65, .51, .99 |
| Loops, breathing, floating | `sine` | .37, 0, .63, 1 |
| Crouch before a jump | `anticipate` | .4, 0, .2, 1 |
| Leaving the ground, entering | `launch` | .2, .75, .34, .94 |
| The hero beat | `pop` | .94, .75, .34, .94 |
| Exits, fading away | `accel` | .55, 0, 1, 1 |
| Falling | `fall` | .55, 0, .9, .6 |

Never linear for movement. Linear is fine only for a constant spin.

## Squash and stretch

Keep volume: when x grows, y shrinks. Crouch about (107%, 91%), stretch about (95%, 107%),
landing about (109%, 89%), overshoot back about (97%, 104%). Pivot at the bottom center so
the object stays on the ground.

## Layers and their jobs

| Layer | Job | Keep it |
| --- | --- | --- |
| Shadow | grounds the object; shrinks and fades when it lifts | low opacity, flat ellipse |
| Glow | marks the hero moment or breathes behind a loop | soft radial gradient, never a hard edge |
| Sparkles | reward accents after the hero beat | 2 or 3, staggered, short |
| Particles | impact at the moment of the pop | from one origin, gone in about 0.4 s |

Order matters: things that come out of a box are drawn behind the box base, so they seem to
rise from inside it.

## Timing at 60 fps

- micro feedback 12 to 30 frames; a reveal 60 to 120; a loop 120 to 180
- stagger repeated items 3 to 6 frames apart
- once-only animations end on a composition worth staring at; it is what remains on screen
- loops end exactly where they start (same values, same velocity)

## Check before calling it done

Render the frames around the hero beat and the last frame. Look for crops at the canvas
edge, parts drifting apart, and anything that moves without a reason.
