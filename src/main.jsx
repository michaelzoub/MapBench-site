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
  { id: 'module', label: 'module', width: 54, height: 23 },
  { id: 'symbol', label: 'symbol', width: 54, height: 23, className: 'core' },
  { id: 'call', label: 'call', width: 42, height: 23 },
  { id: 'type', label: 'type', width: 42, height: 23 },
];
const STRUCTURE_EDGES = [['module', 'symbol'], ['symbol', 'call'], ['symbol', 'type']];
const NAVIGATION_NODES = [
  { id: 'entry', label: 'entry', width: 44, height: 23 },
  { id: 'index', label: 'index', width: 44, height: 23 },
  { id: 'target', label: 'target', width: 48, height: 23, className: 'target' },
  { id: 'edit', label: 'edit', width: 40, height: 23 },
  { id: 'branch', label: 'other', width: 44, height: 23, className: 'branch' },
];
const NAVIGATION_EDGES = [['entry', 'index'], ['index', 'target'], ['index', 'branch'], ['target', 'edit']];
const NAVIGATION_ROUTE = ['entry', 'index', 'target', 'edit'];

function MapExperimentFigure() {
  const ref = useRef(null);

  useCausalTimeline(ref, (root) => {
    const track = q(root, '.sequence-track');
    const rows = qa(root, '.repository-file');
    const scans = qa(root, '.generation-scan');
    const generator = q(root, '.generation-card');
    const structureNodes = qa(root, '.structure-node');
    const structureEdges = qa(root, '.structure-edge');
    const navNodes = qa(root, '.nav-node');
    const navEdges = qa(root, '.nav-edge');
    const sourceToken = q(root, '.source-token');
    const agentToken = q(root, '.agent-token');
    const outcome = q(root, '.outcome-card');
    const generatorPort = q(root, '.generator-output');
    const structureCore = q(root, '[data-node="module"]');
    const outcomePort = q(root, '.outcome-port');
    const sourceStart = point(track, generatorPort);
    const corePoint = point(track, structureCore);
    const routeNodes = NAVIGATION_ROUTE.map((id) => q(root, `.nav-node[data-node="${id}"]`));
    const routeEdges = NAVIGATION_ROUTE.slice(0, -1).map((id, index) => q(root, `.nav-edge[data-edge="${id}-${NAVIGATION_ROUTE[index + 1]}"]`));
    const route = routeNodes.map((node) => point(track, node));

    gsap.set(rows, { opacity: 0.38, color: '#777777' });
    gsap.set(scans, { scaleX: 0, transformOrigin: 'left center' });
    gsap.set(generator, { backgroundColor: '#f1f1f1', color: '#747474' });
    gsap.set([...structureNodes, ...structureEdges], { opacity: 0 });
    gsap.set(navNodes, { opacity: 0.28 });
    gsap.set(navEdges, { opacity: 0.22 });
    gsap.set([sourceToken, agentToken], { opacity: 0 });
    gsap.set(sourceToken, place(sourceToken, sourceStart));
    gsap.set(agentToken, place(agentToken, corePoint));
    gsap.set(outcome, { opacity: 0.22, backgroundColor: '#f1f1f1', color: '#777777' });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.4, defaults: { ease: 'power1.inOut' } });
    rows.forEach((row, index) => {
      tl.to(row, { opacity: 1, color: '#151515', duration: 0.18 })
        .to(scans[index], { scaleX: 1, duration: 0.22 });
    });
    tl.to(generator, { backgroundColor: '#151515', color: '#ffffff', duration: 0.24 })
      .set(sourceToken, { opacity: 1 })
      .to(sourceToken, { ...place(sourceToken, corePoint), duration: 0.72 })
      .set(sourceToken, { opacity: 0 })
      .to(structureNodes, { opacity: 1, duration: 0.16, stagger: 0.07 })
      .to(structureEdges, { opacity: 1, duration: 0.18, stagger: 0.07 })
      .to(navNodes, { opacity: 0.62, duration: 0.18, stagger: 0.05 })
      .to(navEdges, { opacity: 0.48, duration: 0.18, stagger: 0.05 })
      .set(agentToken, { ...place(agentToken, route[0]), opacity: 1 });

    route.forEach((target, index) => {
      if (index === 0) {
        tl.to(routeNodes[index], { opacity: 1, duration: 0.12 });
        return;
      }
      tl.to(agentToken, { ...place(agentToken, target), duration: 0.46, ease: 'none' })
        .to(routeEdges[index - 1], { opacity: 1, stroke: '#151515', duration: 0.12 }, '<')
        .to(routeNodes[index], { opacity: 1, duration: 0.12 }, '<');
    });

    tl.to(agentToken, { ...place(agentToken, point(track, outcomePort)), duration: 0.62 })
      .set(agentToken, { opacity: 0 })
      .to(outcome, { opacity: 1, backgroundColor: '#151515', color: '#ffffff', duration: 0.28 })
      .to({}, { duration: 1.3 })
      .to(outcome, { opacity: 0.22, backgroundColor: '#f1f1f1', color: '#777777', duration: 0.2 })
      .set([...structureNodes, ...structureEdges], { opacity: 0 })
      .set(navNodes, { opacity: 0.28 })
      .set(navEdges, { opacity: 0.22, stroke: '#9c9c9c' })
      .set(scans, { scaleX: 0 })
      .set(generator, { backgroundColor: '#f1f1f1', color: '#747474' })
      .set(rows, { opacity: 0.38, color: '#777777' });
  });

  return (
    <figure className="research-figure sequence-figure map-sequence" ref={ref}>
      <figcaption className="sr-only">Repository files are processed programmatically into deterministic structure, which guides an agent through a precise traversal to task completion.</figcaption>
      <div className="sequence-track" aria-hidden="true">
        <section className="sequence-stage repository-stage">
          <header><span>01 · source → artifact</span><p>Programmatic generation</p></header>
          <div className="repository-files">
            {FILES.map((file) => <span className="repository-file" key={file}><code>{file}</code><i className="generation-scan"/></span>)}
          </div>
          <div className="generation-card"><span>deterministic build</span><i className="ui-port generator-output"/></div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage structure-stage">
          <header><span>02 · canonical</span><p>Structure</p></header>
          <div className="structure-map">
            <RoutedGraph className="structure" nodes={STRUCTURE_NODES} edges={STRUCTURE_EDGES} width={176} height={136} rankdir="LR" ranksep={26} nodesep={18} labelled/>
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage navigation-stage">
          <header><span>03 · agent traversal</span><p>Navigation</p></header>
          <div className="navigation-map">
            <RoutedGraph className="nav" nodes={NAVIGATION_NODES} edges={NAVIGATION_EDGES} width={176} height={136} rankdir="LR" ranksep={24} nodesep={18} labelled/>
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage outcome-stage">
          <header><span>04 · result</span><p>Outcome</p></header>
          <div className="outcome-card"><i className="ui-port outcome-port"/><strong>Task completed</strong><span>informed traversal</span></div>
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
        statement="Do deterministic structural artifacts help agents traverse unfamiliar codebases more efficiently?"
        action={<button className="primary-pill text-action" onClick={() => onNavigate('benchmark')}>See the benchmark <span aria-hidden="true">→</span></button>}
      >
        <p>MapBench compares agent performance on the same codebase with and without deterministic structural representations.</p>
        <p>The experiment tests whether these artifacts accelerate repository understanding and improve software engineering task performance.</p>
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
    const parserPhases = qa(root, '.parser-phase');
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
    gsap.set(parserPhases, { opacity: 0.32, backgroundColor: '#dddddd' });
    gsap.set([...irNodes, ...irEdges], { opacity: 0 });
    gsap.set(projections, { opacity: 0.26, backgroundColor: '#f1f1f1', color: '#777777' });
    gsap.set(projectionTokens, { opacity: 0 });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.4, defaults: { ease: 'power1.inOut' } });
    files.forEach((file, index) => {
      const start = point(track, q(file, '.stage-port'));
      gsap.set(fileTokens[index], place(fileTokens[index], start));
      tl.to(file, { opacity: 1, color: '#151515', duration: 0.18 })
        .set(fileTokens[index], { opacity: 1 })
        .to(fileTokens[index], { ...place(fileTokens[index], parserPoint), duration: 0.58 })
        .set(fileTokens[index], { opacity: 0 });
    });

    tl.to(treeSitter, { backgroundColor: '#151515', color: '#ffffff', duration: 0.24 })
      .to(parserPhases[0], { opacity: 1, backgroundColor: '#ffffff', duration: 0.2 })
      .to(parserPhases[1], { opacity: 1, backgroundColor: '#ffffff', duration: 0.2 })
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
      .set(parserPhases, { opacity: 0.32, backgroundColor: '#dddddd' })
      .set([...irNodes, ...irEdges], { opacity: 0 })
      .set(projections, { opacity: 0.26, backgroundColor: '#f1f1f1', color: '#777777' });
  });

  return (
    <figure className="research-figure sequence-figure cartograph-sequence" ref={ref}>
      <figcaption className="sr-only">Files enter Tree-sitter one at a time, form a canonical intermediate representation, then activate deterministic projections.</figcaption>
      <div className="sequence-track" aria-hidden="true">
        <section className="sequence-stage source-stage">
          <header><span>01 · repository</span><p>Source files</p></header>
          <div className="source-files">
            {SOURCE_FILES.map((file) => <span className="source-file" key={file}><code>{file}</code><i className="ui-port stage-port"/></span>)}
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage parser-stage">
          <header><span>02 · grammar-aware</span><p>Parsing</p></header>
          <div className="tree-sitter-card"><i className="ui-port parser-input"/><i className="ui-port parser-output"/><strong>Tree-sitter</strong><span>parse tree → extract</span><div className="parser-phases"><i className="parser-phase"/><i className="parser-phase"/></div></div>
        </section>
        <i className="track-line parser-to-ir"/>
        <section className="sequence-stage ir-stage">
          <header><span>03 · normalized</span><p>Canonical IR</p></header>
          <div className="canonical-ir">
            <RoutedGraph className="ir" nodes={IR_NODES} edges={IR_EDGES} width={164} height={150} rankdir="TB" ranksep={26} nodesep={20} labelled/>
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage projection-stage">
          <header><span>04 · deterministic</span><p>Projections</p></header>
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
      <ResearchCopy id="cartograph" title="Cartograph" statement="The structural analysis system used inside MapBench.">
        <p>Cartograph uses Tree-sitter to parse source code into a canonical representation of modules, symbols, locations, and typed relationships.</p>
        <p>MapBench utilizes Cartograph’s deterministic projections—architecture, skeleton, call graph, and Mermaid—as experimental artifacts.</p>
        <p className="language-tag">TypeScript, JavaScript, Python, Go, and Rust.</p>
      </ResearchCopy>
      <CartographFigure/>
    </ViewFrame>
  );
}

