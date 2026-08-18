import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import dagre from '@dagrejs/dagre';
import { gsap } from 'gsap';
import './styles.css';

const GITHUB_URL = 'https://github.com/michaelzoub/MapBench';
const VIEWS = [
  { id: 'mapbench', label: 'MapBench' },
  { id: 'cartograph', label: 'Cartograph' },
  { id: 'benchmark', label: 'Benchmark' },
  { id: 'experiments', label: 'Experiments' },
];

const q = (root, selector) => root.querySelector(selector);
const qa = (root, selector) => [...root.querySelectorAll(selector)];

function point(root, element, anchor = 'center') {
  const base = root.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  const x = anchor === 'left' ? rect.left : anchor === 'right' ? rect.right : rect.left + rect.width / 2;
  return { x: x - base.left, y: rect.top + rect.height / 2 - base.top };
}

function place(token, target) {
  return { x: target.x - token.offsetWidth / 2, y: target.y - token.offsetHeight / 2 };
}

function useCausalTimeline(ref, buildTimeline) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let context;
    let frame;
    let lastSize = '';
    const build = () => {
      const size = `${Math.round(root.clientWidth)}:${Math.round(root.clientHeight)}`;
      if (size === lastSize && context) return;
      lastSize = size;
      context?.revert();
      context = gsap.context(() => buildTimeline(root), root);
    };
    build();

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(build);
    });
    observer.observe(root);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      context?.revert();
    };
  }, [buildTimeline, ref]);
}

function Mark() {
  return <span className="brand-symbol" aria-hidden="true"><b/><i/><i/></span>;
}

function createGraphLayout({ nodes, edges, width, height, rankdir = 'LR', ranksep = 32, nodesep = 24 }) {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir, ranksep, nodesep, marginx: 8, marginy: 8 });
  graph.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((node) => graph.setNode(node.id, {
    width: node.width || (node.radius ? node.radius * 2 : 12),
    height: node.height || (node.radius ? node.radius * 2 : 12),
  }));
  edges.forEach(([source, target]) => graph.setEdge(source, target));
  dagre.layout(graph);

  const graphBounds = graph.graph();
  const scale = Math.min(1, width / graphBounds.width, height / graphBounds.height);
  const offsetX = (width - graphBounds.width * scale) / 2;
  const offsetY = (height - graphBounds.height * scale) / 2;
  const transformPoint = ({ x, y }) => ({ x: x * scale + offsetX, y: y * scale + offsetY });

  return {
    width,
    height,
    nodes: nodes.map((node) => ({ ...node, ...transformPoint(graph.node(node.id)), scale })),
    edges: graph.edges().map((edge, index) => ({
      id: `${edge.v}-${edge.w}-${index}`,
      source: edge.v,
      target: edge.w,
      points: graph.edge(edge).points.map(transformPoint),
    })),
  };
}

