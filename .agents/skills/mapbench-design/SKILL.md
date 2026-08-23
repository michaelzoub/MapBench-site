---
name: mapbench-design
description: Preserve MapBench's current visual language and UI/UX when implementing or reviewing website interfaces. Use for changes to MapBench pages, sections, navigation, research copy, technical diagrams, animations, experiment charts, data details, responsive layouts, or shared UI styles, especially in src/main.jsx and src/styles.css.
---

# MapBench Design

Preserve the site's specific aesthetic: extremely simple, technical, spacious, professional, and visually precise. Treat the current implementation as the source of truth; do not turn this into a generic design system or redesign the site.

## Start from the implementation

1. Inspect `src/styles.css` and the relevant components in `src/main.jsx` before proposing or editing UI.
2. Reuse existing CSS variables, classes, React components, SVG conventions, graph layout helpers, and GSAP timeline patterns. Extend the closest existing pattern before creating a new abstraction.
3. If this skill and the live implementation differ, follow the live implementation and update this skill when the change intentionally establishes a new convention.
4. Keep MapBench, Cartograph, Benchmark, and Experiments visually related. A new section must look as though it shipped with them.

## Visual language

- Keep the canvas white (`--paper: #ffffff`) and primary content nearly black (`--ink: #151515`; pure black is reserved for the mark or an equivalent high-contrast detail).
- Use only neutral grays already present in the site. Prefer the tokens `--body: #565656`, `--muted: #888888`, `--medium: #a8a8a8`, `--light: #ededed`, and `--soft: #f5f5f5`, or reuse a nearby established gray before adding one.
- Use contrast sparingly: black for primary content, active controls, small data marks, and primary CTAs; medium gray for body copy; pale gray for structure and inactive states.
- Keep surfaces flat. Do not add accent colors, gradients, glass effects, decorative textures, or elevation shadows. The existing white halo around moving diagram tokens is a functional contrast aid, not a surface treatment.
- One sanctioned accent exists: the Modal logomark (three-tone green: `#cdf3ba`, `#57d058`, `#00a24c`) and `#46c145` status dots inside the Trials runtime panel only, identifying the Modal execution substrate. Do not reuse green elsewhere or add other brand colors.
- Do not use horizontal or vertical separator lines. Group interface and research content with whitespace, alignment, scale, and positioning. Functional diagram connectors, chart marks, focus outlines, and progress indicators are not separators and may remain when they communicate state or structure.

## Layout and rhythm

- Preserve large deliberate whitespace around compact content. Do not fill empty space to make the page feel busy.
- Use the existing page frame as the baseline: fixed 88px desktop header, content up to 1480px wide, responsive outer padding, and vertically centered research views.
- For research sections, favor the established two-column composition: concise copy on the left, a wider technical visual on the right, aligned to a shared horizontal rhythm. The current grid uses approximately `.78fr / 1.22fr` with a generous 70–132px responsive gap.
- Keep text measures restrained: about 510px for the copy block, 520px for the primary statement, and 470px for body copy.
- Align stage headings, nodes, connectors, chart labels, and adjacent controls to consistent baselines. Treat a few pixels of drift as a defect, not decoration.
- Let composed visuals be wide, but contain overflow locally. At narrow widths, stack the main columns and allow deliberate horizontal scrolling inside diagrams or charts; never clip body copy or create page-level horizontal overflow.
- Follow the existing responsive transitions near 1120px, 980px, 850px, 620px, and 360px unless the current code has since changed.
- On small screens, stack the research columns, keep GitHub visible beside the wordmark, let the primary nav and diagrams scroll locally, and size tap targets at least ~40px. Do not shrink type or buttons to fit a single cramped row.

## Typography

- Use the existing Inter/system sans stack. Do not introduce serif, display, handwritten, or editorial type.
- Use large clean headings with tight tracking and calm weight: the research headings currently scale from 46–68px, use roughly `.98` line-height, `-.055em` tracking, and weight `500`. Experiments headings use the same family at a slightly smaller 40–56px scale.
- Each research view uses exactly two text levels: the large heading and 14px body copy (`1.7` line-height, medium gray). There is no intermediate "statement" style — a section's key question or claim is simply its first body paragraph.
- Never use middot or bullet separators (`·`, `•`) anywhere. Join fragments with commas, prose, or layout instead.
- Use small monospaced labels for technical metadata, stages, counts, units, and chart annotations: generally 7–10px, uppercase where categorical, with about `.05–.08em` letter spacing.
- Keep the hierarchy functional: title, research question or concise summary, supporting explanation, then metadata. Avoid editorial flourishes, oversized pull quotes, or marketing-style eyebrow stacks.
- Do not add ordinal ornaments ("01", "02", "03") to section headings or diagram states; sequence is conveyed by order, rails, and motion.
- The agent loop is always drawn as a circular track with exactly two states — LM reasoning and Environment — with "action" over the top arc, "observation" under the bottom arc, and the fixed Pi harness named in the hub. Do not add more nodes to the circle or flatten it into a linear channel.