const CONDITIONS = ['Regular code', 'Architecture', 'Skeleton', 'Call graph', 'All'];
const BENCHMARK_ARTIFACTS = ['architecture', 'skeleton', 'call graph'];
const BENCHMARK_MEASURES = ['Tokens', 'Runtime', 'Cost', 'Navigation behavior'];

function BenchmarkFigure() {
  const ref = useRef(null);

  useCausalTimeline(ref, (root) => {
    const track = q(root, '.benchmark-track');
    const cartograph = q(root, '.benchmark-cartograph-card');
    const artifacts = qa(root, '.benchmark-artifact');
    const conditions = qa(root, '.condition-row');
    const overlays = qa(root, '.condition-overlay');
    const slots = qa(root, '.run-slot');
    const tokens = qa(root, '.condition-run-token');
    const resultToken = q(root, '.result-token');
    const measures = qa(root, '.measure-row');
    const measuresPort = q(root, '.measures-port');

    gsap.set(cartograph, { backgroundColor: '#f1f1f1', color: '#777777' });
    gsap.set(artifacts, { opacity: 0.25, color: '#777777' });
    gsap.set(conditions, { opacity: 0.48, color: '#6f6f6f' });
    gsap.set(overlays, { opacity: 0 });
    gsap.set(slots, { opacity: 0.32, backgroundColor: '#f1f1f1', color: '#777777' });
    gsap.set([...tokens, resultToken], { opacity: 0 });
    gsap.set(measures, { opacity: 0.28, backgroundColor: '#f1f1f1', color: '#777777' });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.4, defaults: { ease: 'power1.inOut' } });
    tl.to(cartograph, { backgroundColor: '#151515', color: '#ffffff', duration: 0.24 })
      .to(artifacts, { opacity: 1, color: '#151515', duration: 0.17, stagger: 0.12 });

    conditions.forEach((condition) => {
      const overlay = q(condition, '.condition-overlay');
      const source = point(track, q(condition, '.condition-port'));
      tl.to(condition, { opacity: 1, color: '#ffffff', duration: 0.2 })
        .to(overlay, { opacity: 1, duration: 0.2 }, '<');

      tokens.forEach((token, index) => {
        const destination = point(track, q(slots[index], '.run-target'));
        tl.set(token, { ...place(token, source), opacity: 1 })
          .to(token, { ...place(token, destination), duration: 0.42, ease: 'none' })
          .set(token, { opacity: 0 })
          .to(slots[index], { opacity: 1, backgroundColor: '#dedede', color: '#151515', duration: 0.13 });
      });

      tl.to({}, { duration: 0.24 })
        .to(overlay, { opacity: 0, duration: 0.16 })
        .to(condition, { opacity: 0.48, color: '#6f6f6f', duration: 0.16 }, '<')
        .set(slots, { opacity: 0.24, backgroundColor: '#f1f1f1', color: '#777777' });
    });

    tl.set(resultToken, { ...place(resultToken, point(track, q(slots[2], '.run-target'))), opacity: 1 })
      .to(resultToken, { ...place(resultToken, point(track, measuresPort)), duration: 0.68, ease: 'none' })
      .set(resultToken, { opacity: 0 })
      .to(measures, { opacity: 1, backgroundColor: '#151515', color: '#ffffff', duration: 0.16, stagger: 0.12 })
      .to({}, { duration: 1.35 })
      .set(cartograph, { backgroundColor: '#f1f1f1', color: '#777777' })
      .set(artifacts, { opacity: 0.25, color: '#777777' })
      .set(measures, { opacity: 0.28, backgroundColor: '#f1f1f1', color: '#777777' });
  });

  return (
    <figure className="research-figure benchmark-sequence" ref={ref}>
      <figcaption className="sr-only">Cartograph generates structural artifacts, five representation conditions are compared through repeated controlled runs, and tokens, runtime, cost, and navigation behavior are measured.</figcaption>
      <div className="benchmark-track" aria-hidden="true">
        <section className="benchmark-generation-stage">
          <header><span>01 · Cartograph</span><p>Generate artifacts</p></header>
          <div className="benchmark-cartograph-card"><strong>Cartograph</strong><span>canonical IR</span></div>
          <div className="benchmark-artifacts">
            {BENCHMARK_ARTIFACTS.map((artifact) => <span className="benchmark-artifact" key={artifact}>{artifact}</span>)}
          </div>
        </section>
        <i className="benchmark-line"/>
        <section className="condition-list">
          <header><span>02 · variable</span><p>Representation</p></header>
          {CONDITIONS.map((condition) => <div className="condition-row" key={condition}><i className="condition-overlay"/><span>{condition}</span><i className="ui-port condition-port"/></div>)}
        </section>
        <i className="benchmark-line"/>
        <section className="run-bank">
          <header><span>03 · controlled</span><p>Repeated runs</p></header>
          <div className="fixed-setup"><span>same model</span><span>task</span><span>tools</span></div>
          <div className="run-slots">
            {['01', '02', '03'].map((run) => <span className="run-slot" key={run}><i className="ui-dot run-target"/><b>{run}</b></span>)}
          </div>
        </section>
        <i className="benchmark-line"/>
        <section className="measure-stage">
          <header><span>04 · analyze</span><p>Measures</p></header>
          <div className="measure-list">
            {BENCHMARK_MEASURES.map((measure, index) => <span className="measure-row" key={measure}>{index === 0 && <i className="ui-port measures-port"/>}{measure}</span>)}
          </div>
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
      <ResearchCopy id="benchmark" title="Benchmark" statement="Measure how structural representation changes agent behavior under controlled conditions.">
        <p>Cartograph generates the artifacts used to compare regular code, each single-artifact condition, and the all-artifact condition.</p>
        <p>The model, task, tools, repository, and environment remain fixed across repeated runs; only the representation changes.</p>
        <div className="measure-summary"><span>Primary measures</span><strong>Tokens</strong><strong>Runtime</strong><strong>Cost</strong><strong>Navigation behavior</strong></div>
      </ResearchCopy>
      <BenchmarkFigure/>
    </ViewFrame>
  );
}

