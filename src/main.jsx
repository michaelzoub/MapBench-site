import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DUR, EASE, Flip, gsap, q, qa, reducedMotion, useSequence } from './motion';
import { enforceSectionalLogic, validateSectionalLogic } from './sectionalLogic';
import { CONDITION_SUMMARY, TASK_RESULTS } from './results';
import './styles.css';

validateSectionalLogic();

const GITHUB_URL = 'https://github.com/michaelzoub/project-outline';
const VIEWS = [
  { id: 'cartograph', label: 'Cartograph' },
  { id: 'experiment', label: 'Experiment' },
  { id: 'results', label: 'Results' },
  { id: 'future', label: 'Future Work' },
];
const VALID_VIEWS = ['mapbench', ...VIEWS.map((view) => view.id)];

function usePageEntrance(ref, pageKey) {
  useLayoutEffect(() => {
    const root = ref.current;
    const page = root && q(root, '.view');
    if (!page) return undefined;

    // One entrance for the page as a whole. Staggering each heading, paragraph
    // and figure separately made arriving on a page an event in itself, which
    // competed with the sequences the page exists to show.
    const context = gsap.context(() => {
      if (reducedMotion()) {
        gsap.set(page, { clearProps: 'opacity,transform' });
        return;
      }
      gsap.fromTo(page, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: DUR.slow, ease: EASE.out });
    }, root);

    return () => context.revert();
  }, [pageKey, ref]);
}

function Mark() {
  enforceSectionalLogic('sharedComponents.projectMark', 'component');
  return (
    <svg className="brand-symbol" viewBox="0 0 31 19" aria-hidden="true">
      <rect className="brand-bar" x="0" y="0" width="31" height="4"/>
      <rect className="brand-leg brand-leg-left" x="5" y="4" width="4" height="15"/>
      <rect className="brand-leg brand-leg-right" x="22" y="4" width="4" height="15"/>
    </svg>
  );
}

function ModalMark({ x = 0, y = 0, width = 20 }) {
  enforceSectionalLogic('pages.experiment.sections.setup.subsections.trials.components.modalMark', 'component');
  return (
    <svg className="mf-modal-mark" x={x} y={y} width={width} height={width * 0.51} viewBox="0 0 1102 561" aria-hidden="true">
      <path fill="#cdf3ba" d="M225 0 550 190 330 205Z"/>
      <path fill="#57d058" d="M225 0 330 205 130 561 0 330Z"/>
      <path fill="#00a24c" d="M330 205 550 190 345 561 130 561Z"/>
      <path fill="#cdf3ba" d="M660 0 1102 330 768 300Z"/>
      <path fill="#57d058" d="M660 0 768 300 772 561 551 190Z"/>
      <path fill="#00a24c" d="M768 300 1102 330 1000 561 772 561Z"/>
    </svg>
  );
}

function Header({ active, onNavigate }) {
  enforceSectionalLogic('sharedComponents.header', 'component');
  const activeNavRef = useRef(null);
  const wordmarkRef = useRef(null);

  useEffect(() => {
    activeNavRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  useLayoutEffect(() => {
    const wordmark = wordmarkRef.current;
    const symbol = wordmark && q(wordmark, '.brand-symbol');
    const bar = symbol && q(symbol, '.brand-bar');
    const legs = symbol && qa(symbol, '.brand-leg');
    if (!wordmark || !symbol || !bar || legs.length !== 2) return undefined;

    const isHome = active === 'mapbench';
    const targetProgress = isHome ? 0 : 1;
    const renderMark = (progress) => {
      const barX = 3.5 * progress;
      bar.setAttribute('x', barX.toFixed(3));
      bar.setAttribute('width', (31 - barX * 2).toFixed(3));
      legs[0].setAttribute('x', (5 + 3 * progress).toFixed(3));
      legs[1].setAttribute('x', (22 - 3 * progress).toFixed(3));
    };

    if (reducedMotion()) {
      renderMark(targetProgress);
      gsap.set(wordmark, { color: isHome ? '#151515' : '#888888' });
      return undefined;
    }

    // One GSAP-driven progress value keeps every piece of the mark on the
    // exact same frame. SVG geometry stays crisp; no independent CSS inset or
    // scale interpolation can make the bars wobble or change thickness.
    const state = { progress: Math.min(1, Math.max(0, Number(bar.getAttribute('x')) / 3.5)) };
    const markTween = gsap.to(state, {
      progress: targetProgress,
      duration: 0.84,
      ease: 'back.out(1.45)',
      overwrite: 'auto',
      onUpdate: () => renderMark(state.progress),
    });
    const colorTween = gsap.to(wordmark, {
      color: isHome ? '#151515' : '#888888',
      duration: 0.68,
      ease: 'sine.inOut',
      overwrite: 'auto',
    });

    return () => {
      markTween.kill();
      colorTween.kill();
    };
  }, [active]);

  return (
    <header className="site-header">
      <button ref={wordmarkRef} className="wordmark" onClick={() => onNavigate('mapbench')} aria-label="Go to MapBench introduction">
        <Mark/><span>MapBench</span>
      </button>
      <nav className="primary-nav" aria-label="Primary navigation">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            ref={active === view.id ? activeNavRef : undefined}
            className={`nav-link ${active === view.id ? 'active' : ''}`}
            aria-current={active === view.id ? 'page' : undefined}
            onClick={() => onNavigate(view.id)}
          >
            {view.label}
          </button>
        ))}
      </nav>
      <a className="secondary-pill" href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub ↗</a>
    </header>
  );
}


function ViewFrame({ id, logic, children, className = '', rootRef }) {
  enforceSectionalLogic('sharedComponents.viewFrame', 'component');
  enforceSectionalLogic(logic, 'page');
  return <section ref={rootRef} className={`view ${className}`} id={id} aria-labelledby={`${id}-title`}>{children}</section>;
}

function ResearchCopy({ id, logic, title, statement, children, action }) {
  enforceSectionalLogic('sharedComponents.researchCopy', 'component');
  enforceSectionalLogic(logic, 'section');
  return (
    <div className="research-copy">
      <h1 id={`${id}-title`}>{title}</h1>
      <div className="copy-body">
        {statement && <p>{statement}</p>}
        {children}
      </div>
      {action}
    </div>
  );
}

/*
 * The landing sequence: code → map → agent → verified.
 *
 * One composition, one focal point, one word on screen at a time. The
 * repository is drawn, becomes the boundary of its own structural map, the map
 * produces three artifacts, exactly one of them joins an agent that already has
 * the source, and the run is checked. Nothing travels that is not the artifact,
 * and no stage is shown before the step that produces it.
 */
/*
 * One 360 x 456 field, laid out on a single 30 -> 330 content width so the
 * repository frame, the artifact row and the workspace share their left and
 * right edges. Every vertical measure below is stated once here: the figure is
 * read as a column, so its rhythm has to be legible as numbers, not guessed at
 * in the markup.
 */
const MAP_NODES = [
  { x: 180, y: 56 },
  { x: 109, y: 98 },
  { x: 251, y: 98 },
  { x: 72, y: 140 },
  { x: 151, y: 140 },
  { x: 288, y: 140 },
];
// A branching structure rather than a hub: the map has a single root the whole
// repository hangs off, which is what makes three views of it legible.
const MAP_EDGES = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5]];
// Three chips tile the content width exactly: 3 x 88 + 2 x 18 = 300.
const ARTIFACT_X = [74, 180, 286];
// The middle artifact is the one that goes to the agent. It is the shortest
// travel on screen, so the move reads as a handoff rather than a journey.
const CARRIED = 1;
const ARTIFACT_LABELS = ['Architecture', 'Skeleton', 'Call graph'];
const PIPELINE_CAPTIONS = ['Code as input', 'Generates a deterministic map', 'Agents use the map', 'Verifier grades the work'];
// The map is built 100 lower than it finally rests, so the first two steps are
// composed near the middle of the field instead of at its top. The lift at the
// handoff is what opens the room the workspace needs.
const STAGE_DROP = 100;
/*
 * The caption sits 30 below whatever the composition currently bottoms out at,
 * and only ever travels downward: source -> opened frame -> artifact row ->
 * below the workspace. Nothing it passes is still where it was.
 */
const CAPTION_Y = { source: 272, frame: 294, artifacts: 358, workspace: 432 };