## Components

- Reuse `ViewFrame`, `ResearchCopy`, the existing button classes, graph helpers, chart patterns, and stage structures whenever they fit.
- Keep navigation minimal: small text links, quiet inactive gray, a modest active treatment, and at most one subtle light-gray external-link pill.
- Use fully rounded CTAs. Primary CTAs are compact black pills with white text; secondary actions are compact pale-gray or white pills with a subtle 1px border.
- Use tags and pills only for concise metadata or actions. Keep them small, light gray, and low contrast.
- Keep secondary research detail inside its parent tab. Cartograph opens Design and Information boundary as separate in-page layers from quiet text controls, using the same GSAP fade/translate as page changes. Design states each projection’s hypothesis and tradeoff as the primary readable fields. Information boundary is a mark-based comparison with no visible rules.
- Represent technical artifacts with compact flat rows, nodes, slots, or panels in `--soft`/`--light`. Use small differences in gray or opacity to communicate state.
- Reserve solid black fills for small, high-information states such as an active metric tab, a primary CTA, a mean marker, or a terse status. Do not create oversized black boxes.
- Do not default to cards. Avoid large rounded containers, nested card grids, dashboard chrome, redundant section wrappers, and excessive badges.
- Preserve accessible focus states, semantic labels, `figcaption` descriptions, tabular numerals for experimental data, and useful hit areas even when the visible marks stay small.

## Diagrams and motion

- Make every diagram explain a real sequence, dependency, transformation, comparison, or measured result. If the visual carries no structural meaning, omit it.
- Build precise staged flows: compact aligned nodes, thin clean connectors, explicit ports, consistent spacing, and short labels. Route connectors into their intended nodes; avoid crossing lines, floating arrowheads, diagonal shortcuts, and awkward arrows.
- Follow the established diagram scale: roughly 23–30px rows/nodes, 1–1.25px gray edges, 5px ports, 8–10px moving tokens, and narrow connector columns. Use these as constraints, not decorative motifs.
- Animate causally and sequentially: source activates, token travels, destination responds, result settles. Use opacity and neutral-gray state changes before inventing transforms.
- Keep motion restrained. Existing transitions are commonly 120–720ms with `power1.inOut` or linear travel and about a 1.4s pause between loops. Do not add parallax, springy motion, random drift, ambient loops, or animation that competes with reading.
- Recompute geometry after resize, scope timelines to their figure, clean them up on unmount, and honor `prefers-reduced-motion`. The reduced-motion state must still communicate the full structure.
- Verify initial, active, settled/final, reset, and repeated states. No token, connector, or label may finish stranded, clipped, misaligned, or invisible when it contains essential meaning.

## Information density and tone

- Surface the research question, method, or main result first. Keep supporting details secondary and progressively disclosed.
- Prefer graphs and direct visual comparison for experimental data. Keep controls compact, show one primary metric at a time, and reveal run-level details through hover/focus/selection or a restrained adjacent detail region.
- Write in a professional research/engineering voice: simple, scientific, specific, polished, and confident. State what the system does or measures without hype.
- Avoid startup-marketing language, generic SaaS dashboards, editorial layouts, feature-card mosaics, inflated claims, repeated CTAs, and visual clutter.

## Do / Don't

**Do**

- Reuse a current token, component, layout, or animation pattern before adding one.
- Keep content short, aligned, and surrounded by intentional whitespace.
- Use monochrome contrast to express hierarchy and state.
- Turn processes into clean sequential diagrams and experiments into comparable plots.
- Match the visual density and baseline rhythm of the neighboring MapBench sections.

**Don't**

- Add accent colors, gradients, decorative shadows, illustrations, or ornamental motion.
- Introduce giant cards, heavy black panels, dense dashboards, or card grids.
- Mix unrelated type styles or use editorial treatments.
- Add arrows or animation merely to make a section feel dynamic.
- Expose every detail at once or repeat information across multiple surfaces.

## Implementation and review checklist

Before finishing a UI change:

1. Compare it directly with MapBench, Cartograph, Benchmark, and Experiments—not with generic references.
2. Confirm that existing tokens and components were reused wherever possible and justify any new primitive.
3. Inspect the full page at a representative desktop width and on both sides of every affected responsive breakpoint.
4. Check page-level and local overflow, column stacking, nav scrolling, text clipping, chart/diagram scrolling, grid alignment, horizontal baselines, whitespace, and content density.
5. Run every interaction with mouse and keyboard. Check focus visibility and ensure progressive details remain understandable.
6. Observe animations from initial state through final/reset state, after resizing, and with reduced motion enabled.
7. Remove any styling or content that is merely decorative, redundant, louder than the research content, or inconsistent with the rest of the site.