const CHECK = {
  passed: { status: 'passed' },
  failed: { status: 'failed' },
  timeout: { status: 'timeout' },
  unavailable: { status: 'unavailable' },
};

function mockRun({ condition, run, score, passed, durationMs, tokens, cost, commands, failedCommands = 0, sourceFiles, outlineFiles, firstEditMs, filesChanged, status = 'completed', regression = 'passed', typecheck = 'passed', build = 'passed' }) {
  return {
    schemaVersion: 3,
    condition,
    run,
    status,
    durationMs,
    tokens: {
      input: tokens[0],
      uncachedInput: tokens[0] - tokens[1],
      cachedInput: tokens[1],
      output: tokens[2],
      reasoning: tokens[3],
      total: tokens[0] + tokens[2],
    },
    estimatedCostUsd: cost,
    commandCount: commands,
    failedCommandCount: failedCommands,
    navigation: {
      uniqueSourceFiles: sourceFiles,
      uniqueOutlineFiles: outlineFiles,
    },
    editNavigation: {
      firstSourceEditObserved: firstEditMs !== null,
      elapsedMs: firstEditMs,
      censoredAtMs: durationMs,
    },
    filesChanged,
    fileCount: filesChanged.length,
    hiddenGrader: {
      status: passed ? 'passed' : 'failed',
      score,
      maxScore: 1,
      passed,
    },
    checks: {
      regression: CHECK[regression],
      typecheck: CHECK[typecheck],
      build: CHECK[build],
    },
  };
}

