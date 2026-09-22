# Editorial landing page — design

Date: 2026-09-21
Scope: MapBench landing view (`MapBenchView`) only. Cartograph, Experiment and
Results keep their current composition and inherit only the global background
and font change.

## Goal

Recompose the MapBench landing as a minimalist, editorial, image-led page:
soft off-white ground, generous whitespace, thin sans-serif, small understated
navigation, one large rounded photographic hero, a compressed animated intro
band above it, and a soft pill CTA beneath.

## Decisions

1. **Scope** — restyle the existing `MapBenchView`; keep all routes, views and
   sectional-logic contracts.
2. **Hero visual** — a user-supplied aerial photograph of a road winding through
   ploughed fields, rotated 90 degrees from 736x1472 portrait to 1472x736
   landscape so the road traverses the card horizontally.
3. **Photo treatment** — none for now. A commented `filter` hook is left in the
   CSS so desaturation can be dialled in later without restructuring.
4. **Intro animation** — `MapExperimentFigure` sits above the hero photo,
   compressed through an `.intro-band` variant class. All four stages and both
   moving tokens are retained; only density and label detail are reduced. The
   causal shape is an invariant.
5. **`AgentLoop` is not reusable here** — it is bound to
   `pages.experiment.sections.modelsHarness…`, and `enforceSectionalLogic` walks
   the whole ancestor chain, so rendering it on the MapBench page would require
   falsifying a contract.

## Tokens and type

- `--paper` `#ffffff` -> `#FAF9F7`; header backdrop and `theme-color` follow.
- New radii: `--r-media: 26px` (hero card), `--r-card: 18px` (smaller surfaces).
- Inter is declared at `src/styles.css:13` but was never loaded; the site has
  been rendering in system sans. Inter 300/400/500 is now actually loaded so the
  light weights exist.
- Headline: weight 500 -> 300, tracking `-.055em` -> `-.03em`, size
  `clamp(44px, 4vw, 62px)`.
- Nav links 13px -> 12px; the active state no longer bumps weight, it only
  darkens to `--ink`.
- No italics anywhere. Bold is reserved for the wordmark.

## Page structure

`MapBenchView` becomes a single stacked column (`.editorial-view`, replacing
`.two-column`):

1. Headline and the one-line research question, left aligned, `max-width: 620px`
2. `MapExperimentFigure` as a compressed intro band, `opacity: .72`
3. Hero photo: full content width, `aspect-ratio: 2/1`, `object-fit: cover`,
   `border-radius: var(--r-media)`, no border and no shadow
4. Supporting paragraph left, CTA pill and secondary action right

## CTA

`.primary-pill` padding `10px 17px` -> `13px 24px`, 13px text, hover lifts to
`#2a2a2a`. `.secondary-action` stays a quiet grey pill beside it.

## Sectional logic

`pages.mapbench.sections.overview.belongs` gains `'one framing image'`, and a
`heroImage` subsection with a `heroMedia` component contract is added. Contracts
are defined before the boundary is rendered, and are never emitted into the DOM.

## Out of scope

Restyling the other three views; any colour grading of the photograph.
