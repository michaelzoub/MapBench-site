# Sectional logic

Before changing user-facing copy, structure, examples, animation, components, or interaction, read the applicable semantic chain in `src/sectionalLogic.js`.

Use the chain as an implementation invariant:

1. Start at the page goal and follow the relevant section, subsection, and component purpose.
2. A proposed child must directly support its own purpose and every ancestor's `coreIdea` and `communicates` statement.
3. Keep content within the ancestor's `belongs` list. If it does not fit, simplify it, move it to the correct section, or omit it.
4. Define a contract before adding a new structural boundary, and attach that boundary with `enforceSectionalLogic`.
5. Keep these contracts internal. Never render them as labels, badges, descriptions, data attributes, panels, or other UI.


# No eyebrows

Never add an eyebrow: a short label sitting above a heading or panel purely to
categorise it — kickers, overlines, small uppercase category text above a
diagram title, section tags. They restate what the heading already says and
push the real content down.

Applies to every guise: a `kicker`/`eyebrow`/`overline` field in a data array, a
`<span>` before a title inside a `<header>`, or a reserved grid row waiting for
one. When removing one, collapse the space it occupied instead of leaving a gap.

Genuine field labels (`Purpose`, `Tradeoff`), table column headers, chart axis
annotations, and status chips are not eyebrows — they carry data, keep them.