const EXPERIMENT_RESULTS = [
  {
    id: 'regular-code',
    label: 'Regular code',
    runs: [
      mockRun({ condition: 'regular-code', run: 1, score: .72, passed: true, durationMs: 598000, tokens: [112800, 38400, 13800, 6200], cost: .91, commands: 34, failedCommands: 1, sourceFiles: 17, outlineFiles: 0, firstEditMs: 201000, filesChanged: ['src/runner.ts', 'src/workspace.ts', 'test/runner.test.ts', 'package.json'] }),
      mockRun({ condition: 'regular-code', run: 2, score: .61, passed: false, durationMs: 641000, tokens: [126200, 41900, 15100, 7100], cost: 1.04, commands: 38, failedCommands: 2, sourceFiles: 21, outlineFiles: 0, firstEditMs: 244000, filesChanged: ['src/runner.ts', 'src/verify.ts', 'test/runner.test.ts'], regression: 'failed' }),
      mockRun({ condition: 'regular-code', run: 3, score: .78, passed: true, durationMs: 570000, tokens: [105400, 36200, 12900, 5800], cost: .85, commands: 31, sourceFiles: 16, outlineFiles: 0, firstEditMs: 184000, filesChanged: ['src/runner.ts', 'src/workspace.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
    ],
  },
  {
    id: 'outline-only',
    label: 'Architecture map only',
    runs: [
      mockRun({ condition: 'outline-only', run: 1, score: .83, passed: true, durationMs: 522000, tokens: [96800, 34400, 11800, 5100], cost: .77, commands: 28, sourceFiles: 13, outlineFiles: 1, firstEditMs: 143000, filesChanged: ['src/runner.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
      mockRun({ condition: 'outline-only', run: 2, score: .88, passed: true, durationMs: 487000, tokens: [91200, 32800, 10900, 4800], cost: .71, commands: 26, sourceFiles: 12, outlineFiles: 1, firstEditMs: 126000, filesChanged: ['src/runner.ts', 'src/workspace.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
      mockRun({ condition: 'outline-only', run: 3, score: .79, passed: true, durationMs: 548000, tokens: [101600, 35100, 12400, 5500], cost: .81, commands: 30, failedCommands: 1, sourceFiles: 14, outlineFiles: 1, firstEditMs: 151000, filesChanged: ['src/runner.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
    ],
  },
  {
    id: 'callgraph-only',
    label: 'Call graph only',
    runs: [
      mockRun({ condition: 'callgraph-only', run: 1, score: .76, passed: true, durationMs: 536000, tokens: [99400, 36200, 12100, 5400], cost: .80, commands: 31, sourceFiles: 14, outlineFiles: 1, firstEditMs: 158000, filesChanged: ['src/runner.ts', 'src/workspace.ts', 'test/runner.test.ts'] }),
      mockRun({ condition: 'callgraph-only', run: 2, score: .81, passed: true, durationMs: 501000, tokens: [93700, 33700, 11400, 4900], cost: .74, commands: 29, sourceFiles: 12, outlineFiles: 1, firstEditMs: 139000, filesChanged: ['src/runner.ts', 'src/verify.ts', 'test/runner.test.ts', 'package.json'] }),
      mockRun({ condition: 'callgraph-only', run: 3, score: .28, passed: false, durationMs: 900000, tokens: [134900, 45200, 14800, 7600], cost: 1.10, commands: 36, failedCommands: 3, sourceFiles: 18, outlineFiles: 1, firstEditMs: 267000, filesChanged: ['src/runner.ts', 'src/workspace.ts'], status: 'timeout', regression: 'timeout', typecheck: 'unavailable', build: 'unavailable' }),
    ],
  },
  {
    id: 'skeleton-only',
    label: 'Skeleton only',
    runs: [
      mockRun({ condition: 'skeleton-only', run: 1, score: .86, passed: true, durationMs: 468000, tokens: [87200, 31600, 10400, 4600], cost: .67, commands: 25, sourceFiles: 11, outlineFiles: 7, firstEditMs: 112000, filesChanged: ['src/runner.ts', 'src/workspace.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
      mockRun({ condition: 'skeleton-only', run: 2, score: .82, passed: true, durationMs: 492000, tokens: [90800, 32900, 11100, 4900], cost: .71, commands: 27, sourceFiles: 12, outlineFiles: 6, firstEditMs: 124000, filesChanged: ['src/runner.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
      mockRun({ condition: 'skeleton-only', run: 3, score: .89, passed: true, durationMs: 451000, tokens: [84600, 30700, 9800, 4200], cost: .64, commands: 24, sourceFiles: 10, outlineFiles: 7, firstEditMs: 105000, filesChanged: ['src/runner.ts', 'src/workspace.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
    ],
  },
  {
    id: 'all-outline-aids',
    label: 'All three artifacts',
    runs: [
      mockRun({ condition: 'all-outline-aids', run: 1, score: .91, passed: true, durationMs: 429000, tokens: [79800, 29600, 9400, 4000], cost: .60, commands: 22, sourceFiles: 9, outlineFiles: 9, firstEditMs: 88000, filesChanged: ['src/runner.ts', 'src/workspace.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
      mockRun({ condition: 'all-outline-aids', run: 2, score: .94, passed: true, durationMs: 407000, tokens: [76100, 28200, 8900, 3800], cost: .57, commands: 21, sourceFiles: 8, outlineFiles: 10, firstEditMs: 79000, filesChanged: ['src/runner.ts', 'src/workspace.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
      mockRun({ condition: 'all-outline-aids', run: 3, score: .88, passed: true, durationMs: 446000, tokens: [82400, 30400, 9600, 4200], cost: .62, commands: 23, sourceFiles: 10, outlineFiles: 8, firstEditMs: 94000, filesChanged: ['src/runner.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
    ],
  },
];

const mean = (values) => values.reduce((total, value) => total + value, 0) / values.length;
const formatDuration = (ms) => `${Math.floor(ms / 60000)}m ${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}s`;
const formatTokens = (value) => `${(value / 1000).toFixed(1)}k`;
const formatRun = (run) => String(run).padStart(2, '0');

function CheckStatus({ label, value }) {
  return <span className={`check-status ${value.status}`}><i aria-hidden="true"/><span>{label}</span> {value.status}</span>;
}

function RunDetail({ condition, run }) {
  const score = run.hiddenGrader.score / run.hiddenGrader.maxScore;
  const firstEdit = run.editNavigation.firstSourceEditObserved ? formatDuration(run.editNavigation.elapsedMs) : `>${formatDuration(run.editNavigation.censoredAtMs)}`;
  return (
    <section className="run-detail" aria-live="polite" aria-label={`${condition.label}, run ${formatRun(run.run)} details`}>
      <header className="run-detail-header">
        <div><span>Selected run</span><h2>{condition.label} <b>/ {formatRun(run.run)}</b></h2></div>
        <span className={`run-status ${run.status}`}>{run.status}</span>
      </header>
      <dl className="run-detail-grid">
        <div><dt>Hidden grader</dt><dd>{score.toFixed(2)} <small>/ 1.00</small></dd></div>
        <div><dt>Duration</dt><dd>{formatDuration(run.durationMs)}</dd></div>
        <div className="token-detail"><dt>Tokens · input / cached / output / reasoning</dt><dd>{run.tokens.input.toLocaleString()} <i>/</i> {run.tokens.cachedInput.toLocaleString()} <i>/</i> {run.tokens.output.toLocaleString()} <i>/</i> {run.tokens.reasoning.toLocaleString()}</dd></div>
        <div><dt>Estimated cost</dt><dd>${run.estimatedCostUsd.toFixed(2)}</dd></div>
        <div><dt>Commands</dt><dd>{run.commandCount} <small>· {run.failedCommandCount} failed</small></dd></div>
        <div><dt>Files accessed</dt><dd>{run.navigation.uniqueSourceFiles} source <small>· {run.navigation.uniqueOutlineFiles} outline</small></dd></div>
        <div><dt>Time to first edit</dt><dd>{firstEdit}</dd></div>
        <div><dt>Files changed</dt><dd>{run.fileCount} <small title={run.filesChanged.join(', ')}>· {run.filesChanged.join(', ')}</small></dd></div>
        <div className="check-detail"><dt>Verification checks</dt><dd><CheckStatus label="regression" value={run.checks.regression}/><CheckStatus label="typecheck" value={run.checks.typecheck}/><CheckStatus label="build" value={run.checks.build}/></dd></div>
      </dl>
    </section>
  );
}

function ExperimentsFigure() {
  const [selection, setSelection] = useState({ conditionId: 'all-outline-aids', run: 2 });
  const selectedCondition = EXPERIMENT_RESULTS.find((condition) => condition.id === selection.conditionId);
  const selectedRun = selectedCondition.runs.find((run) => run.run === selection.run);

  return (
    <div className="experiment-results">
      <div className="experiment-meta">
        <span className="preview-label">Mock data / experiment preview</span>
        <span>n = 3 per condition</span>
      </div>
      <div className="results-table-scroll">
        <table className="results-table">
          <caption className="sr-only">Mock MapBench results, summarized by repository representation.</caption>
          <thead>
            <tr>
              <th scope="col">Condition</th>
              <th scope="col">Runs <small>01 / 02 / 03</small></th>
              <th scope="col">Mean grader<br/>score</th>
              <th scope="col">Success<br/>rate</th>
              <th scope="col">Mean<br/>duration</th>
              <th scope="col">Mean total<br/>tokens</th>
              <th scope="col">Mean<br/>commands</th>
              <th scope="col">Mean files<br/>changed</th>
            </tr>
          </thead>
          <tbody>
            {EXPERIMENT_RESULTS.map((condition) => {
              const successes = condition.runs.filter((run) => run.hiddenGrader.passed).length;
              return (
                <tr key={condition.id} className={selection.conditionId === condition.id ? 'selected-condition' : ''}>
                  <th scope="row">{condition.label}</th>
                  <td>
                    <div className="run-selector">
                      {condition.runs.map((run) => {
                        const active = selection.conditionId === condition.id && selection.run === run.run;
                        return <button key={run.run} className={`${active ? 'active' : ''} ${run.status}`} aria-pressed={active} aria-label={`${condition.label}, run ${formatRun(run.run)}, ${run.status}`} onMouseEnter={() => setSelection({ conditionId: condition.id, run: run.run })} onFocus={() => setSelection({ conditionId: condition.id, run: run.run })} onClick={() => setSelection({ conditionId: condition.id, run: run.run })}><i aria-hidden="true"/>{formatRun(run.run)}</button>;
                      })}
                    </div>
                  </td>
                  <td>{mean(condition.runs.map((run) => run.hiddenGrader.score / run.hiddenGrader.maxScore)).toFixed(2)}</td>
                  <td>{Math.round(successes / condition.runs.length * 100)}% <small>{successes}/{condition.runs.length}</small></td>
                  <td>{formatDuration(mean(condition.runs.map((run) => run.durationMs)))}</td>
                  <td>{formatTokens(mean(condition.runs.map((run) => run.tokens.total)))}</td>
                  <td>{mean(condition.runs.map((run) => run.commandCount)).toFixed(1)}</td>
                  <td>{mean(condition.runs.map((run) => run.fileCount)).toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <RunDetail condition={selectedCondition} run={selectedRun}/>
    </div>
  );
}

function ExperimentsView() {
  return (
    <ViewFrame id="experiments" className="experiments-view">
      <div className="experiments-heading">
        <h1 id="experiments-title">Experiments</h1>
        <p>Per-run results across controlled repository representations.</p>
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
