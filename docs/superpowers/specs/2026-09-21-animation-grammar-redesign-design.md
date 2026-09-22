# Animation grammar redesign

Replace every explanatory animation on the MapBench site. The landing page is
the visual north star; its current animation is rebuilt from scratch rather
than iterated on.

## Grammar

Small premium product explainers. Not architecture diagrams, dashboards,
timelines, or miniature pages.

- Sequential and causal: one thing happens, then the next. Prior context may
  stay softly visible; the whole system is never revealed upfront.
- 250-600ms transitions, restrained easing. Finish in a clean complete state.
- Extremely little text. Labels are 1-3 words, never sentences.
- Neutral monochrome only. No pastel artifact bars.
- No giant vertical rails, timeline dots, repeated status labels, dense file
  trees, dashboard widgets, or card overload.
- Thin strokes, small objects, whitespace, subtle opacity changes. Landing
  typography, radii, and weights throughout.
- One compact composition per animation, with one focal point.

## GSAP usage

`gsap.timeline()` is the sequencing backbone. `DrawSVG` for very subtle
connector drawing. `Flip` only where an object genuinely changes state or
position. `ScrollTrigger` only to start or replay. No MotionPath, no
travelling tokens, no SplitText, no excessive staggering, no looping pulses,
no decorative motion.

## Motion foundation

`src/motion.js` replaces `useCausalTimeline`.

- `DUR = { quick: .25, base: .36, slow: .55 }`
- `EASE = { out: 'power2.out', inOut: 'power2.inOut', draw: 'power1.inOut' }`
- `useSequence(ref, build, { start: 'mount' | 'scroll' })` registers the three
  plugins once, builds a paused timeline, and either plays it on mount or
  attaches a `once: true` ScrollTrigger.
- Under `prefers-reduced-motion` the hook calls `tl.progress(1).pause()`. The
  completed state is the static state, so the no-animation rendering is
  correct by construction rather than by maintenance.
- `usePageEntrance` collapses to one view-level fade plus a 12px rise. No
  per-element stagger.

## Shared figure primitive

Each animation is one inline SVG in a fixed viewBox inside `<Figure>`
(`<figure>` plus an `sr-only` `<figcaption>`). One `.mf-*` CSS family: 1px
`var(--rule)` strokes, `var(--soft)` fills, `var(--ink)` when active, 10px/450
labels in `var(--muted)`, radii from `--r-chip`. Mobile is `width: 100%` on
the SVG, not a second layout.

## Compositions

1. **Landing** `PipelineFigure`, 320x420, compact on the right of the
   photograph. Repository glyph appears, a connector draws, it Flips into a
   five-node structural shape, three small marks fan out, one Flips into a
   workspace already holding `Source`, a check draws. Labels: `Code`, `Map`,
   `Agent`, `Verified`. Plays once on mount and holds the complete state; the
   landing is scroll-locked, so a loop would be the only motion on a still
   page.
2. **Cartograph** `Files -> Tree-sitter -> IR -> 3 artifacts`. A three-sheet
   file stack slides into a Tree-sitter rect, emerges as one four-node IR,
   then three connectors draw to `Architecture`, `Skeleton`, `Call graph`. The
   moment that matters is one canonical representation producing three views.
3. **Experiment hero** Experimental isolation, not infrastructure. Four
   condition marks appear, each enters an identical trial container, and the
   four Flip into one `Compare` row.
4. **Setup / conditions** The harness frame is drawn once and never touched
   again. Only the slot inside crossfades between `None`, `Architecture`,
   `Skeleton`, `Call graph`. The invariant is shown by motion, not text.
5. **Setup / agent access** A workspace holds `Source` permanently. A second
   slot receives either nothing or exactly one artifact. Only that slot
   animates.
6. **Setup / trials** One condition fans through three drawn connectors into
   three identical cells. Each progresses empty -> running -> verified once.
   No activity bars, no pulsing indicators.
7. **Setup / outputs** One small trial record. Four rows reveal in order:
   `Outcome`, `Trajectory`, `Usage`, `Runtime`. Then it settles. No invented
   metric values.
8. **Models / harness** `Model -> Agent <-> Environment`. One connector draws
   outward for `action` and one back for `observation`. No orbit. Model
   switching is a Flip highlight.
9. **Results** Charts render essentially complete, with no staggered
   construction. Switching between `Solved`, `Tokens`, `Runtime`, `Cost`,
   `Navigation` is a short crossfade plus a Flip on the mean markers, so the
   comparison stays immediate.
10. **Future Work** Not a diagram. The editorial photo treatment stays; the
    entrance is a photograph reveal plus three short labels. The existing
    three-group card grid collapses to plain labelled paragraphs. No
    separators, no timeline.
11. **Page and section entrances** One subtle fade plus an 8-16px translation
    for the section as a whole.
12. **Navigation, buttons, hover** Short functional feedback only.

## Removals

Done before any new tween is written, so the new grammar is not layered on the
old one.

- `LegacyExperimentSetupFigure` (dead code, scrubber, tabs, pulsing bars)
- `AgentLoop`, `LOOP_CIRCUMFERENCE`, `ModalMark`
- `RoutedGraph`, `createGraphLayout`, and the `@dagrejs/dagre` dependency
- `point()` and `place()` travelling-token helpers
- `--artifact-wheat`, `--artifact-field`, `--artifact-road`, and the
  `tone-blue` / `tone-lilac` / `tone-mint` classes
- The `.sequence-track` / `.stage-rail` / `.track-line` CSS grammar

## Constraints

- New structural boundaries get contracts in `src/sectionalLogic.js` and are
  attached with `enforceSectionalLogic`, per `AGENTS.md`. No eyebrows.
- No unrelated layout or global styling changes to make an animation work.
- Desktop and mobile both checked. `prefers-reduced-motion` honored.
- Rebuild one component at a time; render and compare against the landing
  before moving to the next.
