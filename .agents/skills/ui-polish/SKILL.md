---
name: ui-polish
description: Refine MapBench interfaces for visual restraint, spacing, alignment, and scanability. Use when polishing UI, making a view feel calmer or more native, removing visual noise, or when the user asks to make an interface feel better.
---

# UI Polish

Refine existing MapBench UI. Do not invent a new visual system. `mapbench-design` is the source of truth for tokens, type, and components; this skill is the finishing pass.

## Goal

Make the interface feel calmer, more precise, and easier to scan. The viewer should notice the content, not the chrome.

## Pass

1. Compare the change to MapBench, Cartograph, Benchmark, and Experiments at the same width.
2. Remove anything that is only there to look like structure: extra rules, cards, frames, badges, stacked eyebrows, decorative arrows.
3. Restore hierarchy with type, weight, color, and whitespace. Labels 7–10px mono; titles 11px; body 14px; page titles 46–68px.
4. Align to the existing `.78fr / 1.22fr` research grid and shared baselines. A few pixels of drift is a defect.
5. Cut copy until each field is one short thought. If a paragraph wraps past three lines in its column, shorten it.
6. Prefer absence over decoration. If spacing already groups the content, do not add a divider.

## Density

- Large whitespace around compact content.
- One idea per block. Related fields share a row; unrelated sections get a larger gap, not a line.
- Comparison layouts use alignment and small marks (5px dots, opacity), never visible grid lines or table chrome.
- Secondary views stay inside the current tab and reuse page-transition motion.

## Stop when

The view could have shipped with the rest of the site. If it reads as a spec sheet, dashboard, or article, strip chrome and reopen space.
