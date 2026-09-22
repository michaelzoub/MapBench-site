# Landing sequence — progressive pipeline animation

Date: 2026-09-21
Scope: `MapExperimentFigure` in `src/main.jsx`, its styles in `src/styles.css`,
and the `benchmarkSequence.components.figure` contract. No layout, copy or
routing changes.

## Goal

Keep the landing highly animated while making the motion simpler and more
product-like. The right-hand column builds itself stage by stage —
Repository → Canonical structure → Agent workspace → Verified outcome — keeps
every completed stage on screen, rests as a finished system, and replays.

## What was actually there

The two-column landing already existed: at `min-width: 981px` the photograph
holds the left column and the sequence runs down the right. Two things stopped
it working:

1. `.flow-column … .sequence-stage > div { display: none }` hid every stage's
   content, so the column rendered four bare labels.
2. A later block (`Persistent explanatory grammar`) set
   `.motion-token { display: none }` and `.sequence-stage { opacity: 1
   !important }`, which silently cancelled the timeline's token routing and
   its stage cross-fades. The JS still described a sequence where "only one
   stage is on screen at a time".

So the CSS had already moved toward an accumulating diagram and the timeline
had not.

## Decisions

1. **Accumulate, never replace.** Each stage arrives and stays. The previous
   stage settles to `opacity: .6` rather than fading out, and at the end every
   stage returns to full strength so the completed pipeline rests as one thing
   instead of a trail.
2. **The connector is the handoff.** Each stage owns a rail segment
   (`.stage-rail > i`, `scaleY: 0 → 1`, origin top) spanning its own grid row,
   so the four segments tile into one unbroken spine that grows downward. The
   segment is dark (`#8f8b85`) while its stage is being built and fades to a
   hairline (`#ccc8c2`) once the stage has produced its output — that tone
   change is the only focus signal in the column.
3. **One travelling object, once.** Both motion tokens and the multi-hop tree
   walk are gone. A single `.flow-artifact` chip leaves the `architecture.md`
   row in the structure stage and lands in the dashed `artifact` slot beside
   the agent, which then goes solid and relabels itself `architecture.md`.
   Everything else is carried by connectors, reveals and state changes.
4. **The traversal is a state change.** Tree rows light one after another to
   the target row. No token to follow.
5. **Rest, then replay.** `repeat: -1`, `repeatDelay: .2`. The cycle is ~13.8s:
   build ≈ 11s, a 2.2s rest with the whole system lit, then a .7s fade of the
   track. `onRepeat` restores every initial state, including the slot label.
6. **Both layouts, one timeline.** Below 981px the stages lie flat and the
   horizontal `.track-line` connectors draw (`scaleX`) instead of the rails;
   the rails and markers are `display: none` there. The artifact's path is
   measured with `point()`, so it is correct in either arrangement.

## Fit

Stage rows are weighted `1fr 1.16fr 1.04fr .8fr` to match how much each stage
has to show, so no stage overflows into the one below it. Uniform full-height
rows are what let the rail segments tile without gaps, so the weighting is
applied to the rows rather than by letting stages size themselves.

## Also changed

- The stage eyebrow (`header span`) was unstyled and rendered larger than its
  own title. Scoped to `.map-sequence`: 8px uppercase, tracked, muted.
- The dashed border and cramped height on `.structure-map` in the column made
  the graph read as an empty box; the border is dropped and the graph is laid
  out at a wide `232 × 92` to suit the column.
- Removed the dead `.motion-token` / `.build-token` / `.agent-token` rules and
  the `.generator-output` / `.outcome-port` selectors orphaned by this change.
- `.sequence-stage { opacity: 1 !important }` is scoped to
  `.sequence-figure:not(.map-sequence)` so the landing can settle its stages.
  The cartograph sequence is unaffected.
- `.map-sequence .track-line` starts at `opacity: 0` because its base line and
  arrowhead are pseudo-elements the timeline cannot reach; a
  `prefers-reduced-motion` rule restores it, since there is no timeline then.

## Sectional logic

`figure.belongs` drops `'one moving build token'` and `'one moving agent
token'` for `'connectors that draw the handoff'` and `'one moving generated
artifact'`; `coreIdea` becomes "Build … as one accumulating fixed-size
sequence."

## Out of scope

The landing layout, the photograph, the copy, and the other three views.
