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
 
function usePageEntrance(ref, pageKey) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return undefined;

    const page = q(root, '.view');
    if (!page) return undefined;
    const context = gsap.context(() => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const heading = qa(page, '[data-motion="heading"]');
      const text = qa(page, '[data-motion="text"]');
      const visual = qa(page, '[data-motion="visual"]');
      const content = [page, ...heading, ...text, ...visual];

      if (reducedMotion) {
        gsap.set(content, { clearProps: 'opacity,transform' });
        return;
      }

      gsap.set(page, { opacity: 0, y: 6 });
      gsap.set([...heading, ...text, ...visual], { opacity: 0, y: 5 });

      gsap.timeline({ defaults: { ease: 'power1.out', overwrite: 'auto' } })
        .to(page, { opacity: 1, y: 0, duration: 0.2 })
        .to(heading, { opacity: 1, y: 0, duration: 0.2, stagger: 0.035 }, '-=0.08')
        .to(text, { opacity: 1, y: 0, duration: 0.2, stagger: 0.045 }, '-=0.08')
        .to(visual, { opacity: 1, y: 0, duration: 0.24, stagger: 0.05 }, '-=0.08');
    }, root);

    return () => context.revert();
  }, [pageKey, ref]);
}

function useMetricChartEntrance(ref, metricId) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const context = gsap.context(() => {
      const marks = qa(root, '.chart-tick, .mean-line, .range-line, .run-mark, .mean-point, .mean-value, .condition-label, .condition-sublabel');
      gsap.fromTo(marks, { opacity: 0 }, {
        opacity: 1,
        duration: 0.18,
        stagger: 0.008,
        ease: 'power1.out',
        overwrite: 'auto',
      });
    }, root);
    return () => context.revert();
  }, [metricId, ref]);
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
      <h1 id={`${id}-title`} data-motion="heading">{title}</h1>
      <p className="primary-statement" data-motion="text">{statement}</p>
      <div className="copy-body" data-motion="text">{children}</div>
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
function MapExperimentFigure() {
  const ref = useRef(null);

  useCausalTimeline(ref, (root) => {
    const track = q(root, '.sequence-track');
    const rows = qa(root, '.repository-file');
    const generator = q(root, '.generation-card');
    const structureNodes = qa(root, '.structure-node');
    const structureEdges = qa(root, '.structure-edge');
    const treeRows = qa(root, '.tree-row');
    const routeRows = qa(root, '.tree-row[data-route]');
    const sourceToken = q(root, '.source-token');
    const agentToken = q(root, '.agent-token');
    const outcome = q(root, '.outcome-card');
    const completionTarget = q(root, '.completion-target');
    const completionMark = q(root, '.completion-mark');
    const generatorPort = q(root, '.generator-output');
    const structureCore = q(root, '[data-node="module"]');
    const outcomePort = q(root, '.outcome-port');
    const sourceStart = point(track, generatorPort);
    const corePoint = point(track, structureCore);
    const route = routeRows.map((row) => point(track, q(row, '.tree-anchor')));

    gsap.set(rows, { opacity: 0.5, color: '#777777', backgroundColor: '#f5f5f5' });
    gsap.set(generator, { backgroundColor: '#f4f4f4', color: '#626262' });
    gsap.set([...structureNodes, ...structureEdges], { opacity: 0 });
    gsap.set(treeRows, { opacity: 0.38, backgroundColor: 'transparent', color: '#777777' });
    gsap.set([sourceToken, agentToken], { opacity: 0 });
    gsap.set(sourceToken, place(sourceToken, sourceStart));
    gsap.set(agentToken, place(agentToken, corePoint));
    gsap.set(outcome, { opacity: 0.58, backgroundColor: '#f4f4f4', color: '#5f5f5f' });
    gsap.set([completionTarget, completionMark], { opacity: 0.34 });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.4, defaults: { ease: 'power1.inOut' } });
    rows.forEach((row, index) => {
      tl.to(row, { opacity: 1, color: '#151515', backgroundColor: '#ededed', duration: 0.2 })
        .to(row, { backgroundColor: '#f5f5f5', duration: 0.12 });
    });
    tl.to(generator, { backgroundColor: '#dedede', color: '#202020', duration: 0.24 })
      .set(sourceToken, { opacity: 1 })
      .to(sourceToken, { ...place(sourceToken, corePoint), duration: 0.72 })
      .set(sourceToken, { opacity: 0 })
      .to(structureNodes, { opacity: 1, duration: 0.16, stagger: 0.07 })
      .to(structureEdges, { opacity: 1, duration: 0.18, stagger: 0.07 })
      .to(treeRows, { opacity: 0.65, duration: 0.18, stagger: 0.035 })
      .set(agentToken, { ...place(agentToken, route[0]), opacity: 1 });

    route.forEach((target, index) => {
      if (index === 0) {
        tl.to(routeRows[index], { opacity: 1, backgroundColor: '#ededed', color: '#151515', duration: 0.14 });
        return;
      }
      tl.to(agentToken, { ...place(agentToken, target), duration: 0.46, ease: 'none' })
        .to(routeRows[index - 1], { backgroundColor: 'transparent', duration: 0.12 }, '<')
        .to(routeRows[index], { opacity: 1, backgroundColor: '#ededed', color: '#151515', duration: 0.14 }, '<');
    });

    tl.to(agentToken, { ...place(agentToken, point(track, outcomePort)), duration: 0.62 })
      .set(agentToken, { opacity: 0 })
      .to(routeRows[routeRows.length - 1], { backgroundColor: 'transparent', duration: 0.12 }, '<')
      .to(completionTarget, { opacity: 1, duration: 0.18 })
      .to(outcome, { opacity: 1, backgroundColor: '#dedede', color: '#202020', duration: 0.24 })
      .to(completionMark, { opacity: 1, duration: 0.16 }, '<')
      .to({}, { duration: 1.3 })
      .to(outcome, { opacity: 0.58, backgroundColor: '#f4f4f4', color: '#5f5f5f', duration: 0.2 })
      .set([completionTarget, completionMark], { opacity: 0.34 })
      .set([...structureNodes, ...structureEdges], { opacity: 0 })
      .set(treeRows, { opacity: 0.38, backgroundColor: 'transparent', color: '#777777' })
      .set(generator, { backgroundColor: '#f4f4f4', color: '#626262' })
      .set(rows, { opacity: 0.5, color: '#777777', backgroundColor: '#f5f5f5' });
  });

  return (
    <figure className="research-figure sequence-figure map-sequence" data-motion="visual" ref={ref}>
      <figcaption className="sr-only">Repository files are processed programmatically into deterministic structure, which guides an agent through a precise traversal to task completion.</figcaption>
      <div className="sequence-track" aria-hidden="true">
        <section className="sequence-stage repository-stage">
          <header><span>01 · source → artifact</span><p>Programmatic generation</p></header>
          <div className="repository-files">
            {FILES.map((file) => <span className="repository-file" key={file}><code>{file}</code></span>)}
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
            <div className="repository-tree">
              <span className="tree-row tree-root" data-route><i className="tree-anchor"/><code>mapbench/</code></span>
              <span className="tree-row depth-1" data-route><i className="tree-guide">└─</i><i className="tree-anchor"/><code>src/</code></span>
              <span className="tree-row depth-2" data-route><i className="tree-guide">└─</i><i className="tree-anchor"/><code>workspace.ts</code></span>
              <span className="tree-row tree-symbol depth-3" data-route><i className="tree-guide">└─</i><i className="tree-anchor"/><code>resolveRoot()</code></span>
            </div>
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage outcome-stage">
          <header><span>04 · result</span><p>Outcome</p></header>
          <div className="completion-trace">
            <div className="completion-target"><code>workspace.ts</code><span>resolveRoot()</span></div>
            <div className="outcome-card"><i className="ui-port outcome-port"/><i className="completion-mark"/><div><strong>Task completed</strong><span>target verified</span></div></div>
          </div>
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
        action={(
          <div className="hero-actions" data-motion="visual">
            <button className="primary-pill" onClick={() => onNavigate('benchmark')}>See how the benchmark works <span aria-hidden="true">→</span></button>
            <button className="secondary-action" onClick={() => onNavigate('experiments')}>View experiment results</button>
          </div>
        )}
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
    gsap.set(treeSitter, { backgroundColor: '#f4f4f4', color: '#626262' });
    gsap.set(parserPhases, { opacity: 0.28 });
    gsap.set([...irNodes, ...irEdges], { opacity: 0 });
    gsap.set(projections, { opacity: 0.48, backgroundColor: '#f4f4f4', color: '#666666' });
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

    tl.to(treeSitter, { backgroundColor: '#ededed', color: '#202020', duration: 0.24 })
      .to(parserPhases, { opacity: 1, duration: 0.16, stagger: 0.09 })
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
        .to(projection, { opacity: 1, backgroundColor: '#dedede', color: '#202020', duration: 0.18 });
    });

    tl.to({}, { duration: 1.15 })
      .set(fileTokens, { opacity: 0 })
      .set(irToken, { opacity: 0 })
      .set(projectionTokens, { opacity: 0 })
      .set(files, { opacity: 0.38, color: '#777777' })
      .set(treeSitter, { backgroundColor: '#f4f4f4', color: '#626262' })
      .set(parserPhases, { opacity: 0.28 })
      .set([...irNodes, ...irEdges], { opacity: 0 })
      .set(projections, { opacity: 0.48, backgroundColor: '#f4f4f4', color: '#666666' });
  });

  return (
    <figure className="research-figure sequence-figure cartograph-sequence" data-motion="visual" ref={ref}>
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
          <div className="tree-sitter-card">
            <i className="ui-port parser-input"/><i className="ui-port parser-output"/>
            <strong>Tree-sitter</strong>
            <div className="parser-pipeline">
              <div className="parser-source" aria-label="Source"><i className="parser-phase"/><i className="parser-phase"/><i className="parser-phase"/></div>
              <span className="parser-action">parse</span>
              <div className="parser-ast" aria-label="Abstract syntax tree"><span className="parser-phase">program</span><span className="parser-phase">function</span><span className="parser-phase">call</span></div>
            </div>
            <span>AST → symbols</span>
          </div>
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
    const slots = qa(root, '.run-slot');
    const tokens = qa(root, '.condition-run-token');
    const resultToken = q(root, '.result-token');
    const measures = qa(root, '.measure-row');
    const measuresPort = q(root, '.measures-port');

    gsap.set(cartograph, { backgroundColor: '#f4f4f4', color: '#626262' });
    gsap.set(artifacts, { opacity: 0.25, color: '#777777' });
    gsap.set(conditions, { opacity: 0.58, backgroundColor: '#f4f4f4', color: '#686868' });
    gsap.set(slots, { opacity: 0.32, backgroundColor: '#f1f1f1', color: '#777777' });
    gsap.set([...tokens, resultToken], { opacity: 0 });
    gsap.set(measures, { opacity: 0.5, backgroundColor: '#f4f4f4', color: '#686868' });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.4, defaults: { ease: 'power1.inOut' } });
    tl.to(cartograph, { backgroundColor: '#dedede', color: '#202020', duration: 0.24 })
      .to(artifacts, { opacity: 1, color: '#151515', duration: 0.17, stagger: 0.12 });

    conditions.forEach((condition) => {
      const source = point(track, q(condition, '.condition-port'));
      const runBurst = gsap.timeline();
      tl.to(condition, { opacity: 1, backgroundColor: '#dedede', color: '#202020', duration: 0.16 });

      tokens.forEach((token, index) => {
        const destination = point(track, q(slots[index], '.run-target'));
        const launch = index * 0.08;
        runBurst
          .set(token, { ...place(token, source), opacity: 1 }, launch)
          .to(token, { ...place(token, destination), duration: 0.24, ease: 'none' }, launch)
          .set(token, { opacity: 0 }, launch + 0.24)
          .to(slots[index], { opacity: 1, backgroundColor: '#dedede', color: '#202020', duration: 0.1 }, launch + 0.16);
      });

      tl.add(runBurst)
        .to({}, { duration: 0.08 })
        .to(condition, { opacity: 0.58, backgroundColor: '#f4f4f4', color: '#686868', duration: 0.12 })
        .set(slots, { opacity: 0.32, backgroundColor: '#f1f1f1', color: '#777777' });
    });

    tl.set(resultToken, { ...place(resultToken, point(track, q(slots[2], '.run-target'))), opacity: 1 })
      .to(resultToken, { ...place(resultToken, point(track, measuresPort)), duration: 0.68, ease: 'none' })
      .set(resultToken, { opacity: 0 })
      .to(measures, { opacity: 1, backgroundColor: '#dedede', color: '#202020', duration: 0.13, stagger: 0.08 })
      .to({}, { duration: 1.35 })
      .set(cartograph, { backgroundColor: '#f4f4f4', color: '#626262' })
      .set(artifacts, { opacity: 0.25, color: '#777777' })
      .set(measures, { opacity: 0.5, backgroundColor: '#f4f4f4', color: '#686868' });
  });

  return (
    <figure className="research-figure benchmark-sequence" data-motion="visual" ref={ref}>
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
          {CONDITIONS.map((condition) => <div className="condition-row" key={condition}><span>{condition}</span><i className="ui-port condition-port"/></div>)}
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
            {BENCHMARK_MEASURES.map((measure, index) => <span className="measure-row" key={measure}><i className={'ui-port measure-dot ' + (index === 0 ? 'measures-port' : '')}/>{measure}</span>)}
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
        <p className="measure-summary">Tokens · Runtime · Cost · Navigation behavior</p>
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
    label: 'Architecture',
    runs: [
      mockRun({ condition: 'outline-only', run: 1, score: .83, passed: true, durationMs: 522000, tokens: [96800, 34400, 11800, 5100], cost: .77, commands: 28, sourceFiles: 13, outlineFiles: 1, firstEditMs: 143000, filesChanged: ['src/runner.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
      mockRun({ condition: 'outline-only', run: 2, score: .88, passed: true, durationMs: 487000, tokens: [91200, 32800, 10900, 4800], cost: .71, commands: 26, sourceFiles: 12, outlineFiles: 1, firstEditMs: 126000, filesChanged: ['src/runner.ts', 'src/workspace.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
      mockRun({ condition: 'outline-only', run: 3, score: .79, passed: true, durationMs: 548000, tokens: [101600, 35100, 12400, 5500], cost: .81, commands: 30, failedCommands: 1, sourceFiles: 14, outlineFiles: 1, firstEditMs: 151000, filesChanged: ['src/runner.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
    ],
  },
  {
    id: 'callgraph-only',
    label: 'Call graph',
    runs: [
      mockRun({ condition: 'callgraph-only', run: 1, score: .76, passed: true, durationMs: 536000, tokens: [99400, 36200, 12100, 5400], cost: .80, commands: 31, sourceFiles: 14, outlineFiles: 1, firstEditMs: 158000, filesChanged: ['src/runner.ts', 'src/workspace.ts', 'test/runner.test.ts'] }),
      mockRun({ condition: 'callgraph-only', run: 2, score: .81, passed: true, durationMs: 501000, tokens: [93700, 33700, 11400, 4900], cost: .74, commands: 29, sourceFiles: 12, outlineFiles: 1, firstEditMs: 139000, filesChanged: ['src/runner.ts', 'src/verify.ts', 'test/runner.test.ts', 'package.json'] }),
      mockRun({ condition: 'callgraph-only', run: 3, score: .28, passed: false, durationMs: 900000, tokens: [134900, 45200, 14800, 7600], cost: 1.10, commands: 36, failedCommands: 3, sourceFiles: 18, outlineFiles: 1, firstEditMs: 267000, filesChanged: ['src/runner.ts', 'src/workspace.ts'], status: 'timeout', regression: 'timeout', typecheck: 'unavailable', build: 'unavailable' }),
    ],
  },
  {
    id: 'skeleton-only',
    label: 'Skeleton',
    runs: [
      mockRun({ condition: 'skeleton-only', run: 1, score: .86, passed: true, durationMs: 468000, tokens: [87200, 31600, 10400, 4600], cost: .67, commands: 25, sourceFiles: 11, outlineFiles: 7, firstEditMs: 112000, filesChanged: ['src/runner.ts', 'src/workspace.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
      mockRun({ condition: 'skeleton-only', run: 2, score: .82, passed: true, durationMs: 492000, tokens: [90800, 32900, 11100, 4900], cost: .71, commands: 27, sourceFiles: 12, outlineFiles: 6, firstEditMs: 124000, filesChanged: ['src/runner.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
      mockRun({ condition: 'skeleton-only', run: 3, score: .89, passed: true, durationMs: 451000, tokens: [84600, 30700, 9800, 4200], cost: .64, commands: 24, sourceFiles: 10, outlineFiles: 7, firstEditMs: 105000, filesChanged: ['src/runner.ts', 'src/workspace.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
    ],
  },
  {
    id: 'all-outline-aids',
    label: 'All artifacts',
    runs: [
      mockRun({ condition: 'all-outline-aids', run: 1, score: .91, passed: true, durationMs: 429000, tokens: [79800, 29600, 9400, 4000], cost: .60, commands: 22, sourceFiles: 9, outlineFiles: 9, firstEditMs: 88000, filesChanged: ['src/runner.ts', 'src/workspace.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
      mockRun({ condition: 'all-outline-aids', run: 2, score: .94, passed: true, durationMs: 407000, tokens: [76100, 28200, 8900, 3800], cost: .57, commands: 21, sourceFiles: 8, outlineFiles: 10, firstEditMs: 79000, filesChanged: ['src/runner.ts', 'src/workspace.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
      mockRun({ condition: 'all-outline-aids', run: 3, score: .88, passed: true, durationMs: 446000, tokens: [82400, 30400, 9600, 4200], cost: .62, commands: 23, sourceFiles: 10, outlineFiles: 8, firstEditMs: 94000, filesChanged: ['src/runner.ts', 'src/verify.ts', 'test/runner.test.ts'] }),
    ],
  },
];

const EXPERIMENT_DISPLAY_ORDER = ['regular-code', 'outline-only', 'skeleton-only', 'callgraph-only', 'all-outline-aids'];
const ORDERED_EXPERIMENT_RESULTS = EXPERIMENT_DISPLAY_ORDER.map((id) => EXPERIMENT_RESULTS.find((condition) => condition.id === id));

const mean = (values) => values.reduce((total, value) => total + value, 0) / values.length;
const formatDuration = (ms) => `${Math.floor(ms / 60000)}m ${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}s`;
const formatTokens = (value) => `${(value / 1000).toFixed(1)}k`;
const formatRun = (run) => String(run).padStart(2, '0');

const EXPERIMENT_METRICS = [
  {
    id: 'score',
    label: 'Score',
    axisLabel: 'Hidden grader score',
    detailLabel: 'Grader score',
    domain: [0, 100],
    ticks: [0, 25, 50, 75, 100],
    value: (run) => run.hiddenGrader.score / run.hiddenGrader.maxScore * 100,
    format: (value) => `${Math.round(value)}%`,
  },
  {
    id: 'tokens',
    label: 'Tokens',
    axisLabel: 'Total tokens',
    detailLabel: 'Total tokens',
    domain: [0, 160000],
    ticks: [0, 40000, 80000, 120000, 160000],
    value: (run) => run.tokens.total,
    format: (value) => value === 0 ? '0' : `${Math.round(value / 1000)}k`,
  },
  {
    id: 'runtime',
    label: 'Runtime',
    axisLabel: 'Runtime',
    detailLabel: 'Runtime',
    domain: [0, 960000],
    ticks: [0, 240000, 480000, 720000, 960000],
    value: (run) => run.durationMs,
    format: (value) => `${Math.round(value / 60000)}m`,
  },
  {
    id: 'cost',
    label: 'Cost',
    axisLabel: 'Estimated cost per run',
    detailLabel: 'Estimated cost',
    domain: [0, 1.2],
    ticks: [0, .3, .6, .9, 1.2],
    value: (run) => run.estimatedCostUsd,
    format: (value) => `$${value.toFixed(value === 0 ? 0 : 2)}`,
  },
  {
    id: 'navigation',
    label: 'Navigation',
    axisLabel: 'Unique source files explored',
    detailLabel: 'Source files explored',
    domain: [0, 24],
    ticks: [0, 6, 12, 18, 24],
    value: (run) => run.navigation.uniqueSourceFiles,
    format: (value) => `${Math.round(value)}`,
  },
];

function ObservationDetail({ observation, metric }) {
  if (!observation) {
    return null;
  }

  const { condition, run } = observation;
  return (
    <aside className="observation-detail" aria-live="polite" aria-label={`${condition.label}, run ${formatRun(run.run)} details`}>
      <div className="observation-title-row">
        <h2>{condition.label} <span>/ {formatRun(run.run)}</span></h2>
        <span className={`observation-status ${run.status}`}>{run.status}</span>
      </div>
      <div className="observation-primary">
        <span>{metric.detailLabel}</span>
        <strong>{metric.format(metric.value(run))}</strong>
      </div>
      <dl className="observation-grid">
        <div><dt>Tokens</dt><dd>{formatTokens(run.tokens.total)}</dd></div>
        <div><dt>Runtime</dt><dd>{formatDuration(run.durationMs)}</dd></div>
        <div><dt>Source files</dt><dd>{run.navigation.uniqueSourceFiles}</dd></div>
        <div><dt>Commands</dt><dd>{run.commandCount}</dd></div>
      </dl>
    </aside>
  );
}

function ExperimentsFigure() {
  const [metricId, setMetricId] = useState('score');
  const [hovered, setHovered] = useState(null);
  const [pinned, setPinned] = useState(() => ({ condition: ORDERED_EXPERIMENT_RESULTS[0], run: ORDERED_EXPERIMENT_RESULTS[0].runs[0] }));
  const chartRef = useRef(null);
  const metric = EXPERIMENT_METRICS.find((item) => item.id === metricId);
  const activeObservation = hovered || pinned;
  useMetricChartEntrance(chartRef, metricId);
  const width = 980;
  const height = 416;
  const plot = { left: 72, right: 24, top: 28, bottom: 64 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const xForCondition = (index) => plot.left + plotWidth * ((index + .5) / ORDERED_EXPERIMENT_RESULTS.length);
  const yForValue = (value) => plot.top + plotHeight * (1 - (value - metric.domain[0]) / (metric.domain[1] - metric.domain[0]));
  const meanPoints = ORDERED_EXPERIMENT_RESULTS.map((condition, index) => ({
    x: xForCondition(index),
    y: yForValue(mean(condition.runs.map(metric.value))),
  }));
  const meanPath = meanPoints.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');

  const observationKey = (condition, run) => `${condition.id}-${run.run}`;
  const isActive = (condition, run) => activeObservation && observationKey(condition, run) === observationKey(activeObservation.condition, activeObservation.run);
  const togglePinned = (condition, run) => {
    setPinned({ condition, run });
  };

  return (
    <div className="experiment-results" data-motion="visual" ref={chartRef}>
      <div className="experiment-toolbar">
        <div className="metric-tabs" role="group" aria-label="Experiment metric">
          {EXPERIMENT_METRICS.map((item) => (
            <button key={item.id} className={metricId === item.id ? 'active' : ''} aria-pressed={metricId === item.id} onClick={() => setMetricId(item.id)}>{item.label}</button>
          ))}
        </div>
        <div className="chart-key" aria-label="Chart key">
          <span><i className="key-mean"/>Mean</span>
          <span><i className="key-run"/>Run</span>
          <span><i className="key-range"/>Range</span>
        </div>
      </div>
      <div className="experiment-chart-layout">
        <section className="chart-panel" aria-labelledby="chart-title">
          <div className="chart-heading">
            <h2 id="chart-title">{metric.axisLabel}</h2>
          </div>
          <div className="experiment-chart-scroll">
            <svg className="experiment-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${metric.axisLabel} by repository representation condition. Each condition has three individual runs and a mean.`}>
              {metric.ticks.map((tick) => {
                const y = yForValue(tick);
                return (
                  <g className="chart-tick" key={tick}>
                    <line x1={plot.left} x2={width - plot.right} y1={y} y2={y}/>
                    <text x={plot.left - 16} y={y} textAnchor="end" dominantBaseline="central">{metric.format(tick)}</text>
                  </g>
                );
              })}
              <path className="mean-line" d={meanPath}/>
              {ORDERED_EXPERIMENT_RESULTS.map((condition, index) => {
                const x = xForCondition(index);
                const values = condition.runs.map(metric.value);
                const meanValue = mean(values);
                return (
                  <g className="condition-marks" key={condition.id}>
                    <line className="range-line" x1={x} x2={x} y1={yForValue(Math.max(...values))} y2={yForValue(Math.min(...values))}/>
                    {condition.runs.map((run, runIndex) => {
                      const pointX = x + (runIndex - 1) * 14;
                      const pointY = yForValue(metric.value(run));
                      const active = isActive(condition, run);
                      return (
                        <g
                          key={run.run}
                          className={`run-mark ${active ? 'active' : ''} ${run.status}`}
                          role="button"
                          tabIndex="0"
                          aria-label={`${condition.label}, run ${formatRun(run.run)}: ${metric.format(metric.value(run))}. ${run.status}`}
                          aria-pressed={pinned && observationKey(condition, run) === observationKey(pinned.condition, pinned.run)}
                          onMouseEnter={() => setHovered({ condition, run })}
                          onMouseLeave={() => setHovered(null)}
                          onFocus={() => setHovered({ condition, run })}
                          onBlur={() => setHovered(null)}
                          onClick={() => togglePinned(condition, run)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              togglePinned(condition, run);
                            }
                          }}
                        >
                          <circle className="run-hit-area" cx={pointX} cy={pointY} r="14"/>
                          <circle className="run-point" cx={pointX} cy={pointY} r={active ? 5.5 : 4}/>
                          {run.status === 'timeout' && <path className="timeout-mark" d={`M ${pointX - 3} ${pointY - 3} L ${pointX + 3} ${pointY + 3} M ${pointX + 3} ${pointY - 3} L ${pointX - 3} ${pointY + 3}`}/>}
                        </g>
                      );
                    })}
                    <rect className="mean-point" x={x - 4.5} y={yForValue(meanValue) - 4.5} width="9" height="9" transform={`rotate(45 ${x} ${yForValue(meanValue)})`}/>
                    <text className="mean-value" x={x} y={yForValue(meanValue) - 16} textAnchor="middle">{metric.format(meanValue)}</text>
                    <text className="condition-label" x={x} y={height - 34} textAnchor="middle">{condition.label}</text>
                    <text className="condition-sublabel" x={x} y={height - 17} textAnchor="middle">n = 3</text>
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

function ExperimentsView() {
  return (
    <ViewFrame id="experiments" className="experiments-view">
      <div className="experiments-heading">
        <h1 id="experiments-title" data-motion="heading">Experiments</h1>
        <p data-motion="text">Controlled runs across repository representations.</p>
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
  const [displayed, setDisplayed] = useState(initialView);
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
    }).to(outgoing, { opacity: 0, y: -5, duration: 0.14 });
  };

  const navigate = (view) => {
    if (view === activeRef.current) return;
    activeRef.current = view;
    window.history.pushState(null, '', `#${view}`);
    setActive(view);
    transitionTo(view);
  };

  useEffect(() => {
    if (!window.location.hash) window.history.replaceState(null, '', '#mapbench');
    const onHistory = () => {
      const next = window.location.hash.slice(1);
      if (!VIEWS.some((view) => view.id === next) || next === activeRef.current) return;
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
        {displayed === 'cartograph' && <CartographView/>}
        {displayed === 'benchmark' && <BenchmarkView/>}
        {displayed === 'experiments' && <ExperimentsView/>}
      </main>
    </div>
  );
}

const appRoot = globalThis.__mapbenchRoot || createRoot(document.getElementById('root'));
globalThis.__mapbenchRoot = appRoot;
appRoot.render(<App/>);