function RoutedGraph({ className, nodes, edges, width, height, rankdir, ranksep, nodesep, labelled = false }) {
  const layout = useMemo(
    () => createGraphLayout({ nodes, edges, width, height, rankdir, ranksep, nodesep }),
    [edges, height, nodes, nodesep, rankdir, ranksep, width],
  );

  return (
    <svg className={`routed-graph ${className}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" focusable="false">
      <g className="graph-edges">
        {layout.edges.map((edge) => (
          <path
            key={edge.id}
            className={`${className}-edge layout-edge`}
            data-edge={`${edge.source}-${edge.target}`}
            d={edge.points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')}
          />
        ))}
      </g>
      <g className="graph-nodes">
        {layout.nodes.map((node) => labelled ? (
          <g key={node.id} className={`${className}-node layout-node ${node.className || ''}`} data-node={node.id} transform={`translate(${node.x} ${node.y})`}>
            <rect x={-(node.width * node.scale) / 2} y={-(node.height * node.scale) / 2} width={node.width * node.scale} height={node.height * node.scale}/>
            <text textAnchor="middle" dominantBaseline="central">{node.label}</text>
          </g>
        ) : (
          <circle
            key={node.id}
            className={`${className}-node layout-node ${node.className || ''}`}
            data-node={node.id}
            cx={node.x}
            cy={node.y}
            r={(node.radius || 5) * node.scale}
          />
        ))}
      </g>
    </svg>
  );
}

function Header({ active, onNavigate }) {
  return (
    <header className="site-header">
      <button className="wordmark" onClick={() => onNavigate('mapbench')} aria-label="Go to MapBench introduction">
        <Mark/><span>MapBench</span>
      </button>
      <nav className="primary-nav" aria-label="Primary navigation">
        {VIEWS.map((view) => (
          <button key={view.id} className={active === view.id ? 'active' : ''} aria-current={active === view.id ? 'page' : undefined} onClick={() => onNavigate(view.id)}>
            {view.label}
          </button>
        ))}
        <a className="secondary-pill" href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub ↗</a>
      </nav>
    </header>
  );
}

function ViewFrame({ id, children, className = '' }) {
  return <section className={`view ${className}`} id={id} aria-labelledby={`${id}-title`}>{children}</section>;
}

function ResearchCopy({ id, title, statement, children, action }) {
  return (
    <div className="research-copy">
      <h1 id={`${id}-title`}>{title}</h1>
      <p className="primary-statement">{statement}</p>
      <div className="copy-body">{children}</div>
      {action}
    </div>
  );
}

const FILES = ['runner.ts', 'workspace.ts', 'verify.ts'];
const STRUCTURE_NODES = [
  { id: 'entry-a', radius: 4 },
  { id: 'entry-b', radius: 4 },
  { id: 'core', radius: 6, className: 'core' },
  { id: 'branch-a', radius: 4 },
  { id: 'branch-b', radius: 4 },
];
const STRUCTURE_EDGES = [['entry-a', 'core'], ['entry-b', 'core'], ['core', 'branch-a'], ['core', 'branch-b']];
const NAVIGATION_NODES = ['nav-a', 'nav-b', 'nav-c', 'nav-d'].map((id) => ({ id, radius: 5 }));
const NAVIGATION_EDGES = [['nav-a', 'nav-b'], ['nav-b', 'nav-c'], ['nav-c', 'nav-d']];

function MapExperimentFigure() {
  const ref = useRef(null);

  useCausalTimeline(ref, (root) => {
    const track = q(root, '.sequence-track');
    const rows = qa(root, '.repository-file');
    const structureNodes = qa(root, '.structure-node');
    const structureEdges = qa(root, '.structure-edge');
    const navNodes = qa(root, '.nav-node');
    const navEdges = qa(root, '.nav-edge');
    const sourceToken = q(root, '.source-token');
    const agentToken = q(root, '.agent-token');
    const outcome = q(root, '.verified-card');
    const structureCore = q(root, '.structure-node.core');
    const outcomePort = q(root, '.outcome-port');
    const sourceStart = point(track, q(rows[2], '.stage-port'));
    const corePoint = point(track, structureCore);
    const route = navNodes.map((node) => point(track, node));

    gsap.set(rows, { opacity: 0.38, color: '#777777' });
    gsap.set([...structureNodes, ...structureEdges, ...navEdges], { opacity: 0 });
    gsap.set(navNodes, { opacity: 0.2, fill: '#cfcfcf' });
    gsap.set([sourceToken, agentToken], { opacity: 0 });
    gsap.set(sourceToken, place(sourceToken, sourceStart));
    gsap.set(agentToken, place(agentToken, corePoint));
    gsap.set(outcome, { opacity: 0.22, backgroundColor: '#f1f1f1', color: '#777777' });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.35, defaults: { ease: 'power2.inOut' } });
    rows.forEach((row) => {
      tl.to(row, { opacity: 1, color: '#151515', x: 3, duration: 0.22 })
        .to(row, { x: 0, duration: 0.14 });
    });
    tl.set(sourceToken, { opacity: 1 })
      .to(sourceToken, { ...place(sourceToken, corePoint), duration: 0.72 })
      .set(sourceToken, { opacity: 0 })
      .to(structureNodes, { opacity: 1, duration: 0.18, stagger: 0.09 })
      .to(structureEdges, { opacity: 1, duration: 0.22, stagger: 0.08 })
      .to(navNodes, { opacity: 1, duration: 0.18, stagger: 0.07 })
      .to(navEdges, { opacity: 1, duration: 0.18, stagger: 0.08 })
      .set(agentToken, { opacity: 1 });

    route.forEach((target, index) => {
      tl.to(agentToken, { ...place(agentToken, target), duration: index === 0 ? 0.65 : 0.42 })
        .to(navNodes[index], { fill: '#151515', duration: 0.12 }, '<');
    });

    tl.to(agentToken, { ...place(agentToken, point(track, outcomePort)), duration: 0.62 })
      .set(agentToken, { opacity: 0 })
      .to(outcome, { opacity: 1, backgroundColor: '#151515', color: '#ffffff', duration: 0.28 })
      .to({}, { duration: 1.15 })
      .to(outcome, { opacity: 0.22, backgroundColor: '#f1f1f1', color: '#777777', duration: 0.2 })
      .set([...structureNodes, ...structureEdges, ...navEdges], { opacity: 0 })
      .set(navNodes, { opacity: 0.2, fill: '#cfcfcf' })
      .set(rows, { opacity: 0.38, color: '#777777' });
  });

  return (
    <figure className="research-figure sequence-figure map-sequence" ref={ref}>
      <figcaption className="sr-only">Repository source becomes structure, guides a deliberate navigation path, and lands in a verified outcome.</figcaption>
      <div className="sequence-track" aria-hidden="true">
        <section className="sequence-stage repository-stage">
          <header><span>01</span><p>Repository</p></header>
          <div className="repository-files">
            {FILES.map((file) => <span className="repository-file" key={file}><code>{file}</code><i className="ui-port stage-port"/></span>)}
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage structure-stage">
          <header><span>02</span><p>Structure</p></header>
          <div className="structure-map">
            <RoutedGraph className="structure" nodes={STRUCTURE_NODES} edges={STRUCTURE_EDGES} width={176} height={124} rankdir="LR" ranksep={38} nodesep={26}/>
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage navigation-stage">
          <header><span>03</span><p>Navigation</p></header>
          <div className="navigation-map">
            <RoutedGraph className="nav" nodes={NAVIGATION_NODES} edges={NAVIGATION_EDGES} width={176} height={124} rankdir="LR" ranksep={32} nodesep={16}/>
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage outcome-stage">
          <header><span>04</span><p>Outcome</p></header>
          <div className="verified-card"><i className="ui-port outcome-port"/><strong>Verified</strong><span>correctness</span></div>
        </section>
        <span className="motion-token source-token"><em>source</em></span>
        <span className="motion-token agent-token"><em>agent</em></span>
      </div>
    </figure>
  );
}

function MapBenchView({ onNavigate }) {
  return (
    <ViewFrame id="mapbench" className="two-column mapbench-view">
      <ResearchCopy
        id="mapbench"
        title="MapBench"
        statement="Does repository structure help coding agents work in unfamiliar codebases?"
        action={<button className="primary-pill text-action" onClick={() => onNavigate('benchmark')}>See the benchmark <span aria-hidden="true">→</span></button>}
      >
        <p>MapBench compares agent performance with and without deterministic structural views of the same source code.</p>
        <p>The model, task, commit, harness, and environment stay fixed. Only the representation changes.</p>
      </ResearchCopy>
      <MapExperimentFigure/>
    </ViewFrame>
  );
}

const SOURCE_FILES = ['runner.ts', 'parser.ts', 'workspace.ts'];
const PROJECTIONS = ['Architecture', 'Skeleton', 'Call graph', 'Mermaid'];
const IR_NODES = [
  { id: 'module', label: 'module', width: 58, height: 24 },
  { id: 'symbol', label: 'symbol', width: 58, height: 24 },
  { id: 'call', label: 'call', width: 48, height: 24, className: 'core' },
  { id: 'import', label: 'import', width: 56, height: 24 },
  { id: 'location', label: 'location', width: 66, height: 24 },
  { id: 'type', label: 'type', width: 48, height: 24 },
];
const IR_EDGES = [
  ['module', 'symbol'],
  ['module', 'location'],
  ['symbol', 'call'],
  ['symbol', 'type'],
  ['symbol', 'import'],
];

function CartographFigure() {
  const ref = useRef(null);

  useCausalTimeline(ref, (root) => {
    const track = q(root, '.sequence-track');
    const files = qa(root, '.source-file');
    const fileTokens = qa(root, '.file-token');
    const irToken = q(root, '.ir-token');
    const treeSitter = q(root, '.tree-sitter-card');
    const parserInput = q(root, '.parser-input');
    const parserOutput = q(root, '.parser-output');
    const irNodes = qa(root, '.ir-node');
    const irEdges = qa(root, '.ir-edge');
    const irEntry = q(root, '[data-node="module"]');
    const irOutput = q(root, '[data-node="import"]');
    const projections = qa(root, '.projection-row');
    const projectionTokens = qa(root, '.projection-token');
    const parserPoint = point(track, parserInput);

    gsap.set(files, { opacity: 0.38, color: '#777777' });
    gsap.set([...fileTokens, irToken], { opacity: 0 });
    gsap.set(treeSitter, { backgroundColor: '#f1f1f1', color: '#686868' });
    gsap.set([...irNodes, ...irEdges], { opacity: 0 });
    gsap.set(projections, { opacity: 0.26, backgroundColor: '#f1f1f1', color: '#777777' });
    gsap.set(projectionTokens, { opacity: 0 });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.35, defaults: { ease: 'power2.inOut' } });
    files.forEach((file, index) => {
      const start = point(track, q(file, '.stage-port'));
      gsap.set(fileTokens[index], place(fileTokens[index], start));
      tl.to(file, { opacity: 1, color: '#151515', duration: 0.18 })
        .set(fileTokens[index], { opacity: 1 })
        .to(fileTokens[index], { ...place(fileTokens[index], parserPoint), duration: 0.58 })
        .set(fileTokens[index], { opacity: 0 });
    });

    tl.to(treeSitter, { backgroundColor: '#151515', color: '#ffffff', duration: 0.24 })
      .set(irToken, { ...place(irToken, point(track, parserOutput)), opacity: 1 })
      .to(irToken, { ...place(irToken, point(track, irEntry)), duration: 0.62 })
      .set(irToken, { opacity: 0 })
      .to(irNodes, { opacity: 1, duration: 0.18, stagger: 0.09 })
      .to(irEdges, { opacity: 1, duration: 0.2, stagger: 0.08 });

    projections.forEach((projection, index) => {
      const start = point(track, irOutput);
      const end = point(track, q(projection, '.projection-port'));
      gsap.set(projectionTokens[index], place(projectionTokens[index], start));
      tl.set(projectionTokens[index], { opacity: 1 })
        .to(projectionTokens[index], { ...place(projectionTokens[index], end), duration: 0.58 })
        .set(projectionTokens[index], { opacity: 0 })
        .to(projection, { opacity: 1, backgroundColor: '#151515', color: '#ffffff', duration: 0.18 });
    });

    tl.to({}, { duration: 1.15 })
      .set(fileTokens, { opacity: 0 })
      .set(irToken, { opacity: 0 })
      .set(projectionTokens, { opacity: 0 })
      .set(files, { opacity: 0.38, color: '#777777' })
      .set(treeSitter, { backgroundColor: '#f1f1f1', color: '#686868' })
      .set([...irNodes, ...irEdges], { opacity: 0 })
      .set(projections, { opacity: 0.26, backgroundColor: '#f1f1f1', color: '#777777' });
  });

  return (
    <figure className="research-figure sequence-figure cartograph-sequence" ref={ref}>
      <figcaption className="sr-only">Files enter Tree-sitter one at a time, form a canonical intermediate representation, then activate deterministic projections.</figcaption>
      <div className="sequence-track" aria-hidden="true">
        <section className="sequence-stage source-stage">
          <header><span>01</span><p>Source files</p></header>
          <div className="source-files">
            {SOURCE_FILES.map((file) => <span className="source-file" key={file}><code>{file}</code><i className="ui-port stage-port"/></span>)}
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage parser-stage">
          <header><span>02</span><p>Parse</p></header>
          <div className="tree-sitter-card"><i className="ui-port parser-input"/><i className="ui-port parser-output"/><strong>Tree-sitter</strong><span>typed parse</span></div>
        </section>
        <i className="track-line parser-to-ir"/>
        <section className="sequence-stage ir-stage">
          <header><span>03</span><p>Canonical IR</p></header>
          <div className="canonical-ir">
            <RoutedGraph className="ir" nodes={IR_NODES} edges={IR_EDGES} width={164} height={150} rankdir="TB" ranksep={26} nodesep={20} labelled/>
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage projection-stage">
          <header><span>04</span><p>Projections</p></header>
          <div className="projection-list">
            {PROJECTIONS.map((item) => <span className="projection-row" key={item}><i className="ui-port projection-port"/>{item}</span>)}
          </div>
        </section>
        {SOURCE_FILES.map((file) => <span className="motion-token file-token" key={file}><em>file</em></span>)}
        <span className="motion-token ir-token"><em>IR</em></span>
        {PROJECTIONS.map((item) => <span className="motion-token projection-token" key={item}><em>view</em></span>)}
      </div>
    </figure>
  );
}

function CartographView() {
  return (
    <ViewFrame id="cartograph" className="two-column cartograph-view">
      <ResearchCopy id="cartograph" title="Cartograph" statement="One source of structural truth, projected many ways.">
        <p>Cartograph parses source into a canonical representation of modules, symbols, locations, and typed relationships.</p>
        <p>Architecture maps, skeletons, graph queries, and Mermaid views are deterministic projections of that shared structure.</p>
        <p className="quiet-copy">TypeScript, JavaScript, Python, Go, and Rust.</p>
      </ResearchCopy>
      <CartographFigure/>
    </ViewFrame>
  );
}

const CONDITIONS = ['Regular', 'Architecture', 'Skeleton', 'Call graph', 'All'];
function BenchmarkFigure() {
  const ref = useRef(null);

  useCausalTimeline(ref, (root) => {
    const track = q(root, '.benchmark-track');
    const conditions = qa(root, '.condition-row');
    const slots = qa(root, '.run-slot');
    const tokens = qa(root, '.condition-run-token');
    const resultToken = q(root, '.result-token');
    const verifier = q(root, '.verifier-card');
    const verifierPort = q(root, '.verifier-port');

    gsap.set(conditions, { opacity: 0.48, color: '#6f6f6f' });
    gsap.set(qa(root, '.condition-overlay'), { opacity: 0 });
    gsap.set(slots, { opacity: 0.32, backgroundColor: '#f1f1f1', color: '#777777' });
    gsap.set([...tokens, resultToken], { opacity: 0 });
    gsap.set(verifier, { opacity: 0.3, backgroundColor: '#f1f1f1', color: '#777777' });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.1, defaults: { ease: 'power2.inOut' } });
    conditions.forEach((condition) => {
      const overlay = q(condition, '.condition-overlay');
      const source = point(track, q(condition, '.condition-port'));
      tl.to(condition, { opacity: 1, color: '#ffffff', duration: 0.2 })
        .to(overlay, { opacity: 1, duration: 0.2 }, '<');

      tokens.forEach((token, index) => {
        const destination = point(track, q(slots[index], '.run-target'));
        tl.set(token, { ...place(token, source), opacity: 1 })
          .to(token, { ...place(token, destination), duration: 0.62 })
          .set(token, { opacity: 0 })
          .to(slots[index], { opacity: 1, backgroundColor: '#dedede', color: '#151515', duration: 0.16 });
      });

      tl.set(resultToken, { ...place(resultToken, point(track, q(slots[2], '.run-target'))), opacity: 1 })
        .to(resultToken, { ...place(resultToken, point(track, verifierPort)), duration: 0.68 })
        .set(resultToken, { opacity: 0 })
        .to(verifier, { opacity: 1, backgroundColor: '#151515', color: '#ffffff', duration: 0.22 })
        .to({}, { duration: 0.6 })
        .to(overlay, { opacity: 0, duration: 0.16 })
        .to(condition, { opacity: 0.48, color: '#6f6f6f', duration: 0.16 }, '<')
        .set(slots, { opacity: 0.24, backgroundColor: '#f1f1f1', color: '#777777' })
        .set(verifier, { opacity: 0.3, backgroundColor: '#f1f1f1', color: '#777777' });
    });
  });

  return (
    <figure className="research-figure benchmark-sequence" ref={ref}>
      <figcaption className="sr-only">Model, harness, task, and environment remain fixed while each representation completes runs 01, 02, and 03 in order.</figcaption>
      <div className="benchmark-track" aria-hidden="true">
        <section className="condition-list">
          <header><span>Variable</span><p>Representation</p></header>
          {CONDITIONS.map((condition) => <div className="condition-row" key={condition}><i className="condition-overlay"/><span>{condition}</span><i className="ui-port condition-port"/></div>)}
        </section>
        <i className="benchmark-line"/>
        <section className="run-bank">
          <header><span>Sequential</span><p>Runs</p></header>
          <div className="run-slots">
            {['01', '02', '03'].map((run) => <span className="run-slot" key={run}><i className="ui-dot run-target"/><b>{run}</b></span>)}
          </div>
        </section>
        <i className="benchmark-line"/>
        <section className="verify-stage">
          <header><span>Held-out</span><p>Outcome</p></header>
          <div className="verifier-card"><i className="ui-port verifier-port"/><span>Verified</span></div>
        </section>
        {['01', '02', '03'].map((run) => <span className="motion-token run-token condition-run-token" key={run}><em>{run}</em></span>)}
        <span className="motion-token run-token result-token"><em>result</em></span>
      </div>
    </figure>
  );
}

function BenchmarkView() {
  return (
    <ViewFrame id="benchmark" className="two-column benchmark-view">
      <ResearchCopy id="benchmark" title="Benchmark" statement="Change the representation. Hold the agent constant.">
        <p>Every condition keeps access to the repository source. Only the additional structural view changes.</p>
        <p>Each task runs three times in a fresh sandbox. Correctness is measured by a held-out verifier.</p>
        <p className="quiet-copy">Secondary measures include tokens, runtime, cost, and navigation behavior.</p>
      </ResearchCopy>
      <BenchmarkFigure/>
    </ViewFrame>
  );
}

function ExperimentsFigure() {
  const ref = useRef(null);

  useCausalTimeline(ref, (root) => {
    const conditions = qa(root, '.experiment-condition');
    const steps = qa(root, '.progress-step');

    gsap.set(conditions, { opacity: 0.34, color: '#777777' });
    gsap.set(steps, { backgroundColor: '#ededed', color: '#8b8b8b' });
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });

    conditions.forEach((condition) => {
      tl.to(condition, { opacity: 1, color: '#151515', x: 5, duration: 0.2 });
      steps.forEach((step) => {
        tl.to(step, { backgroundColor: '#151515', color: '#ffffff', duration: 0.2 })
          .to({}, { duration: 0.28 });
      });
      tl.to({}, { duration: 0.55 })
        .to(condition, { opacity: 0.34, color: '#777777', x: 0, duration: 0.16 })
        .set(steps, { backgroundColor: '#ededed', color: '#8b8b8b' });
    });
  });

  return (
    <figure className="research-figure experiments-figure" ref={ref}>
      <figcaption className="sr-only">Each experimental condition advances through three runs and held-out verification before the next condition begins.</figcaption>
      <div className="experiment-queue" aria-hidden="true">
        <section className="queue-list">
          <header><span>Queue</span><p>Condition</p></header>
          {CONDITIONS.map((condition) => <div className="experiment-condition" key={condition}>{condition}</div>)}
        </section>
        <section className="progress-panel">
          <p>Verified runs populate results</p>
          <div className="progress-steps">
            <span className="progress-step"><b>01</b>run</span>
            <i/>
            <span className="progress-step"><b>02</b>run</span>
            <i/>
            <span className="progress-step"><b>03</b>run</span>
            <i/>
            <span className="progress-step"><b>✓</b>verify</span>
          </div>
          <div className="results-message"><h2>Experiments in progress</h2><p>Results appear only after held-out verification.</p></div>
        </section>
      </div>
    </figure>
  );
}

function ExperimentsView() {
  return (
    <ViewFrame id="experiments" className="experiments-view">
      <div className="experiments-heading">
        <h1 id="experiments-title">Experiments</h1>
        <p className="primary-statement">Results, when the benchmark is ready.</p>
        <p>No result is implied before verified runs are complete.</p>
      </div>
      <ExperimentsFigure/>
    </ViewFrame>
  );
}

function App() {
  const initialView = useMemo(() => {
    const hash = window.location.hash.slice(1);
    return VIEWS.some((view) => view.id === hash) ? hash : 'mapbench';
  }, []);
  const [active, setActive] = useState(initialView);
  const navigate = (view) => {
    if (view === active) return;
    window.history.pushState(null, '', `#${view}`);
    setActive(view);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', '#mapbench');
    const onHistory = () => {
      const next = window.location.hash.slice(1);
      if (VIEWS.some((view) => view.id === next)) setActive(next);
    };
    window.addEventListener('popstate', onHistory);
    window.addEventListener('hashchange', onHistory);
    return () => {
      window.removeEventListener('popstate', onHistory);
      window.removeEventListener('hashchange', onHistory);
    };
  }, []);

  return (
    <div className="app-shell">
      <Header active={active} onNavigate={navigate}/>
      <main className="view-port" key={active}>
        {active === 'mapbench' && <MapBenchView onNavigate={navigate}/>} 
        {active === 'cartograph' && <CartographView/>}
        {active === 'benchmark' && <BenchmarkView/>}
        {active === 'experiments' && <ExperimentsView/>}
      </main>
    </div>
  );
}

const appRoot = globalThis.__mapbenchRoot || createRoot(document.getElementById('root'));
globalThis.__mapbenchRoot = appRoot;
appRoot.render(<App/>);