function PipelineFigure({ className = '' }) {
  enforceSectionalLogic('pages.mapbench.sections.overview.subsections.benchmarkSequence.components.figure', 'component');
  const ref = useRef(null);

  const build = useCallback((root, tl) => {
    const source = q(root, '.mf-source');
    const mapStage = q(root, '.mf-map-stage');
    const sourceLines = qa(root, '.mf-source-line');
    const nodes = qa(root, '.mf-node');
    const edges = qa(root, '.mf-edge');
    const artifacts = qa(root, '.mf-artifact');
    const artifactLabels = qa(root, '.mf-artifact-label');
    const stems = qa(root, '.mf-stem');
    const carried = artifacts[CARRIED];
    const dropped = artifacts.filter((_, index) => index !== CARRIED);
    const carriedLabel = artifactLabels[CARRIED];
    const droppedLabels = artifactLabels.filter((_, index) => index !== CARRIED);
    const workspace = q(root, '.mf-workspace');
    const held = q(root, '.mf-held');
    const check = q(root, '.mf-check');
    const caption = q(root, '.mf-caption');
    const lines = qa(root, '.mf-caption-line');

    // Build-time bookkeeping for the caption: which of the two stacked lines is
    // currently the visible one, and where the pair is sitting.
    let visible = 0;
    let baseline = CAPTION_Y.source;

    // A sentence never cuts to the next one. The two lines cross-fade in place
    // on the shared baseline: the words themselves never move, so the only
    // movement in the caption is the baseline's own travel.
    const fade = (text, y, position) => {
      const outgoing = lines[visible];
      const incoming = lines[1 - visible];
      visible = 1 - visible;
      if (y !== baseline) travel(y, position);
      tl.set(incoming, { textContent: text, opacity: 0 }, position)
        .to(outgoing, { opacity: 0, duration: DUR.base, ease: EASE.inOut }, position)
        // The arrival trails the departure enough that the two sentences are
        // never both legible at once.
        .to(incoming, { opacity: 1, duration: DUR.slow, ease: EASE.inOut }, `${position}+=0.2`);
    };

    // The same sentence, further down: the composition grew underneath it.
    function travel(y, position) {
      tl.to(caption, { y, duration: DUR.slow, ease: EASE.inOut }, position);
      baseline = y;
    }

    // Everything the timeline mutates by `set` rather than by tween is restored
    // at time 0, so a replay starts from the first frame and not from the last
    // cycle's end state.
    tl.set(mapStage, { y: STAGE_DROP }, 0)
      .set(caption, { y: CAPTION_Y.source }, 0)
      .set(lines[0], { textContent: PIPELINE_CAPTIONS[0], opacity: 0 }, 0)
      .set(lines[1], { textContent: '', opacity: 0 }, 0);

    gsap.set(source, { opacity: 0, y: 8 });
    gsap.set(sourceLines, { opacity: 0 });
    gsap.set([...nodes, ...artifacts, ...artifactLabels, workspace, held], { opacity: 0 });
    gsap.set([...edges, ...stems, check], { drawSVG: '0%' });

    // 1 — Code as input. A repository, and nothing else on the page yet.
    tl.to(source, { opacity: 1, y: 0, duration: DUR.base })
      .to(sourceLines, { opacity: 1, duration: DUR.base, stagger: 0.06 }, '-=0.22')
      .to(lines[0], { opacity: 1, duration: DUR.base }, '<');

    // 2 — Generates a deterministic map. The repository box opens out into
    // the frame of its own structure: the same object, read differently.
    tl.addLabel('opens', '+=0.45')
      .to(sourceLines, { opacity: 0, duration: DUR.base }, 'opens')
      .to(source, { attr: { x: 30, y: 24, width: 300, height: 140, rx: 14 }, duration: DUR.slow, ease: EASE.inOut }, 'opens')
      .to(source, { opacity: 0.45, duration: DUR.slow }, 'opens')
      .to(nodes, { opacity: 1, duration: DUR.base, stagger: 0.05 }, 'opens+=0.3')
      .to(edges, { drawSVG: '100%', duration: DUR.base, stagger: 0.05, ease: EASE.draw }, 'opens+=0.45');
    fade(PIPELINE_CAPTIONS[1], CAPTION_Y.frame, 'opens');

    // 3 — Three artifacts, one canonical structure. They appear together
    // because they are one act, not three steps. The sentence clears the row
    // they are about to occupy as they draw.
    tl.addLabel('artifacts', '+=0.4')
      .to(stems, { drawSVG: '100%', duration: DUR.base, stagger: 0.06, ease: EASE.draw }, 'artifacts')
      .to(artifacts, { opacity: 1, duration: DUR.base, stagger: 0.05 }, 'artifacts+=0.2')
      .to(artifactLabels, { opacity: 1, duration: DUR.base, stagger: 0.05 }, 'artifacts+=0.26');
    travel(CAPTION_Y.artifacts, 'artifacts');

    // 4 — Agents use the map. The workspace already holds the source; only
    // the artifact is in question, so only the artifact moves. Make room
    // first: the sentence travels below the future workspace while the map
    // settles upward, so nothing ever arrives on top of the text.
    tl.addLabel('handoff', '+=0.45')
      .to(mapStage, { y: 0, duration: DUR.slow, ease: EASE.inOut }, 'handoff');
    fade(PIPELINE_CAPTIONS[2], CAPTION_Y.workspace, 'handoff');
    tl.to(workspace, { opacity: 1, duration: DUR.base }, 'handoff+=0.5')
      .to(held, { opacity: 1, duration: DUR.base }, 'handoff+=0.68');
    // The two artifacts not in play leave, and the map recedes to the faintest
    // reading of itself. Its frame goes entirely: a large pale rectangle is the
    // heaviest thing on the page for the least it says.
    tl.to([...dropped, ...stems, ...droppedLabels], { opacity: 0, duration: DUR.base }, 'handoff+=0.9')
      .to(source, { opacity: 0, duration: DUR.slow }, '<')
      .to([...nodes, ...edges], { opacity: 0.26, duration: DUR.slow }, '<')
      // The artifact travels intact. Keeping its original dimensions avoids a
      // final-frame scale jump (and the small text clipping that came with it)
      // while still making the handoff unambiguous.
      .to(carried, { attr: { x: 206, y: 315, width: 88, height: 32, rx: 6 }, duration: DUR.slow, ease: EASE.inOut }, '-=0.16')
      .to(carriedLabel, { attr: { x: 250, y: 331 }, fill: '#777777', duration: DUR.slow, ease: EASE.inOut }, '<');

    // 5 — Verifier grades the work. The check is the only thing that resolves.
    tl.addLabel('graded', '+=0.2')
      .to(check, { drawSVG: '100%', duration: DUR.base, ease: EASE.draw }, 'graded');
    fade(PIPELINE_CAPTIONS[3], CAPTION_Y.workspace, 'graded');
  }, []);

  useSequence(ref, build, { start: 'mount', repeat: true });

  return (
    <figure className={`mf-figure mf-pipeline ${className}`} ref={ref}>
      <figcaption className="sr-only">
        Code is the input to a deterministic structural map. Agents use one map artifact alongside
        the full source, and a verifier grades the resulting work.
      </figcaption>
      <svg viewBox="0 0 360 456" aria-hidden="true">
        {/* The workspace is a background field. It must be painted before the
            map stage so the carried artifact remains visible as it settles. */}
        <rect className="mf-workspace" x="30" y="288" width="300" height="114" rx="14"/>

        <g className="mf-map-stage">
          <rect className="mf-source" x="138" y="46" width="84" height="96" rx="10"/>
          {[0, 1, 2].map((index) => (
            <line className="mf-source-line" key={index} x1="158" x2={index === 1 ? 190 : 202} y1={74 + index * 20} y2={74 + index * 20}/>
          ))}

          {MAP_EDGES.map(([from, to]) => (
            <line className="mf-edge" key={`${from}-${to}`} x1={MAP_NODES[from].x} y1={MAP_NODES[from].y} x2={MAP_NODES[to].x} y2={MAP_NODES[to].y}/>
          ))}
          {MAP_NODES.map((node, index) => (
            <rect className={`mf-node ${index === 0 ? 'is-core' : ''}`} key={index} x={node.x - 10} y={node.y - 10} width="20" height="20" rx="5"/>
          ))}

          <line className="mf-stem" x1="180" y1="164" x2="180" y2="180"/>
          <line className="mf-stem" x1="74" y1="180" x2="286" y2="180"/>
          {ARTIFACT_X.map((x) => <line className="mf-stem" key={x} x1={x} y1="180" x2={x} y2="196"/>)}
          {ARTIFACT_X.map((x) => <rect className="mf-artifact" key={x} x={x - 44} y="196" width="88" height="32" rx="6"/>)}
          {ARTIFACT_X.map((x, index) => (
            <text className="mf-artifact-label" key={ARTIFACT_LABELS[index]} x={x} y="212">{ARTIFACT_LABELS[index]}</text>
          ))}
        </g>

        <g className="mf-held">
          <rect x="66" y="315" width="88" height="32" rx="6"/>
          <text x="110" y="331">Source</text>
        </g>
        <path className="mf-check" d="M169 375 L176 382 L191 368"/>

        <g className="mf-caption">
          <text className="mf-caption-line" x="180" y="0">Code as input</text>
          <text className="mf-caption-line" x="180" y="0"/>
        </g>
      </svg>
    </figure>
  );
}

function HeroMedia({ children }) {
  enforceSectionalLogic('pages.mapbench.sections.overview.subsections.heroImage.components.heroMedia', 'component');
  return (
    <section className="hero-media">
      <img
        className="hero-media-image"
        src="/hero-terraces.png"
        width="1080"
        height="1350"
        alt="Terraced fields seen from directly above, with narrow paths tracing routes across the terrain."
        decoding="async"
        fetchPriority="high"
      />
      {/* Darkens only the lower band of the photograph, so the copy below has a
          stable ground on any crop the viewport happens to show. */}
      <i className="hero-media-scrim" aria-hidden="true"/>
      <div className="hero-media-content">{children}</div>
    </section>
  );
}

function MapBenchView({ onNavigate }) {
  enforceSectionalLogic('pages.mapbench.sections.overview', 'section');
  enforceSectionalLogic('pages.mapbench.sections.overview.subsections.heroImage', 'subsection');
  enforceSectionalLogic('pages.mapbench.sections.overview.subsections.benchmarkSequence', 'subsection');
  return (
    <ViewFrame id="mapbench" logic="pages.mapbench" className="editorial-view mapbench-view">
      <HeroMedia>
        <h1 id="mapbench-title">MapBench</h1>
        <p className="editorial-statement">
          Do deterministic structural artifacts help agents traverse unfamiliar codebases more efficiently?
        </p>
        <div className="hero-actions">
          <button className="primary-pill" onClick={() => onNavigate('experiment')}>See how the benchmark works <span aria-hidden="true">→</span></button>
          <button className="secondary-action" onClick={() => onNavigate('results')}>View experiment results</button>
        </div>
      </HeroMedia>

      <div className="landing-sequence">
        <PipelineFigure/>
      </div>
    </ViewFrame>
  );
}

// One canonical representation producing three views. The file stack goes into
// Tree-sitter and comes out the other side as a single shape; only then does
// that shape fan into the three artifacts MapBench tests.
const IR_NODES = [{ x: 350, y: 70 }, { x: 318, y: 100 }, { x: 382, y: 100 }, { x: 350, y: 130 }];
const IR_EDGES = [[0, 1], [0, 2], [1, 3], [2, 3]];
const PROJECTIONS = [
  { label: 'Architecture', y: 70 },
  { label: 'Skeleton', y: 100 },
  { label: 'Call graph', y: 130 },
];

function CartographFigure() {
  enforceSectionalLogic('pages.cartograph.sections.overview.subsections.pipeline.components.figure', 'component');
  const ref = useRef(null);

  const build = useCallback((root, tl) => {
    const sheets = qa(root, '.mf-sheet');
    const sourceLabel = q(root, '.mf-source-label');
    const intake = q(root, '.mf-intake');
    const parser = q(root, '.mf-parser');
    const parserLabel = q(root, '.mf-parser-label');
    const transfer = q(root, '.mf-transfer');
    const nodes = qa(root, '.mf-node');
    const edges = qa(root, '.mf-edge');
    const irLabel = q(root, '.mf-ir-label');
    const stems = qa(root, '.mf-stem');
    const outputs = qa(root, '.mf-output');

    gsap.set([...sheets, sourceLabel], { opacity: 0, x: -10 });
    gsap.set([parser, parserLabel, irLabel, ...nodes, ...outputs], { opacity: 0 });
    gsap.set([intake, transfer, ...edges, ...stems], { drawSVG: '0%' });

    // 1 — Files.
    tl.to(sheets, { opacity: 1, x: 0, duration: DUR.base, stagger: 0.07 })
      .to(sourceLabel, { opacity: 1, x: 0, duration: DUR.quick }, '-=0.16');

    // 2 — Tree-sitter. The files are read, not consumed: they stay on screen
    // as the input they are, and only the connector carries them in.
    tl.to(intake, { drawSVG: '100%', duration: DUR.base, ease: EASE.draw }, '+=0.35')
      .to(parser, { opacity: 1, duration: DUR.base }, '-=0.14')
      .to(parserLabel, { opacity: 1, duration: DUR.quick }, '-=0.18')
      .to([...sheets, sourceLabel], { x: 8, opacity: 0.3, duration: DUR.slow, stagger: 0.04, ease: EASE.inOut }, '-=0.34');

    // 3 — One canonical shape comes out. The transfer connector makes the
    // parser-to-IR dependency explicit before the graph resolves.
    tl.to(transfer, { drawSVG: '100%', duration: DUR.base, ease: EASE.draw }, '+=0.15')
      .to(nodes, { opacity: 1, duration: DUR.quick, stagger: 0.06 }, '-=0.12')
      .to(edges, { drawSVG: '100%', duration: DUR.base, stagger: 0.05, ease: EASE.draw }, '-=0.14')
      .to(irLabel, { opacity: 1, duration: DUR.quick }, '-=0.1')
      .to([parser, parserLabel], { opacity: 0.4, duration: DUR.base }, '<');

    // 4 — The moment the figure exists for: one shape, three views.
    tl.to(stems, { drawSVG: '100%', duration: DUR.base, stagger: 0.07, ease: EASE.draw }, '+=0.3')
      .to(outputs, { opacity: 1, duration: DUR.base, stagger: 0.07 }, '-=0.22');
  }, []);

  useSequence(ref, build, { repeat: true });

  return (
    <figure className="mf-figure mf-cartograph" ref={ref}>
      <figcaption className="sr-only">
        Source files are parsed by Tree-sitter into one canonical intermediate representation, which
        is projected into three artifacts: architecture, skeleton, and call graph.
      </figcaption>
      <svg viewBox="20 50 514 124" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <rect className="mf-sheet" key={index} x="34" y={78 + index * 22} width="56" height="16" rx="4"/>
        ))}
        <text className="mf-source-label" x="62" y="154">Source files</text>

        <line className="mf-intake" x1="98" y1="100" x2="146" y2="100"/>
        <rect className="mf-parser" x="152" y="72" width="100" height="56" rx="12"/>
        <text className="mf-parser-label" x="202" y="100">Tree-sitter</text>
        <line className="mf-transfer" x1="258" y1="100" x2="306" y2="100"/>

        {IR_EDGES.map(([from, to]) => (
          <line className="mf-edge" key={`${from}-${to}`} x1={IR_NODES[from].x} y1={IR_NODES[from].y} x2={IR_NODES[to].x} y2={IR_NODES[to].y}/>
        ))}
        {IR_NODES.map((node, index) => (
          <rect className={`mf-node ${index === 0 ? 'is-core' : ''}`} key={index} x={node.x - 6} y={node.y - 6} width="12" height="12" rx="3"/>
        ))}
        <text className="mf-ir-label" x="350" y="160">IR</text>

        {PROJECTIONS.map((projection) => (
          <line className="mf-stem" key={projection.label} x1="394" y1="100" x2="444" y2={projection.y}/>
        ))}
        {PROJECTIONS.map((projection) => (
          <g className="mf-output" key={projection.label}>
            <rect className="mf-artifact" x="448" y={projection.y - 5} width="18" height="10" rx="5"/>
            <text x="476" y={projection.y}>{projection.label}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

const DESIGN_PROJECTIONS = [
  {
    id: 'architecture',
    title: 'architecture.md',
    purpose: 'A bounded WHERE view of repository files, directories, structural entrypoints, and module/package dependencies. Agents form a mental model and find a place to start.',
    tradeoff: 'Declaration signatures and symbol-level execution behavior are deliberately excluded. Dynamic loading, configuration, generated modules, and reflection may be absent.',
  },
  {
    id: 'skeleton',
    title: 'skeleton.md',
    purpose: 'A WHAT view with a file index, then one source-ordered section per file carrying its language-native declarations and exact signatures. Locate types, functions, and interfaces without opening every source file.',
    tradeoff: 'Imports, call relationships, and implementation bodies are deliberately excluded. Agents still need the source tree to understand behavior.',
  },
  {
    id: 'call-graph',
    title: 'callgraph.md',
    purpose: 'A searchable HOW view with bounded execution paths and one section per call node. Follow exact symbol IDs through direct callees, reverse callers, and static boundary evidence.',
    tradeoff: 'Declaration kinds and signatures are excluded, and static analysis can miss dynamic dispatch, callbacks, reflection, registries, dependency injection, and runtime-only behavior.',
  },
];

// Combinations are deliberately not measured: they would force the agent to
// discover and navigate between separate artifact locations that no real
// deployment uses, so a negative result would mislead rather than inform.
const COMBINATION_RATIONALE = 'Combinations are deliberately not measured. Supplying two or more artifacts at once forces the agent to discover and navigate between separate artifact locations that no real deployment uses, so a negative result would mislead rather than inform.';

const BOUNDARY_COLUMNS = ['Architecture', 'Skeleton', 'Call graph'];
// Concrete generator-backed distinctions between the three projections of the
// canonical structural IR. Avoid dimensions that are only partially exposed.
const INFORMATION_BOUNDARY = [
  { label: 'Component-grouped repository structure', values: [true, false, false] },
  { label: 'Structural entrypoints', values: [true, false, false] },
  { label: 'Module and package dependencies', values: [true, false, false] },
  { label: 'Declaration kinds and signatures', values: [false, true, false] },
  { label: 'Parameters and return types', values: [false, true, false] },
  { label: 'Inheritance / implementation clauses', values: [false, true, false] },
  { label: 'Direct callees', values: [false, false, true] },
  { label: 'Reverse callers', values: [false, false, true] },
  { label: 'Bounded execution-flow paths', values: [false, false, true] },
  { label: 'Unresolved / external calls', values: [false, false, true] },
  { label: 'Implementation bodies', values: [false, false, false] },
];

function CartographDesignLayer({ onBack, backRef }) {
  enforceSectionalLogic('pages.cartograph.sections.design', 'section');
  enforceSectionalLogic('pages.cartograph.sections.design.subsections.projectionComparison.components.projectionRows', 'component');
  return (
    <div className="cartograph-design">
      <div className="cartograph-design-heading">
        <div>
          <button ref={backRef} className="text-action design-back" onClick={onBack} aria-label="Back to Cartograph overview">
            <span aria-hidden="true">←</span> Overview
          </button>
          <h1 id="cartograph-title">Design</h1>
        </div>
        <p>Each projection has a purpose — what it is for — and a tradeoff — what it conceals. Exactly one is supplied per condition.</p>
      </div>
      <div className="design-projections">
        {DESIGN_PROJECTIONS.map((item) => (
          <article className="design-projection" key={item.id}>
            <header>
              <p>{item.title}</p>
            </header>
            <div className="design-fields">
              <section className="design-field">
                <h3>Purpose</h3>
                <p>{item.purpose}</p>
              </section>
              <section className="design-field">
                <h3>Tradeoff</h3>
                <p>{item.tradeoff}</p>
              </section>
            </div>
          </article>
        ))}
      </div>
      <p className="design-note">{COMBINATION_RATIONALE}</p>
    </div>
  );
}

function CartographBoundaryLayer({ onBack, backRef }) {
  enforceSectionalLogic('pages.cartograph.sections.boundary', 'section');
  enforceSectionalLogic('pages.cartograph.sections.boundary.subsections.matrix.components.boundaryMatrix', 'component');
  return (
    <div className="cartograph-design">
      <div className="cartograph-design-heading">
        <div>
          <button ref={backRef} className="text-action design-back" onClick={onBack} aria-label="Back to Cartograph overview">
            <span aria-hidden="true">←</span> Overview
          </button>
          <h1 id="cartograph-title">Information boundary</h1>
        </div>
        <p>Tree-sitter parses the repository and feeds one normalized structural IR. Architecture, Skeleton, and Call Graph are deterministic projections of that IR, each exposing a different set of structural information. Implementation bodies remain in source.</p>
      </div>
      <section className="design-boundary">
        <div className="chart-key" aria-hidden="true">
          <span><i className="key-on"/>Retained</span>
          <span><i className="key-off"/>Omitted</span>
        </div>
        <div className="boundary-scroll">
          <table className="boundary-matrix">
            <caption className="sr-only">Information retained by the architecture, skeleton, and call-graph projections</caption>
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">Dimension</span></th>
                {BOUNDARY_COLUMNS.map((column) => <th scope="col" key={column}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {INFORMATION_BOUNDARY.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {row.values.map((on, index) => (
                    <td key={BOUNDARY_COLUMNS[index]}>
                      <span className={`boundary-mark ${on ? 'is-on' : ''}`}>
                        <i/>
                        <span className="sr-only">{on ? 'Retained' : 'Omitted'}</span>
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CartographView({ overviewTick = 0 }) {
  enforceSectionalLogic('pages.cartograph', 'page');
  enforceSectionalLogic('pages.cartograph.sections.overview', 'section');
  const [displayedLayer, setDisplayedLayer] = useState('overview');
  const layerRef = useRef(null);
  const learnRef = useRef(null);
  const boundaryRef = useRef(null);
  const backRef = useRef(null);
  const openerRef = useRef('learn');
  const transitionRef = useRef(null);
  const transitionId = useRef(0);
  const skipEntrance = useRef(true);
  const hasLayered = useRef(false);
  const moveFocus = useRef(false);
  const showLayerRef = useRef(() => {});

  const showLayer = (next, { focus = false, opener } = {}) => {
    if (next === displayedLayer) return;
    hasLayered.current = true;
    moveFocus.current = focus;
    if (opener) openerRef.current = opener;
    const id = transitionId.current + 1;
    transitionId.current = id;
    transitionRef.current?.kill();
    const outgoing = layerRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !outgoing) {
      setDisplayedLayer(next);
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    transitionRef.current = gsap.timeline({
      defaults: { ease: 'power1.out', overwrite: 'auto' },
      onComplete: () => {
        if (transitionId.current !== id) return;
        transitionRef.current = null;
        setDisplayedLayer(next);
        window.scrollTo({ top: 0, behavior: 'auto' });
      },
    }).to(outgoing, { opacity: 0, y: -8, duration: 0.18 });
  };

  showLayerRef.current = showLayer;

  useLayoutEffect(() => {
    const root = layerRef.current;
    if (!root) return undefined;
    if (skipEntrance.current) {
      skipEntrance.current = false;
      return undefined;
    }

    const context = gsap.context(() => {
      if (reducedMotion()) {
        gsap.set(root, { clearProps: 'opacity,transform' });
        return;
      }
      gsap.fromTo(root, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: DUR.slow, ease: EASE.out });
    }, root);

    return () => context.revert();
  }, [displayedLayer]);

  useEffect(() => {
    if (overviewTick === 0) return;
    showLayerRef.current('overview');
  }, [overviewTick]);

  useEffect(() => {
    if (displayedLayer === 'overview') return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') showLayerRef.current('overview', { focus: true });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [displayedLayer]);

  useEffect(() => {
    if (!hasLayered.current || !moveFocus.current) return;
    if (displayedLayer === 'overview') {
      (openerRef.current === 'boundary' ? boundaryRef : learnRef).current?.focus();
    } else {
      backRef.current?.focus();
    }
  }, [displayedLayer]);

  useEffect(() => () => transitionRef.current?.kill(), []);

  return (
    <ViewFrame
      id="cartograph"
      logic="pages.cartograph"
      className={displayedLayer === 'overview' ? 'cartograph-view' : 'cartograph-design-view'}
      rootRef={layerRef}
    >
      {displayedLayer === 'overview' ? (
        <div className="two-column">
          <ResearchCopy
            id="cartograph"
            logic="pages.cartograph.sections.overview"
            title="Cartograph"
            action={(
              <div className="hero-actions cartograph-actions">
                <button
                  ref={learnRef}
                  className="primary-pill"
                  onClick={(event) => showLayer('design', { focus: event.detail === 0, opener: 'learn' })}
                  aria-label="Learn about Cartograph projection design"
                >
                  Learn about design <span aria-hidden="true">→</span>
                </button>
                <button
                  ref={boundaryRef}
                  className="secondary-action"
                  onClick={(event) => showLayer('boundary', { focus: event.detail === 0, opener: 'boundary' })}
                  aria-label="View Cartograph information boundary"
                >
                  Information boundary
                </button>
              </div>
            )}
          >
            <p>Cartograph parses TypeScript, JavaScript, Python, Go, and Rust with Tree-sitter into a canonical representation of modules, symbols, locations, and typed relationships.</p>
            <p>The IR generates three outputs: architecture, skeleton, and call graph.</p>
          </ResearchCopy>
          <CartographFigure/>
        </div>
      ) : displayedLayer === 'design' ? (
        <CartographDesignLayer onBack={(event) => showLayer('overview', { focus: event.detail === 0 })} backRef={backRef}/>
      ) : (
        <CartographBoundaryLayer onBack={(event) => showLayer('overview', { focus: event.detail === 0 })} backRef={backRef}/>
      )}
    </ViewFrame>
  );
}

// The canonical four, in the order the harness enumerates them.
const CONDITIONS = ['Baseline', 'Architecture', 'Skeleton', 'Call graph'];
const BENCHMARK_ARTIFACTS = ['architecture.md', 'skeleton.md', 'callgraph.md'];

// Four conditions, four identical containers, one comparison. The figure exists
// to show isolation: the containers are the same object four times, and nothing
// about the infrastructure they run on is drawn.
const CONDITION_Y = [26, 66, 106, 146];

function BenchmarkFigure() {
  enforceSectionalLogic('pages.experiment.sections.hero.subsections.benchmarkSequence.components.figure', 'component');
  const ref = useRef(null);

  const build = useCallback((root, tl) => {
    const labels = qa(root, '.mf-condition');
    const cells = qa(root, '.mf-cell');
    const feeds = qa(root, '.mf-feed');
    const gears = qa(root, '.mf-gear');
    const merges = qa(root, '.mf-merge');
    const compare = q(root, '.mf-compare');

    gsap.set([...labels, ...cells, ...gears, compare], { opacity: 0 });
    gsap.set(gears, { rotation: 0, transformOrigin: 'center center' });
    gsap.set([...feeds, ...merges], { drawSVG: '0%' });

    // 1 — The four conditions.
    tl.to(labels, { opacity: 1, duration: DUR.base, stagger: 0.07 });

    // 2 — Four containers, revealed together because being identical is the
    // whole point of them.
    tl.to(cells, { opacity: 1, duration: DUR.base }, '+=0.35');

    // 3 — Each condition enters its own container, and none of them meet.
    tl.to(feeds, { drawSVG: '100%', duration: DUR.base, stagger: 0.08, ease: EASE.draw }, '+=0.25')
      .to(gears, { opacity: 1, duration: DUR.quick, stagger: 0.08 }, '-=0.3')
      .to(gears, { rotation: 360, duration: 0.8, stagger: 0.08, ease: 'none' }, '-=0.18');

    // 4 — Only now do the four runs become one comparison.
    tl.to(merges, { drawSVG: '100%', duration: DUR.slow, stagger: 0.05, ease: EASE.draw }, '+=0.4')
      .to(compare, { opacity: 1, duration: DUR.base }, '-=0.25');
  }, []);

  useSequence(ref, build, { repeat: true });

  return (
    <figure className="mf-figure mf-trials" ref={ref}>
      <figcaption className="sr-only">
        Baseline, architecture, skeleton, and call graph each run in their own identical, isolated
        trial container. The four results are only brought together at the comparison step.
      </figcaption>
      <svg viewBox="-10 -3 390 178" aria-hidden="true">
        {CONDITIONS.map((condition, index) => (
          <text className="mf-condition" key={condition} x="4" y={CONDITION_Y[index]}>{condition}</text>
        ))}
        {CONDITION_Y.map((y) => <line className="mf-feed" key={y} x1="102" y1={y} x2="146" y2={y}/>)}
        {CONDITION_Y.map((y) => <rect className="mf-cell" key={y} x="150" y={y - 15} width="64" height="30" rx="8"/>)}
        {CONDITION_Y.map((y) => (
          <g className="mf-gear" key={y} transform={`translate(182 ${y})`}>
            <circle r="6"/>
            <circle r="2"/>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line key={angle} x1="6" y1="0" x2="9" y2="0" transform={`rotate(${angle})`}/>
            ))}
          </g>
        ))}
        {CONDITION_Y.map((y) => <line className="mf-merge" key={y} x1="218" y1={y} x2="284" y2="86"/>)}
        <g className="mf-compare">
          <rect x="288" y="70" width="78" height="32" rx="8"/>
          <text x="327" y="86">Compare</text>
        </g>
      </svg>
    </figure>
  );
}

const EXPERIMENT_SECTIONS = [
  { id: 'questions', label: 'Questions' },
  { id: 'setup', label: 'Setup' },
  { id: 'artifacts', label: 'Artifacts' },
  { id: 'models-harness', label: 'Model & Harness Choice' },
];

// Grounded in the generators (createArchitectureSummary, createSkeletonDocument,
// createCallGraphDocument) and in how prepareCondition materializes each treatment.
const ARTIFACT_COMPARISON = [
  {
    id: 'architecture',
    title: 'Architecture',
    answers: 'Where does a change belong, which modules participate, and what crosses the component boundary?',
    contains: 'A bounded WHERE view of repository files and directories, structural entrypoints, resolved module dependencies, and external or unresolved packages.',
    usage: '.cartograph/architecture.md',
    detail: 'Files are grouped by top-level component, followed by directory counts, structural entrypoints, resolved file-to-file imports, external or unresolved package imports, and analysis coverage. Declaration signatures and symbol-level execution behavior are excluded. Long sections truncate with a count of what was omitted.',
  },
  {
    id: 'skeleton',
    title: 'Skeleton',
    answers: 'Which declarations exist, what are their exact signatures, and how is the component split across files?',
    contains: 'A source-ordered WHAT view of declarations, visibility, types, exact signatures, and inheritance or implementation clauses, with bodies stubbed.',
    usage: '.cartograph/skeleton.md',
    detail: 'One document, not a mirrored tree: a file index, then one fenced, language-native section per file in the same order. Imports, call relationships, and implementation bodies are excluded. The one-file condition is asserted before the trial starts, so the benchmark measures the artifact rather than path discovery.',
  },
  {
    id: 'call-graph',
    title: 'Call graph',
    answers: 'Who calls this symbol, what does it call next, and how can execution reach the behavior being changed?',
    contains: 'A searchable HOW view of bounded execution-flow paths and call-node sections with locations, direct callees, reverse callers, and unresolved or external call edges.',
    usage: '.cartograph/callgraph.md',
    detail: 'The Markdown file begins with bounded multi-symbol paths, then one grep-friendly section per call node keyed by path#qualifiedName. Each node lists its source location, resolved callees in lexical order, deterministic reverse callers, and static boundary evidence. Declaration kinds, signatures, and construction-only relationships are excluded.',
  },
];

const ARTIFACT_FIELDS = [
  { key: 'answers', label: 'Helps the agent answer' },
  { key: 'contains', label: 'What the agent receives' },
  { key: 'usage', label: 'Reaches the agent as' },
  { key: 'example', label: 'High-level form' },
];

function ArtifactExample({ artifact }) {
  enforceSectionalLogic('pages.experiment.sections.artifacts.subsections.comparison.components.examples', 'component');
  if (artifact.id === 'architecture') {
    return (
      <div className="artifact-example" role="img" aria-label="High-level architecture.md output: repository structure, entrypoints, and module dependencies">
        <div className="artifact-preview-file"><span>.cartograph/architecture.md</span></div>
        <div className="artifact-outline" aria-hidden="true">
          <section className="artifact-outline-section">
            <strong>Structure</strong>
            <code>src/workers/</code>
            <code>src/storage/</code>
          </section>
          <section className="artifact-outline-section">
            <strong>Entrypoints</strong>
            <code>src/workers/worker-manager.ts</code>
          </section>
          <section className="artifact-outline-section">
            <strong>Dependencies</strong>
            <code>worker-manager.ts → candidate-store.ts</code>
          </section>
        </div>
      </div>
    );
  }

  if (artifact.id === 'skeleton') {
    return (
      <div className="artifact-example" role="img" aria-label="High-level skeleton.md output: each file with its declarations, bodies omitted">
        <div className="artifact-preview-file"><span>.cartograph/skeleton.md</span></div>
        <div className="artifact-outline" aria-hidden="true">
          <section className="artifact-outline-section">
            <strong>src/workers/worker-manager.ts</strong>
            <code>class WorkerManager {'{ }'}</code>
            <code>process(job) {'{ }'}</code>
          </section>
          <section className="artifact-outline-section">
            <strong>src/storage/candidate-store.ts</strong>
            <code>find(id) {'{ }'}</code>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="artifact-example" role="img" aria-label="High-level callgraph.md output: execution flow from one function to the next">
      <div className="artifact-preview-file"><span>.cartograph/callgraph.md</span></div>
      <div className="callgraph-outline" aria-hidden="true">
        <section className="callgraph-outline-section"><code>WorkerManager.process</code></section>
        <i className="callgraph-flow-arrow"/>
        <section className="callgraph-outline-section"><code>CandidateStore.find</code></section>
        <i className="callgraph-flow-arrow"/>
        <section className="callgraph-outline-section"><code>Index.lookup</code></section>
      </div>
    </div>
  );
}

function ArtifactComparison() {
  enforceSectionalLogic('pages.experiment.sections.artifacts.subsections.comparison.components.matrix', 'component');
  return (
    <div className="artifact-compare" role="table" aria-label="Artifact comparison">
      <div className="artifact-matrix-scroll">
        <div className="artifact-matrix">
          <div className="artifact-matrix-header" role="row">
            <span role="columnheader" className="artifact-matrix-corner"><span className="sr-only">Dimension</span></span>
            {ARTIFACT_COMPARISON.map((artifact) => <h3 role="columnheader" key={artifact.id}>{artifact.title}</h3>)}
          </div>
          {ARTIFACT_FIELDS.map((field) => (
            <section className={`artifact-matrix-row ${field.key === 'example' ? 'artifact-example-row' : ''}`} role="row" key={field.key}>
              <h4 role="rowheader">{field.label}</h4>
              {ARTIFACT_COMPARISON.map((artifact) => (
                <div role="cell" key={artifact.id}>
                  <span className="artifact-mobile-title">{artifact.title}</span>
                  {field.key === 'example'
                    ? <ArtifactExample artifact={artifact}/>
                    : field.key === 'usage'
                      ? <code className="artifact-delivery">{artifact[field.key]}</code>
                      : artifact[field.key]}
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
      <TechnicalDetails logic="pages.experiment.sections.artifacts" label="Exact artifact contents">
        <dl className="reproduction-list">
          {ARTIFACT_COMPARISON.map((artifact) => (
            <div key={artifact.id}><dt>{artifact.title}</dt><dd>{artifact.detail}</dd></div>
          ))}
          <div>
            <dt>Relative size</dt>
            <dd>
              Averaged over the 30 benchmark repositories, the generated document ran about
              7,900 tokens for architecture, 87,100 for skeleton, and 119,200 for the call
              graph. The ratio moves with repository size — architecture sections are capped,
              while skeleton and call graph grow with the source — so treat it as a range,
              not a constant.
            </dd>
          </div>
        </dl>
      </TechnicalDetails>
    </div>
  );
}

function TechnicalDetails({ logic, label, children }) {
  enforceSectionalLogic('sharedComponents.technicalDetails', 'component');
  enforceSectionalLogic(logic, 'section');
  return (
    <details className="technical-details">
      <summary>{label}<span aria-hidden="true">+</span></summary>
      <div className="technical-details-body">{children}</div>
    </details>
  );
}

function ExperimentSection({ id, logic, title, statement, children, visual, details, wide = false }) {
  enforceSectionalLogic(logic, 'section');
  return (
    <section className={`experiment-section ${wide ? 'experiment-section-wide' : 'two-column'}`} id={id} aria-labelledby={`${id}-title`}>
      <div className="experiment-section-copy">
        <h2 id={`${id}-title`}>{title}</h2>
        <div className="copy-body">
          {statement && <p>{statement}</p>}
          {children}
        </div>
        {details}
      </div>
      {visual}
    </section>
  );
}

const RESEARCH_QUESTIONS = [
  { id: 'RQ1', question: 'Does access to deterministic structural artifacts improve coding-task completion?' },
  { id: 'RQ2', question: 'How does access affect token usage and completion time?' },
  { id: 'RQ3', question: 'How does access affect repository navigation and agent trajectories?' },
  { id: 'RQ4', question: 'Does carrying an artifact create context-management costs that offset its navigation benefits?' },
];

// --- Setup ----------------------------------------------------------------
// Four small compositions, one per thing the setup has to establish. Each is
// deliberately built so that the part that must not change is the part that
// never moves.

const TREATMENTS = ['None', 'Architecture', 'Skeleton', 'Call graph'];

// 4 — Conditions. The task and the harness are drawn once and are then never
// touched again; the only tween in the figure is inside the slot.
function ConditionsFigure() {
  enforceSectionalLogic('pages.experiment.sections.setup.subsections.environment.components.conditionCycle', 'component');
  const ref = useRef(null);

  const build = useCallback((root, tl) => {
    const fixed = qa(root, '.mf-fixed');
    const slot = q(root, '.mf-slot');
    const filled = q(root, '.mf-fixture');
    const treatment = q(root, '.mf-treatment');

    gsap.set([...fixed, slot], { opacity: 0 });
    gsap.set(filled, { opacity: 0 });
    gsap.set(treatment, { opacity: 0, textContent: TREATMENTS[0] });

    tl.to(fixed, { opacity: 1, duration: DUR.base, stagger: 0.08 })
      .to(slot, { opacity: 1, duration: DUR.base }, '+=0.15')
      .to(treatment, { opacity: 1, duration: DUR.quick }, '-=0.14');

    TREATMENTS.slice(1).forEach((label, index) => {
      tl.to(treatment, { opacity: 0, duration: DUR.quick }, '+=0.7')
        .set(treatment, { textContent: label })
        .to(treatment, { opacity: 1, duration: DUR.base });
      // The slot stops being an empty outline the moment it holds something.
      if (index === 0) tl.to(filled, { opacity: 1, duration: DUR.base }, '<');
    });
  }, []);

  useSequence(ref, build, { repeat: true });

  return (
    <figure className="mf-figure mf-conditions" ref={ref}>
      <figcaption className="sr-only">
        The task and the harness are held fixed. Only the representation in the remaining slot
        changes, cycling through none, architecture, skeleton, and call graph.
      </figcaption>
      <svg viewBox="24 38 312 56" aria-hidden="true">
        <g className="mf-fixed"><rect x="38" y="52" width="60" height="28" rx="8"/><text x="68" y="66">Task</text></g>
        <g className="mf-fixed"><rect x="110" y="52" width="76" height="28" rx="8"/><text x="148" y="66">Harness</text></g>
        <rect className="mf-slot" x="200" y="52" width="122" height="28" rx="8"/>
        <rect className="mf-fixture" x="200" y="52" width="122" height="28" rx="8"/>
        <text className="mf-treatment" x="261" y="66">None</text>
      </svg>
    </figure>
  );
}

const TRIAL_Y = [26, 70, 114];

// 5 — Trials. Three identical Modal sandboxes move from empty to verified,
// then the complete figure pauses before replaying.
function TrialsFigure() {
  enforceSectionalLogic('pages.experiment.sections.setup.subsections.trials.components.runtime', 'component');
  const ref = useRef(null);

  const build = useCallback((root, tl) => {
    const origin = q(root, '.mf-origin');
    const fans = qa(root, '.mf-fan');
    const cells = qa(root, '.mf-cell');
    const modalMarks = qa(root, '.mf-modal-mark');
    const checks = qa(root, '.mf-check');

    gsap.set([origin, ...cells, ...modalMarks], { opacity: 0 });
    gsap.set([...fans, ...checks], { drawSVG: '0%' });

    tl.to(origin, { opacity: 1, duration: DUR.base })
      .to(fans, { drawSVG: '100%', duration: DUR.base, stagger: 0.07, ease: EASE.draw }, '+=0.2')
      .to(cells, { opacity: 1, duration: DUR.base, stagger: 0.07 }, '-=0.26')
      .to(modalMarks, { opacity: 1, duration: DUR.quick, stagger: 0.07 }, '-=0.24');

    // Each cell runs, then verifies, then hands over to the next. A cell that
    // is running deepens slightly without acquiring extra chrome.
    cells.forEach((cell, index) => {
      tl.to(cell, { fill: '#e8e8e8', duration: DUR.quick }, index === 0 ? '+=0.35' : '+=0.1')
        .to(checks[index], { drawSVG: '100%', duration: DUR.base, ease: EASE.draw }, '+=0.3')
        .to(cell, { fill: '#f5f5f5', duration: DUR.base });
    });
  }, []);

  useSequence(ref, build, { repeat: true });

  return (
    <figure className="mf-figure mf-trial-cells" ref={ref}>
      <figcaption className="sr-only">
        One condition is repeated in three identical isolated Modal sandboxes. Each run is verified.
      </figcaption>
      <svg viewBox="-4 0 284 140" aria-hidden="true">
        <g className="mf-origin"><rect x="10" y="56" width="82" height="28" rx="8"/><text x="51" y="70">Condition</text></g>
        {TRIAL_Y.map((y) => <line className="mf-fan" key={y} x1="96" y1="70" x2="148" y2={y}/>)}
        {TRIAL_Y.map((y) => <rect className="mf-cell" key={y} x="154" y={y - 14} width="112" height="28" rx="8"/>)}
        {TRIAL_Y.map((y) => <ModalMark key={`modal-${y}`} x="166" y={y - 5} width="20"/>)}
        {TRIAL_Y.map((y) => <path className="mf-check" key={y} d={`M231 ${y} l5 5 l9 -10`}/>)}
      </svg>
    </figure>
  );
}

const RECORD_FIELDS = ['Outcome', 'Trajectory', 'Usage', 'Runtime'];

// 6 — Outputs. One complete trial fans out to the four retained evidence nodes.
function RecordFigure() {
  enforceSectionalLogic('pages.experiment.sections.setup.subsections.outputs.components.evidenceChart', 'component');
  const ref = useRef(null);

  const build = useCallback((root, tl) => {
    const trial = q(root, '.mf-record-origin');
    const edges = qa(root, '.mf-record-edge');
    const nodes = qa(root, '.mf-record-node');

    gsap.set([trial, ...nodes], { opacity: 0 });
    gsap.set(edges, { drawSVG: '0%' });
    tl.to(trial, { opacity: 1, duration: DUR.base })
      .to(edges, { drawSVG: '100%', duration: DUR.base, stagger: 0.1, ease: EASE.draw }, '+=0.2')
      .to(nodes, { opacity: 1, duration: DUR.base, stagger: 0.1 }, '-=0.3');
  }, []);

  useSequence(ref, build, { repeat: true });

  return (
    <figure className="mf-figure mf-record" ref={ref}>
      <figcaption className="sr-only">
        Every trial is kept as one record: its outcome, its complete trajectory, its usage, and its
        runtime.
      </figcaption>
      <svg viewBox="0 0 292 152" aria-hidden="true">
        <g className="mf-record-origin"><rect x="14" y="62" width="72" height="28" rx="8"/><text x="50" y="76">Trial</text></g>
        {RECORD_FIELDS.map((field, index) => (
          <React.Fragment key={field}>
            <path className="mf-record-edge" d={`M90 76 L144 ${25 + index * 34}`}/>
            <g className="mf-record-node">
              <rect x="150" y={11 + index * 34} width="128" height="28" rx="8"/>
              <text x="214" y={25 + index * 34}>{field}</text>
            </g>
          </React.Fragment>
        ))}
      </svg>
    </figure>
  );
}

function ResearchQuestions() {
  enforceSectionalLogic('pages.experiment.sections.questions.subsections.researchQuestions.components.questionList', 'component');
  return (
    <ul className="research-questions" aria-label="Research questions">
      {RESEARCH_QUESTIONS.map((item) => <li className="research-question" key={item.id}>{item.question}</li>)}
    </ul>
  );
}

const SETUP_STEPS = [
  { key: 'environment', figure: <ConditionsFigure/>, copy: 'The task, the repository commit, the Pi harness, and the limits are identical in every condition. Only the representation the agent is given changes.' },
  { key: 'trials', figure: <TrialsFigure/>, copy: 'Each task–condition pair runs three times in fully isolated environments, so a single unlucky run cannot decide the result.' },
  { key: 'outputs', figure: <RecordFigure/>, copy: 'Each trial is retained whole: whether it passed, the complete agent trajectory, token usage, and wall-clock runtime.' },
];

function SetupSteps() {
  return (
    <div className="setup-steps">
      {SETUP_STEPS.map((step) => {
        enforceSectionalLogic(`pages.experiment.sections.setup.subsections.${step.key}`, 'subsection');
        return (
          <section className="setup-step" key={step.key}>
            <p>{step.copy}</p>
            {step.figure}
          </section>
        );
      })}
    </div>
  );
}

// The single model configuration used for every measured run.
const EXPERIMENT_MODELS = [
  { short: 'GPT-5.6 Luna', role: 'max effort', tier: 'evaluated' },
];

const MODEL_Y = [100];

// 8 — Model → Agent ⇄ Environment, drawn as the loop it is. The turn is the
// circle itself: the top half is the action going out, the bottom half the
// observation coming back. Nothing orbits, and changing model only moves the
// mark from one row to the next.
function ModelsHarnessFigure() {
  enforceSectionalLogic('pages.experiment.sections.modelsHarness.subsections.evaluationChoice.components.modelHarnessLoop', 'component');
  const ref = useRef(null);

  const build = useCallback((root, tl) => {
    const models = qa(root, '.mf-model');
    const marker = q(root, '.mf-marker');
    const feed = q(root, '.mf-feed');
    const agent = q(root, '.mf-agent');
    const environment = q(root, '.mf-environment');
    const action = q(root, '.mf-action');
    const actionLabel = q(root, '.mf-action-label');
    const actionHead = q(root, '.mf-action-head');
    const observation = q(root, '.mf-observation');
    const observationLabel = q(root, '.mf-observation-label');
    const observationHead = q(root, '.mf-observation-head');

    gsap.set([...models, marker, agent, environment, actionLabel, observationLabel, actionHead, observationHead], { opacity: 0 });
    gsap.set([feed, action, observation], { drawSVG: '0%' });
    gsap.set(marker, { y: 0 });

    // 1 — The evaluated model driving the harness.
    tl.to(models, { opacity: 1, duration: DUR.base, stagger: 0.07 })
      .to(marker, { opacity: 1, duration: DUR.quick }, '-=0.2');

    // 2 — The harness it drives.
    tl.to(feed, { drawSVG: '100%', duration: DUR.base, ease: EASE.draw }, '+=0.25')
      .to(agent, { opacity: 1, duration: DUR.base }, '-=0.14')
      .to(environment, { opacity: 1, duration: DUR.base }, '+=0.2');

    // 3 — One turn around the loop: out, then back.
    tl.to(action, { drawSVG: '100%', duration: DUR.slow, ease: EASE.draw }, '+=0.3')
      .to([actionHead, actionLabel], { opacity: 1, duration: DUR.quick }, '-=0.3')
      .to(observation, { drawSVG: '100%', duration: DUR.slow, ease: EASE.draw }, '+=0.3')
      .to([observationHead, observationLabel], { opacity: 1, duration: DUR.quick }, '-=0.3');

  }, []);

  useSequence(ref, build, { repeat: true });

  return (
    <figure className="mf-figure mf-harness" ref={ref}>
      <figcaption className="sr-only">
        GPT-5.6 Luna drives the same fixed Pi harness in every run: the agent takes an action in the
        environment and receives an observation back.
      </figcaption>
      <svg viewBox="-12 1 440 200" aria-hidden="true">
        <rect className="mf-marker" x="2" y={MODEL_Y[0] - 11} width="126" height="22" rx="6"/>
        {EXPERIMENT_MODELS.map((model, index) => (
          <text className="mf-model" key={model.short} x="12" y={MODEL_Y[index]}>{model.short}</text>
        ))}
        <line className="mf-feed" x1="138" y1="100" x2="207" y2="100"/>

        {/* The loop: one circle, split into the half that goes out and the half
            that comes back. Both halves start and end at the two states. */}
        <path className="mf-action" d="M244 100 A62 62 0 0 1 368 100"/>
        <path className="mf-action-head" d="M301 33 L306 38 L301 43"/>
        <text className="mf-action-label" x="306" y="20">action</text>
        <path className="mf-observation" d="M368 100 A62 62 0 0 1 244 100"/>
        <path className="mf-observation-head" d="M311 157 L306 162 L311 167"/>
        <text className="mf-observation-label" x="306" y="182">observation</text>

        <g className="mf-agent"><rect x="213" y="86" width="62" height="28" rx="8"/><text x="244" y="100">Agent</text></g>
        <g className="mf-environment"><rect x="322" y="86" width="92" height="28" rx="8"/><text x="368" y="100">Environment</text></g>
      </svg>
    </figure>
  );
}

function ExperimentView() {
  enforceSectionalLogic('pages.experiment.sections.hero', 'section');
  const [activeSection, setActiveSection] = useState('questions');

  useEffect(() => {
    const sections = EXPERIMENT_SECTIONS.map(({ id }) => document.getElementById(id)).filter(Boolean);
    const updateActiveSection = () => {
      const position = window.scrollY + 190;
      const current = [...sections].reverse().find((section) => section.offsetTop <= position);
      setActiveSection(current?.id || 'questions');
    };
    updateActiveSection();
    window.addEventListener('scroll', updateActiveSection, { passive: true });
    window.addEventListener('resize', updateActiveSection);
    return () => {
      window.removeEventListener('scroll', updateActiveSection);
      window.removeEventListener('resize', updateActiveSection);
    };
  }, []);

  const goToSection = (event, id) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <ViewFrame id="experiment" logic="pages.experiment" className="experiment-view">
      <div className="experiment-hero two-column">
        <ResearchCopy id="experiment" logic="pages.experiment.sections.hero" title="Experiment" statement="Do structural representations change how coding agents understand and work through repositories?">
          <p>One Cartograph artifact defines each condition. All four run repeatedly under fixed controls and are evaluated through outcomes and complete agent traces.</p>
        </ResearchCopy>
        <BenchmarkFigure/>
      </div>

      <nav className="experiment-local-nav" aria-label="Experiment sections">
        <div>
          {EXPERIMENT_SECTIONS.map((section) => <a key={section.id} href={`#${section.id}`} className={activeSection === section.id ? 'active' : ''} aria-current={activeSection === section.id ? 'location' : undefined} onClick={(event) => goToSection(event, section.id)}>{section.label}</a>)}
        </div>
      </nav>

      <div className="experiment-story">
        <ExperimentSection
          id="questions"
          logic="pages.experiment.sections.questions"
          title="Questions"
          visual={<ResearchQuestions/>}
        />

        <ExperimentSection
          id="setup"
          logic="pages.experiment.sections.setup"
          title="Setup"
          statement="Every task is repeated under four conditions. The task, repository commit, full source tree, Pi harness, and limits stay fixed."
          visual={<SetupSteps/>}
          wide
          details={<TechnicalDetails logic="pages.experiment.sections.setup" label="Condition specification"><p><strong>Baseline:</strong> the repository as it is, with no generated artifact.</p><p><strong>Architecture:</strong> adds <code>.cartograph/architecture.md</code>.</p><p><strong>Skeleton:</strong> adds <code>.cartograph/skeleton.md</code>.</p><p><strong>Call graph:</strong> adds <code>.cartograph/callgraph.md</code>.</p><p>The harness asserts exactly one generated Markdown file before every treated trial.</p><p>{COMBINATION_RATIONALE}</p><p>Task, repository commit, model, Pi harness, prompt and tools, limits, environment, repetition count, ordering, and randomization are frozen before execution.</p></TechnicalDetails>}
        >
          <p>Every condition keeps the complete real source tree. Only the generated artifact varies, and three isolated trials are run per task per condition. The artifact is named by path in the system prompt, so the agent still has to discover and open it.</p>
        </ExperimentSection>

        <ExperimentSection
          id="artifacts"
          logic="pages.experiment.sections.artifacts"
          title="Artifacts"
          visual={<ArtifactComparison/>}
          wide
        >
          <p>Architecture maps repository structure and module dependencies, skeleton exposes declarations, and call graph traces static execution relationships. Each is added to the same complete source tree.</p>
        </ExperimentSection>

        <ExperimentSection
          id="models-harness"
          logic="pages.experiment.sections.modelsHarness"
          title="Model & Harness Choice"
          statement="Every measured run uses GPT-5.6 Luna at max effort with the same fixed Pi harness."
          visual={<ModelsHarnessFigure/>}
          details={<TechnicalDetails logic="pages.experiment.sections.modelsHarness" label="Reproduction details"><dl className="reproduction-list"><div><dt>Model</dt><dd>GPT-5.6 Luna at max effort, used for every measured run.</dd></div><div><dt>Harness</dt><dd>Pi 0.84.1 through OpenRouter, fixed across every condition; fresh process, no session resume, ambient context disabled.</dd></div><div><dt>Run policy</dt><dd>3 repetitions across the 4-condition matrix with identical tools, prompt suffix, limits, and randomization.</dd></div><div><dt>Timeout</dt><dd>5,400 seconds unless the task environment sets a lower limit.</dd></div><div><dt>Backends</dt><dd>Docker by default; Modal uses a fresh no-network task image when enabled, with placement and concurrency recorded.</dd></div><div><dt>Provenance</dt><dd>Prompt and config hashes, repository commit, image, model metadata, complete JSONL, and normalized trajectory.</dd></div></dl></TechnicalDetails>}
        >
          <p><strong>GPT-5.6 Luna</strong> at max effort is the only model configuration used in the study. Every run uses the same Pi harness, tools, prompt, and limits.</p>
        </ExperimentSection>
      </div>
    </ViewFrame>
  );
}

const ORDERED_EXPERIMENT_RESULTS = CONDITION_SUMMARY;

const mean = (values) => values.reduce((total, value) => total + value, 0) / values.length;
const formatDuration = (ms) => {
  const minutes = Math.round(ms / 60000);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
};
const formatTokens = (value) => `${(value / 1e6).toFixed(1)}M`;

// One observation per task per condition: the mean of that cell's three
// repetitions. Conditions keep their three-repetition structure underneath.
const EXPERIMENT_METRICS = [
  {
    id: 'score',
    label: 'Solved',
    axisLabel: 'Tasks solved by the hidden grader',
    detailLabel: 'Solve rate',
    domain: [0, 100],
    ticks: [0, 25, 50, 75, 100],
    value: (cell) => cell.score * 100,
    format: (value) => `${Math.round(value)}%`,
  },
  {
    id: 'tokens',
    label: 'Tokens',
    axisLabel: 'Mean total tokens per trial',
    detailLabel: 'Mean total tokens',
    domain: [0, 80e6],
    ticks: [0, 20e6, 40e6, 60e6, 80e6],
    value: (cell) => cell.tokens,
    format: (value) => value === 0 ? '0' : `${(value / 1e6).toFixed(0)}M`,
  },
  {
    id: 'runtime',
    label: 'Runtime',
    axisLabel: 'Mean agent runtime per trial',
    detailLabel: 'Mean agent runtime',
    domain: [0, 6000000],
    ticks: [0, 1500000, 3000000, 4500000, 6000000],
    value: (cell) => cell.runtimeMs,
    format: (value) => `${Math.round(value / 60000)}m`,
  },
  {
    id: 'cost',
    label: 'Cost',
    axisLabel: 'Modeled cost per trial',
    detailLabel: 'Modeled cost',
    domain: [0, 2.4],
    ticks: [0, .6, 1.2, 1.8, 2.4],
    value: (cell) => cell.costUsd,
    format: (value) => `$${value.toFixed(value === 0 ? 0 : 2)}`,
  },
  {
    id: 'navigation',
    label: 'Navigation',
    axisLabel: 'Unique source files opened per trial',
    detailLabel: 'Source files opened',
    domain: [0, 220],
    ticks: [0, 55, 110, 165, 220],
    value: (cell) => cell.sourceFiles,
    format: (value) => `${Math.round(value)}`,
  },
];

// Deterministic beeswarm: equal values fan out sideways instead of stacking on
// top of each other, so every task stays individually inspectable.
const SWARM_OFFSETS = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 7, -7, 8, -8];
const SWARM_STEP = 9;
const SWARM_GAP = 8.5;

function swarm(points, yForValue) {
  const placed = [];
  points
    .slice()
    .sort((a, b) => a.value - b.value)
    .forEach((point) => {
      const y = yForValue(point.value);
      const offset = SWARM_OFFSETS.find((candidate) => !placed.some((other) => other.offset === candidate && Math.abs(other.y - y) < SWARM_GAP)) ?? 0;
      placed.push({ ...point, y, offset, dx: offset * SWARM_STEP });
    });
  return placed;
}

function ObservationDetail({ observation, metric }) {
  enforceSectionalLogic('pages.results.sections.evidence.subsections.conditionChart.components.observation', 'component');
  if (!observation) {
    return null;
  }

  const { condition, task, cell } = observation;
  return (
    <aside className="observation-detail" aria-live="polite" aria-label={`${condition.label}, task ${task.id} details`}>
      <h2>{task.id}</h2>
      <p className="observation-repository">{task.repo} · {condition.label}</p>
      <dl className="observation-grid">
        <div className="observation-primary"><dt>{metric.detailLabel}</dt><dd>{metric.format(metric.value(cell))}</dd></div>
        <div><dt>Status</dt><dd>{cell.timeouts ? `${cell.timeouts} timed out` : 'Completed'}</dd></div>
        <div><dt>Solved</dt><dd>{cell.solved} / {cell.n}</dd></div>
        <div><dt>Tokens</dt><dd>{formatTokens(cell.tokens)}</dd></div>
        <div><dt>Runtime</dt><dd>{formatDuration(cell.runtimeMs)}</dd></div>
        <div><dt>Cost</dt><dd>${cell.costUsd.toFixed(2)}</dd></div>
      </dl>
    </aside>
  );
}

function ExperimentsFigure() {
  enforceSectionalLogic('pages.results.sections.evidence.subsections.conditionChart.components.chart', 'component');
  const [metricId, setMetricId] = useState('score');
  const chartRef = useRef(null);
  const flipState = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [pinned, setPinned] = useState(() => ({
    condition: ORDERED_EXPERIMENT_RESULTS[0],
    task: TASK_RESULTS[0],
    cell: TASK_RESULTS[0].by[ORDERED_EXPERIMENT_RESULTS[0].id],
  }));
  const metric = EXPERIMENT_METRICS.find((item) => item.id === metricId);

  // The chart is never built on screen; it is already complete when the page
  // arrives. Changing metric is the only motion it has, and it is a transition
  // between two finished charts rather than a redraw: the means slide to their
  // new heights while the task marks cross-fade, so the comparison the reader
  // was making is never interrupted.
  const chooseMetric = (id) => {
    if (id === metricId) return;
    const chart = chartRef.current;
    flipState.current = chart && !reducedMotion() ? Flip.getState(qa(chart, '.mean-point, .mean-value')) : null;
    setMetricId(id);
  };

  useLayoutEffect(() => {
    const chart = chartRef.current;
    if (!chart || !flipState.current) return;
    Flip.from(flipState.current, { duration: DUR.base, ease: EASE.inOut });
    gsap.fromTo(qa(chart, '.condition-marks .run-mark, .range-line'), { opacity: 0 }, { opacity: 1, duration: DUR.quick, ease: EASE.out });
    flipState.current = null;
  }, [metricId]);
  const activeObservation = hovered || pinned;
  const width = 980;
  const height = 416;
  const plot = { left: 72, right: 24, top: 28, bottom: 64 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const xForCondition = (index) => plot.left + plotWidth * ((index + .5) / ORDERED_EXPERIMENT_RESULTS.length);
  const yForValue = (value) => plot.top + plotHeight * (1 - (value - metric.domain[0]) / (metric.domain[1] - metric.domain[0]));

  const columns = useMemo(() => ORDERED_EXPERIMENT_RESULTS.map((condition) => {
    const observations = TASK_RESULTS
      .filter((task) => task.by[condition.id])
      .map((task) => ({ task, cell: task.by[condition.id], value: metric.value(task.by[condition.id]) }));
    return { condition, observations, marks: swarm(observations, yForValue), values: observations.map((item) => item.value) };
  }), [metric]);

  const observationKey = (observation) => `${observation.condition.id}-${observation.task.id}`;
  const isActive = (condition, task) => activeObservation && observationKey({ condition, task }) === observationKey(activeObservation);

  return (
    <div className="experiment-results">
      <div className="experiment-toolbar">
        <div className="metric-tabs" role="group" aria-label="Experiment metric">
          {EXPERIMENT_METRICS.map((item) => (
            <button key={item.id} className={metricId === item.id ? 'active' : ''} aria-pressed={metricId === item.id} onClick={() => chooseMetric(item.id)}>{item.label}</button>
          ))}
        </div>
        <div className="chart-key" aria-label="Chart key">
          <span><i className="key-mean"/>Mean</span>
          <span><i className="key-run"/>Task</span>
          <span><i className="key-range"/>Range</span>
        </div>
      </div>
      <div className="experiment-chart-layout">
        <section className="chart-panel" aria-labelledby="chart-title">
          <div className="chart-heading">
            <h2 id="chart-title">{metric.axisLabel}</h2>
          </div>
          <div className="experiment-chart-scroll">
            <svg className="experiment-chart" ref={chartRef} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${metric.axisLabel} by repository representation condition. Each condition shows one mark per task, averaged over three repetitions, plus the condition mean.`}>
              {metric.ticks.map((tick) => {
                const y = yForValue(tick);
                return (
                  <g className="chart-tick" key={tick}>
                    <line x1={plot.left} x2={width - plot.right} y1={y} y2={y}/>
                    <text x={plot.left - 16} y={y} textAnchor="end" dominantBaseline="central">{metric.format(tick)}</text>
                  </g>
                );
              })}
              {columns.map((column, index) => {
                const { condition } = column;
                const x = xForCondition(index);
                const meanValue = mean(column.values);
                return (
                  <g className="condition-marks" key={condition.id}>
                    <line className="range-line" x1={x} x2={x} y1={yForValue(Math.max(...column.values))} y2={yForValue(Math.min(...column.values))}/>
                    {column.marks.map((markData) => {
                      const { task, cell, dx, y } = markData;
                      const pointX = x + dx;
                      const active = isActive(condition, task);
                      const observation = { condition, task, cell };
                      return (
                        <g
                          key={task.id}
                          className={`run-mark ${active ? 'active' : ''} ${cell.timeouts ? 'timeout' : 'completed'}`}
                          role="button"
                          tabIndex="0"
                          aria-label={`${condition.label}, task ${task.id}: ${metric.format(metric.value(cell))}. ${cell.solved} of ${cell.n} repetitions solved.`}
                          aria-pressed={pinned && observationKey(observation) === observationKey(pinned)}
                          onMouseEnter={() => setHovered(observation)}
                          onMouseLeave={() => setHovered(null)}
                          onFocus={() => setHovered(observation)}
                          onBlur={() => setHovered(null)}
                          onClick={() => setPinned(observation)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setPinned(observation);
                            }
                          }}
                        >
                          <circle className="run-hit-area" cx={pointX} cy={y} r="8"/>
                          <circle className="run-point" cx={pointX} cy={y} r={active ? 4.5 : 3.2}/>
                        </g>
                      );
                    })}
                    <rect className="mean-point" x={x - 4.5} y={yForValue(meanValue) - 4.5} width="9" height="9"/>
                    <text className="mean-value" x={x} y={yForValue(meanValue) - 16} textAnchor="middle">{metric.format(meanValue)}</text>
                    <text className="condition-label" x={x} y={height - 34} textAnchor="middle">{condition.label}</text>
                    <text className="condition-sublabel" x={x} y={height - 17} textAnchor="middle">{condition.solved} / {condition.trials} trials solved</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </section>
        <ObservationDetail observation={activeObservation} metric={metric}/>
      </div>
    </div>
  );
}

function ResultsView() {
  enforceSectionalLogic('pages.results.sections.evidence', 'section');
  return (
    <ViewFrame id="results" logic="pages.results" className="experiments-view">
      <div className="experiments-heading">
        <h1 id="results-title">Results</h1>
      </div>
      <ExperimentsFigure/>
    </ViewFrame>
  );
}

// The closing page is one statement beside one photograph. Splitting the same
// four intentions into labelled groups made a roadmap artifact out of a
// paragraph, so it is a paragraph.
function FutureView() {
  enforceSectionalLogic('pages.future.sections.roadmap', 'section');
  enforceSectionalLogic('pages.future.sections.roadmap.subsections.directions.components.statement', 'component');
  const ref = useRef(null);

  const build = useCallback((root, tl) => {
    const media = q(root, '.future-media');
    const copy = qa(root, '.future-copy h1, .future-copy p');

    gsap.set(media, { opacity: 0, y: 14 });
    gsap.set(copy, { opacity: 0, y: 8 });

    tl.to(media, { opacity: 1, y: 0, duration: DUR.slow, ease: EASE.out })
      .to(copy, { opacity: 1, y: 0, duration: DUR.base, stagger: 0.08 }, '-=0.3');
  }, []);

  useSequence(ref, build, { start: 'mount' });

  return (
    <ViewFrame id="future" logic="pages.future" className="future-view">
      <div className="future-layout" ref={ref}>
        <div className="future-copy">
          <h1 id="future-title">Future Work</h1>
          <p>
            Next, we want to test more models, harnesses, repositories, and kinds of tasks, with
            more runs of each. We want to learn which artifacts, relationships, and formats really
            change how agents behave, and whether handing over context up front beats letting
            agents fetch it when they need it.
          </p>
        </div>
        <figure className="future-media">
          <img src="/future-terrain.png" alt="Aerial view of wetlands crossed by a pale winding river"/>
          <figcaption className="sr-only">A route seen from above, framing the next stages of the research.</figcaption>
        </figure>
      </div>
    </ViewFrame>
  );
}

// Rubric Labs helped with this work. The credit sits at the quiet edge of the
// shell so it is present on every page without competing with the research.
function SiteCredit() {
  enforceSectionalLogic('sharedComponents.siteCredit', 'component');
  return (
    <a className="site-credit" href="https://rubriclabs.com" target="_blank" rel="noreferrer">
      <span>With support from</span>
      <img className="site-credit-wordmark" src="/rubric-wordmark.svg" alt="Rubric Labs"/>
    </a>
  );
}

function App() {
  enforceSectionalLogic('sharedComponents.appShell', 'component');
  const initialView = useMemo(() => {
    const hash = window.location.hash.slice(1).split('/')[0];
    const aliases = { benchmark: 'experiment', experiments: 'results' };
    const normalized = aliases[hash] || hash;
    return VALID_VIEWS.includes(normalized) ? normalized : 'mapbench';
  }, []);
  const [active, setActive] = useState(initialView);
  const [displayed, setDisplayed] = useState(initialView);
  const [cartographTick, setCartographTick] = useState(0);
  const activeRef = useRef(initialView);
  const viewportRef = useRef(null);
  const transitionRef = useRef(null);
  const transitionId = useRef(0);

  usePageEntrance(viewportRef, displayed);

  const transitionTo = (view) => {
    const id = transitionId.current + 1;
    transitionId.current = id;
    transitionRef.current?.kill();
    const outgoing = viewportRef.current?.querySelector('.view');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !outgoing) {
      setDisplayed(view);
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    transitionRef.current = gsap.timeline({
      defaults: { ease: 'power1.out', overwrite: 'auto' },
      onComplete: () => {
        if (transitionId.current !== id) return;
        transitionRef.current = null;
        setDisplayed(view);
        window.scrollTo({ top: 0, behavior: 'auto' });
      },
    }).to(outgoing, { opacity: 0, y: -8, duration: 0.18 });
  };

  const navigate = (view) => {
    if (view === activeRef.current) {
      if (view === 'cartograph') setCartographTick((tick) => tick + 1);
      return;
    }
    activeRef.current = view;
    window.history.pushState(null, '', `#${view}`);
    setActive(view);
    transitionTo(view);
  };

  // The landing is one fixed screen; every other view scrolls normally.
  useEffect(() => {
    document.body.classList.toggle('landing-locked', displayed === 'mapbench');
    return () => document.body.classList.remove('landing-locked');
  }, [displayed]);

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', '#mapbench');
    const onHistory = () => {
      const hash = window.location.hash.slice(1).split('/')[0];
      const aliases = { benchmark: 'experiment', experiments: 'results' };
      const next = aliases[hash] || hash;
      if (!VALID_VIEWS.includes(next) || next === activeRef.current) return;
      activeRef.current = next;
      setActive(next);
      transitionTo(next);
    };
    window.addEventListener('popstate', onHistory);
    window.addEventListener('hashchange', onHistory);
    return () => {
      window.removeEventListener('popstate', onHistory);
      window.removeEventListener('hashchange', onHistory);
      transitionRef.current?.kill();
    };
  }, []);

  return (
    <div className="app-shell">
      <Header active={active} onNavigate={navigate}/>
      <main className="view-port" ref={viewportRef}>
        {displayed === 'mapbench' && <MapBenchView onNavigate={navigate}/>}
        {displayed === 'cartograph' && <CartographView overviewTick={cartographTick}/>}
        {displayed === 'experiment' && <ExperimentView/>}
        {displayed === 'results' && <ResultsView/>}
        {displayed === 'future' && <FutureView/>}
      </main>
      {displayed === 'mapbench' && <SiteCredit/>}
    </div>
  );
}

const appRoot = globalThis.__mapbenchRoot || createRoot(document.getElementById('root'));
globalThis.__mapbenchRoot = appRoot;
appRoot.render(<App/>);
