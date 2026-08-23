import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import dagre from '@dagrejs/dagre';
import { gsap } from 'gsap';
import './styles.css';

const GITHUB_URL = 'https://github.com/michaelzoub/MapBench';
const VIEWS = [
  { id: 'cartograph', label: 'Cartograph' },
  { id: 'experiment', label: 'Experiment' },
  { id: 'results', label: 'Results' },
  { id: 'future', label: 'Future Work' },
];
const VALID_VIEWS = ['mapbench', ...VIEWS.map((view) => view.id)];

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

function RoutedGraph({ className, nodes, edges, width, height, rankdir, ranksep, nodesep, labelled = false, interactive = false, activeNode = null, onNodeHover }) {
  const layout = useMemo(
    () => createGraphLayout({ nodes, edges, width, height, rankdir, ranksep, nodesep }),
    [edges, height, nodes, nodesep, rankdir, ranksep, width],
  );
  const connectedNodeIds = activeNode
    ? new Set(layout.edges.flatMap((edge) => edge.source === activeNode || edge.target === activeNode ? [edge.source, edge.target] : []))
    : new Set();

  return (
    <svg
      className={`routed-graph ${className}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      focusable={interactive ? undefined : 'false'}
      aria-label={interactive ? 'Canonical intermediate representation graph' : undefined}
    >
      <g className="graph-edges">
        {layout.edges.map((edge) => {
          const edgeActive = interactive && activeNode && (edge.source === activeNode || edge.target === activeNode);
          return (
            <path
              key={edge.id}
              className={`${className}-edge layout-edge ${interactive ? (edgeActive ? 'is-active' : activeNode ? 'is-dimmed' : '') : ''}`}
              data-edge={`${edge.source}-${edge.target}`}
              d={edge.points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ')}
            />
          );
        })}
      </g>
      <g className="graph-nodes">
        {layout.nodes.map((node) => {
          const nodeActive = interactive && activeNode === node.id;
          const nodeConnected = interactive && connectedNodeIds.has(node.id) && !nodeActive;
          const nodeDimmed = interactive && activeNode && !nodeActive && !nodeConnected;
          const nodeClass = `${className}-node layout-node ${node.className || ''} ${nodeActive ? 'is-active' : ''} ${nodeConnected ? 'is-connected' : ''} ${nodeDimmed ? 'is-dimmed' : ''}`;
          const nodeHandlers = interactive ? {
            onMouseEnter: () => onNodeHover?.(node.id),
            onMouseLeave: () => onNodeHover?.(null),
            onFocus: () => onNodeHover?.(node.id),
            onBlur: () => onNodeHover?.(null),
            onKeyDown: (event) => {
              if (event.key === 'Escape') onNodeHover?.(null);
            },
          } : {};
          return labelled ? (
            <g
              key={node.id}
              className={nodeClass}
              data-node={node.id}
              transform={`translate(${node.x} ${node.y})`}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `${node.label} entity` : undefined}
              {...nodeHandlers}
            >
              <rect x={-(node.width * node.scale) / 2} y={-(node.height * node.scale) / 2} width={node.width * node.scale} height={node.height * node.scale}/>
              <text textAnchor="middle" dominantBaseline="central">{node.label}</text>
            </g>
          ) : (
            <circle
              key={node.id}
              className={nodeClass}
              data-node={node.id}
              cx={node.x}
              cy={node.y}
              r={(node.radius || 5) * node.scale}
              {...nodeHandlers}
            />
          );
        })}
      </g>
    </svg>
  );
}

function Header({ active, onNavigate }) {
  const activeNavRef = useRef(null);

  useEffect(() => {
    activeNavRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active]);

  return (
    <header className="site-header">
      <button className="wordmark" onClick={() => onNavigate('mapbench')} aria-label="Go to MapBench introduction">
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


function ViewFrame({ id, children, className = '', rootRef }) {
  return <section ref={rootRef} className={`view ${className}`} id={id} aria-labelledby={`${id}-title`}>{children}</section>;
}

function ResearchCopy({ id, title, statement, children, action }) {
  return (
    <div className="research-copy">
      <h1 id={`${id}-title`} data-motion="heading">{title}</h1>
      <div className="copy-body" data-motion="text">
        {statement && <p>{statement}</p>}
        {children}
      </div>
      {action}
    </div>
  );
}

const FILES = ['app.ts', 'config.ts', 'tests.ts'];
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
    const buildToken = q(root, '.build-token');
    const agentToken = q(root, '.agent-token');
    const agentChip = q(root, '.agent-chip');
    const handoffPlus = q(root, '.handoff-plus');
    const handoffSlot = q(root, '.handoff-slot');
    const outcome = q(root, '.outcome-card');
    const completionTarget = q(root, '.completion-target');
    const completionMark = q(root, '.completion-mark');
    const generatorPort = q(root, '.generator-output');
    const structureCore = q(root, '[data-node="module"]');
    const outcomePort = q(root, '.outcome-port');
    const buildStart = point(track, generatorPort);
    const corePoint = point(track, structureCore);
    const slotPoint = point(track, handoffSlot);
    const route = routeRows.map((row) => point(track, q(row, '.tree-anchor')));

    gsap.set(rows, { opacity: 0.5, color: '#777777', backgroundColor: '#f5f5f5' });
    gsap.set(generator, { opacity: 0, y: -6, scale: 0.82, transformOrigin: '50% 50%', backgroundColor: '#f4f4f4', color: '#626262' });
    gsap.set([...structureNodes, ...structureEdges], { opacity: 0 });
    gsap.set(treeRows, { opacity: 0.38, backgroundColor: 'transparent', color: '#777777' });
    gsap.set([buildToken, agentToken], { opacity: 0 });
    gsap.set(buildToken, place(buildToken, buildStart));
    gsap.set(agentToken, place(agentToken, slotPoint));
    gsap.set([agentChip, handoffPlus, handoffSlot], { opacity: 0.45 });
    gsap.set(agentChip, { backgroundColor: '#f4f4f4', color: '#6a6a6a' });
    gsap.set(handoffSlot, { backgroundColor: 'transparent', color: '#8a8a8a' });
    gsap.set(outcome, { opacity: 0.58, backgroundColor: '#f4f4f4', color: '#5f5f5f' });
    gsap.set([completionTarget, completionMark], { opacity: 0.34 });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.4, defaults: { ease: 'power1.inOut' } });
    rows.forEach((row, index) => {
      tl.to(row, { opacity: 1, color: '#151515', backgroundColor: '#ededed', duration: 0.2 })
        .to(row, { backgroundColor: '#f5f5f5', duration: 0.12 });
    });
    tl.to(generator, { opacity: 1, y: 0, scale: 1, duration: 0.36, ease: 'back.out(1.9)' })
      .to(generator, { backgroundColor: '#dedede', color: '#202020', duration: 0.2 }, '<0.16')
      .set(buildToken, { opacity: 1 })
      .to(buildToken, { ...place(buildToken, corePoint), duration: 0.72 })
      .set(buildToken, { opacity: 0 })
      .to(structureNodes, { opacity: 1, duration: 0.16, stagger: 0.07 })
      .to(structureEdges, { opacity: 1, duration: 0.18, stagger: 0.07 })
      .to([agentChip, handoffPlus, handoffSlot], { opacity: 1, duration: 0.2 })
      .set(buildToken, { ...place(buildToken, corePoint), opacity: 1 })
      .to(buildToken, { ...place(buildToken, slotPoint), duration: 0.6 })
      .set(buildToken, { opacity: 0 })
      .to(handoffSlot, { backgroundColor: '#dedede', color: '#202020', duration: 0.18 })
      .to(agentChip, { backgroundColor: '#dedede', color: '#202020', duration: 0.18 }, '<')
      .to(treeRows, { opacity: 0.65, duration: 0.18, stagger: 0.035 })
      .set(agentToken, { ...place(agentToken, slotPoint), opacity: 1 })
      .to(agentToken, { ...place(agentToken, route[0]), duration: 0.42 });

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
      .set([agentChip, handoffPlus, handoffSlot], { opacity: 0.45 })
      .set(agentChip, { backgroundColor: '#f4f4f4', color: '#6a6a6a' })
      .set(handoffSlot, { backgroundColor: 'transparent', color: '#8a8a8a' })
      .set(generator, { opacity: 0, y: -6, scale: 0.82, backgroundColor: '#f4f4f4', color: '#626262' })
      .set(rows, { opacity: 0.5, color: '#777777', backgroundColor: '#f5f5f5' });
  });

  return (
    <figure className="research-figure sequence-figure map-sequence" data-motion="visual" ref={ref}>
      <figcaption className="sr-only">Repository files are processed programmatically into a deterministic build artifact, whose canonical structure is handed to an agent that traverses the codebase to task completion.</figcaption>
      <div className="sequence-track" aria-hidden="true">
        <section className="sequence-stage repository-stage">
          <header><p>Programmatic generation</p></header>
          <div className="repository-files">
            <span className="repository-folder"><code>project/</code></span>
            <div className="repository-file-list">
              {FILES.map((file) => <span className="repository-file" key={file}><code>{file}</code></span>)}
            </div>
          </div>
          <div className="generation-card"><i className="build-glyph"/><span>deterministic build</span><i className="ui-port generator-output"/></div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage structure-stage">
          <header><p>Canonical structure</p></header>
          <div className="structure-map">
            <RoutedGraph className="structure" nodes={STRUCTURE_NODES} edges={STRUCTURE_EDGES} width={176} height={136} rankdir="LR" ranksep={26} nodesep={18} labelled/>
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage navigation-stage">
          <header><p>Agent traversal</p></header>
          <div className="navigation-map">
            <div className="agent-handoff">
              <span className="handoff-chip agent-chip"><i className="agent-face"/><code>agent</code></span>
              <span className="handoff-plus">+</span>
              <span className="handoff-chip handoff-slot"><i className="build-glyph"/><code>build</code></span>
            </div>
            <div className="repository-tree">
              <span className="tree-row tree-root" data-route><i className="tree-anchor"/><code>project/</code></span>
              <span className="tree-row depth-1" data-route><i className="tree-guide">└─</i><i className="tree-anchor"/><code>src/</code></span>
              <span className="tree-row depth-2" data-route><i className="tree-guide">└─</i><i className="tree-anchor"/><code>app.ts</code></span>
              <span className="tree-row tree-symbol depth-3" data-route><i className="tree-guide">└─</i><i className="tree-anchor"/><code>resolveTarget()</code></span>
            </div>
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage outcome-stage">
          <header><p>Outcome</p></header>
          <div className="completion-trace">
            <div className="completion-target"><code>app.ts</code><span>resolveTarget()</span></div>
            <div className="outcome-card"><i className="ui-port outcome-port"/><i className="completion-mark"/><div><strong>Task completed</strong><span>target verified</span></div></div>
          </div>
        </section>
        <span className="motion-token build-token"><em>build</em></span>
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
            <button className="primary-pill" onClick={() => onNavigate('experiment')}>See how the benchmark works <span aria-hidden="true">→</span></button>
            <button className="secondary-action" onClick={() => onNavigate('results')}>View experiment results</button>
          </div>
        )}
      >
        <p>MapBench runs coding agents on the same tasks with and without these artifacts, and measures success, efficiency, and navigation behavior.</p>
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
  const [activeIrNode, setActiveIrNode] = useState(null);

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
      .set([...irNodes, ...irEdges], { opacity: 1 })
      .set(projections, { opacity: 0.48, backgroundColor: '#f4f4f4', color: '#666666' });
  });

  return (
    <figure className="research-figure sequence-figure cartograph-sequence" data-motion="visual" ref={ref}>
      <figcaption className="sr-only">Files enter Tree-sitter one at a time, form a canonical intermediate representation, then activate deterministic projections.</figcaption>
      <div className="sequence-track">
        <section className="sequence-stage source-stage" aria-hidden="true">
          <header><p>Source files</p></header>
          <div className="source-files">
            <span className="source-folder"><code>project/</code></span>
            <div className="source-file-list">
              {SOURCE_FILES.map((file) => <span className="source-file" key={file}><code>{file}</code><i className="ui-port stage-port"/></span>)}
            </div>
          </div>
        </section>
        <i className="track-line" aria-hidden="true"/>
        <section className="sequence-stage parser-stage" aria-hidden="true">
          <header><p>Parsing</p></header>
          <div className="tree-sitter-card">
            <i className="ui-port parser-input"/><i className="ui-port parser-output"/>
            <strong>Tree-sitter</strong>
            <div className="parser-pipeline">
              <div className="parser-source" aria-label="Source"><i className="parser-phase"/><i className="parser-phase"/></div>
              <span className="parser-action" aria-label="Parse"/>
              <div className="parser-ast" aria-label="Abstract syntax tree"><span className="parser-phase">root</span><span className="parser-phase">call</span></div>
            </div>
          </div>
        </section>
        <i className="track-line parser-to-ir" aria-hidden="true"/>
        <section className="sequence-stage ir-stage">
          <header><p>Canonical IR</p></header>
          <div className="canonical-ir">
            <RoutedGraph
              className="ir"
              nodes={IR_NODES}
              edges={IR_EDGES}
              width={164}
              height={150}
              rankdir="TB"
              ranksep={26}
              nodesep={20}
              labelled
              interactive
              activeNode={activeIrNode}
              onNodeHover={setActiveIrNode}
            />
          </div>

        </section>
        <i className="track-line" aria-hidden="true"/>
        <section className="sequence-stage projection-stage" aria-hidden="true">
          <header><p>Projections</p></header>
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

const DESIGN_PROJECTIONS = [
  {
    id: 'architecture',
    kicker: 'global',
    title: 'architecture.md',
    hypothesis: 'A short Markdown map of the repository. Agents form a mental model and find a place to start.',
    tradeoff: 'Highly compressed. Cross-cutting or task-relevant relationships can disappear.',
  },
  {
    id: 'skeleton',
    kicker: 'declarations',
    title: 'Skeleton',
    hypothesis: 'Mirrored files at declaration level. Locate modules, types, functions, and interfaces without reading bodies.',
    tradeoff: 'Behavior is stripped. Agents still need filesystem and search to reach implementations.',
  },
  {
    id: 'call-graph',
    kicker: 'execution',
    title: 'Call graph',
    hypothesis: 'Caller–callee edges. Trace execution across files without reconstructing paths by hand.',
    tradeoff: 'Static analysis is noisy and incomplete, and it lacks semantic context.',
  },
  {
    id: 'all',
    kicker: 'combined',
    title: 'All',
    hypothesis: 'The three views cover global, local, and execution structure together.',
    tradeoff: 'More views mean redundancy, tool-selection cost, and diminishing returns.',
  },
];

const BOUNDARY_COLUMNS = ['Architecture', 'Skeleton', 'Graph'];
const INFORMATION_BOUNDARY = [
  { label: 'Directory hierarchy', values: [false, true, false] },
  { label: 'Declarations', values: [false, true, false] },
  { label: 'Signatures', values: [false, true, false] },
  { label: 'Implementation', values: [false, false, false] },
  { label: 'Call edges', values: [false, false, true] },
  { label: 'Import edges', values: [false, false, true] },
  { label: 'Global overview', values: [true, false, false] },
  { label: 'Source-native format', values: [false, true, false] },
];

function CartographDesignLayer({ onBack, backRef }) {
  return (
    <div className="cartograph-design">
      <div className="cartograph-design-heading">
        <div>
          <button ref={backRef} className="text-action design-back" data-motion="heading" onClick={onBack} aria-label="Back to Cartograph overview">
            <span aria-hidden="true">←</span> Overview
          </button>
          <h1 id="cartograph-title" data-motion="heading">Design</h1>
        </div>
        <p data-motion="text">Each projection has a hypothesis — what it is for — and a tradeoff — what it conceals.</p>
      </div>
      <div className="design-projections">
        {DESIGN_PROJECTIONS.map((item) => (
          <article className="design-projection" key={item.id} data-motion="visual">
            <header>
              <span>{item.kicker}</span>
              <p>{item.title}</p>
            </header>
            <div className="design-fields">
              <section className="design-field">
                <h3>Hypothesis</h3>
                <p>{item.hypothesis}</p>
              </section>
              <section className="design-field">
                <h3>Tradeoff</h3>
                <p>{item.tradeoff}</p>
              </section>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function CartographBoundaryLayer({ onBack, backRef }) {
  return (
    <div className="cartograph-design">
      <div className="cartograph-design-heading">
        <div>
          <button ref={backRef} className="text-action design-back" data-motion="heading" onClick={onBack} aria-label="Back to Cartograph overview">
            <span aria-hidden="true">←</span> Overview
          </button>
          <h1 id="cartograph-title" data-motion="heading">Information boundary</h1>
        </div>
        <p data-motion="text">What Architecture, Skeleton, and Graph retain from source. Implementation stays in the files themselves.</p>
      </div>
      <section className="design-boundary" data-motion="visual">
        <div className="chart-key" aria-hidden="true">
          <span><i className="key-on"/>Retained</span>
          <span><i className="key-off"/>Omitted</span>
        </div>
        <div className="boundary-scroll">
          <table className="boundary-matrix">
            <caption className="sr-only">Information retained by Architecture, Skeleton, and Graph projections</caption>
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

    const heading = qa(root, '[data-motion="heading"]');
    const text = qa(root, '[data-motion="text"]');
    const visual = qa(root, '[data-motion="visual"]');
    const context = gsap.context(() => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reducedMotion) {
        gsap.set([root, ...heading, ...text, ...visual], { clearProps: 'opacity,transform' });
        return;
      }

      gsap.set(root, { opacity: 0, y: 6 });
      gsap.set([...heading, ...text, ...visual], { opacity: 0, y: 5 });
      gsap.timeline({ defaults: { ease: 'power1.out', overwrite: 'auto' } })
        .to(root, { opacity: 1, y: 0, duration: 0.2 })
        .to(heading, { opacity: 1, y: 0, duration: 0.2, stagger: 0.035 }, '-=0.08')
        .to(text, { opacity: 1, y: 0, duration: 0.2, stagger: 0.045 }, '-=0.08')
        .to(visual, { opacity: 1, y: 0, duration: 0.24, stagger: 0.05 }, '-=0.08');
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
      className={displayedLayer === 'overview' ? 'cartograph-view' : 'cartograph-design-view'}
      rootRef={layerRef}
    >
      {displayedLayer === 'overview' ? (
        <div className="two-column">
          <ResearchCopy
            id="cartograph"
            title="Cartograph"
            action={(
              <div className="cartograph-actions" data-motion="text">
                <button
                  ref={learnRef}
                  className="text-action"
                  onClick={(event) => showLayer('design', { focus: event.detail === 0, opener: 'learn' })}
                  aria-label="Learn about Cartograph projection design"
                >
                  Learn about design <span aria-hidden="true">→</span>
                </button>
                <button
                  ref={boundaryRef}
                  className="text-action"
                  onClick={(event) => showLayer('boundary', { focus: event.detail === 0, opener: 'boundary' })}
                  aria-label="View Cartograph information boundary"
                >
                  Information boundary <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          >
            <p>Cartograph parses source code with Tree-sitter into a canonical representation of modules, symbols, locations, and typed relationships.</p>
            <p>Its deterministic projections—architecture, skeleton, call graph, and Mermaid—are the artifacts MapBench tests.</p>
            <p className="language-tag">TypeScript, JavaScript, Python, Go, and Rust.</p>
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
          <header><p>Generate artifacts</p></header>
          <div className="benchmark-cartograph-card"><strong>Cartograph</strong><span>canonical IR</span></div>
          <div className="benchmark-artifacts">
            {BENCHMARK_ARTIFACTS.map((artifact) => <span className="benchmark-artifact" key={artifact}>{artifact}</span>)}
          </div>
        </section>
        <i className="benchmark-line"/>
        <section className="condition-list">
          <header><p>Representation</p></header>
          {CONDITIONS.map((condition) => <div className="condition-row" key={condition}><span>{condition}</span><i className="ui-port condition-port"/></div>)}
        </section>
        <i className="benchmark-line"/>
        <section className="run-bank">
          <header><p>Repeated runs</p></header>
          <div className="fixed-setup"><span>model</span><span>task</span><span>tools</span><span>repo</span><span>env</span></div>
          <div className="run-slots">
            {['01', '02', '03'].map((run) => <span className="run-slot" key={run}><i className="ui-dot run-target"/><b>{run}</b></span>)}
          </div>
        </section>
        <i className="benchmark-line"/>
        <section className="measure-stage">
          <header><p>Measures</p></header>
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

const EXPERIMENT_SECTIONS = [
  { id: 'questions', label: 'Questions' },
  { id: 'setup', label: 'Setup' },
  { id: 'models-harness', label: 'Models & Harness' },
];

function TechnicalDetails({ label, children }) {
  return (
    <details className="technical-details">
      <summary>{label}<span aria-hidden="true">+</span></summary>
      <div className="technical-details-body">{children}</div>
    </details>
  );
}

function ExperimentSection({ id, title, statement, children, visual, details }) {
  return (
    <section className="experiment-section two-column" id={id} aria-labelledby={`${id}-title`}>
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
  { id: 'RQ4', question: 'Do additional artifacts create context-management costs that offset their navigation benefits?' },
];

const SETUP_STAGES = ['Environment', 'Access', 'Trials', 'Outputs'];
const SETUP_STAGE_DURATION = 5600;
const OUTPUT_ACTIVITY_HEIGHTS = [14, 22, 10, 26, 18, 12, 30, 20, 15, 24, 11, 28, 19, 13, 23, 16];
const OUTPUT_MEASURES = [['tokens', 78], ['runtime', 55], ['cost', 40]];

function ModalMark() {
  return (
    <svg className="modal-mark" viewBox="0 0 1102 561" aria-hidden="true">
      <path fill="#cdf3ba" d="M225 0 550 190 330 205Z"/>
      <path fill="#57d058" d="M225 0 330 205 130 561 0 330Z"/>
      <path fill="#00a24c" d="M330 205 550 190 345 561 130 561Z"/>
      <path fill="#cdf3ba" d="M660 0 1102 330 768 300Z"/>
      <path fill="#57d058" d="M660 0 768 300 772 561 551 190Z"/>
      <path fill="#00a24c" d="M768 300 1102 330 1000 561 772 561Z"/>
    </svg>
  );
}

function AgentLoop({ className = '', reasoningDetail }) {
  return (
    <div className={`loop-orbit ${className}`} aria-hidden="true">
      <svg viewBox="0 0 360 360"><circle cx="180" cy="180" r="124"/></svg>
      <div className="loop-hub"><span>fixed harness</span><strong>Pi</strong></div>
      <div className="loop-state loop-state-reasoning"><strong>LM reasoning</strong>{reasoningDetail && <small className="loop-state-detail">{reasoningDetail}</small>}</div>
      <div className="loop-state loop-state-environment"><strong>Environment</strong></div>
      <div className="env-branch">
        <div className="env-branch-row"><i className="tree-guide">├─</i><div className="env-node"><strong>tools</strong><code>bash · read · grep</code></div></div>
        <div className="env-branch-row"><i className="tree-guide">└─</i><div className="env-node"><strong>artifact</strong><code>architecture.md</code></div></div>
      </div>
      <i className="motion-token loop-token"/>
    </div>
  );
}

function ResearchQuestions() {
  return (
    <ul className="research-questions" aria-label="Research questions">
      {RESEARCH_QUESTIONS.map((item) => (
        <li className="research-question" key={item.id}>{item.question}</li>
      ))}
    </ul>
  );
}

function ExperimentSetupFigure() {
  const ref = useRef(null);
  const [activeStage, setActiveStage] = useState(0);
  const [stageCycle, setStageCycle] = useState(0);
  const transitionRef = useRef(null);
  const targetStageRef = useRef(0);

  const chooseStage = useCallback((index) => {
    const validIndex = Math.min(SETUP_STAGES.length - 1, Math.max(0, index));
    targetStageRef.current = validIndex;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (validIndex === activeStage) setStageCycle((cycle) => cycle + 1);
      else setActiveStage(validIndex);
      return;
    }
    if (transitionRef.current) {
      transitionRef.current.kill();
      transitionRef.current = null;
    }
    if (validIndex === activeStage) {
      setStageCycle((cycle) => cycle + 1);
      return;
    }

    const currentPhase = q(ref.current, `.setup-phase[data-stage="${activeStage}"]`);
    if (!currentPhase) {
      setActiveStage(validIndex);
      return;
    }

    transitionRef.current = gsap.to(currentPhase, {
      autoAlpha: 0,
      y: -6,
      duration: 0.28,
      ease: 'power1.inOut',
      overwrite: true,
      onComplete: () => {
        transitionRef.current = null;
        setActiveStage(targetStageRef.current);
      },
    });
  }, [activeStage]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setTimeout(() => chooseStage((activeStage + 1) % SETUP_STAGES.length), SETUP_STAGE_DURATION);
    return () => window.clearTimeout(timer);
  }, [activeStage, chooseStage, stageCycle]);

  useEffect(() => () => transitionRef.current?.kill(), []);

  useEffect(() => {
    const progress = q(ref.current, '.setup-progress');
    const activeControl = qa(progress, 'button')[activeStage];
    if (!progress || !activeControl || progress.scrollWidth <= progress.clientWidth) return;
    const targetLeft = activeControl.offsetLeft - (progress.clientWidth - activeControl.offsetWidth) / 2;
    progress.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [activeStage]);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const phase = q(root, `.setup-phase[data-stage="${activeStage}"]`);
    const context = gsap.context(() => {
      transitionRef.current?.kill();
      transitionRef.current = null;
      gsap.killTweensOf(qa(root, '.setup-phase, .setup-phase *'));
      gsap.set(qa(root, '.setup-phase'), { autoAlpha: 0, y: 7, pointerEvents: 'none' });
      gsap.set(phase, { pointerEvents: 'auto', zIndex: 1 });
      gsap.fromTo(q(root, '.setup-countdown-fill'), { scaleX: 0 }, { scaleX: 1, duration: SETUP_STAGE_DURATION / 1000, ease: 'none' });
      const tl = gsap.timeline({ defaults: { ease: 'power1.inOut' } });
      tl.to(phase, { autoAlpha: 1, y: 0, duration: 0.3 })
        .fromTo(q(phase, 'header'), { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.28 }, '-=0.12');

      if (activeStage === 0) {
        const choices = qa(phase, '.condition-choice');
        tl.fromTo(choices, { opacity: 0, y: 4 }, { opacity: 0.38, y: 0, duration: 0.26, stagger: 0.1 })
          .to(choices[choices.length - 1], { opacity: 1, color: '#202020', duration: 0.3 })
          .to(q(choices[choices.length - 1], 'i'), { backgroundColor: '#151515', duration: 0.22 }, '<');
      } else if (activeStage === 1) {
        const workspace = q(phase, '.access-workspace');
        const baseline = qa(phase, '.access-workspace code:not(.access-reveal)');
        const reveals = qa(phase, '.access-reveal');
        tl.fromTo(workspace, { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.3 })
          .fromTo(baseline, { opacity: 0 }, { opacity: 1, duration: 0.22, stagger: 0.1 })
          .fromTo(reveals, { opacity: 0, x: -5 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.26 }, '+=0.25');
      } else if (activeStage === 2) {
        const runtime = q(phase, '.trial-runtime');
        const slots = qa(phase, '.trial-slot');
        tl.fromTo(runtime, { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.32 })
          .fromTo(slots, { opacity: 0.2 }, { opacity: 1, duration: 0.25, stagger: 0.16 });
        slots.forEach((slot, slotIndex) => {
          const status = q(slot, '.trial-status');
          const bars = qa(slot, '.trial-activity i');
          const widths = [[0.86, 0.58, 0.72], [0.64, 0.9, 0.5], [0.76, 0.52, 0.84]][slotIndex % 3];
          gsap.to(status, { opacity: 0.3, duration: 0.6, repeat: -1, yoyo: true, ease: 'power1.inOut', delay: slotIndex * 0.2 });
          const work = gsap.timeline({ repeat: -1, repeatDelay: 0.5, delay: 0.55 + slotIndex * 0.35 });
          bars.forEach((bar, barIndex) => {
            work.fromTo(bar, { scaleX: 0, opacity: 1 }, { scaleX: widths[barIndex], duration: 0.55, ease: 'power1.inOut' }, barIndex * 0.4);
          });
          work.to(bars, { opacity: 0, duration: 0.28, stagger: 0.05 }, '+=0.55');
        });
      } else {
        const activity = qa(phase, '.output-activity-svg rect');
        const meters = qa(phase, '.output-meter b');
        const result = q(phase, '.output-result-chip');
        tl.fromTo(activity, { opacity: 0, scaleY: 0 }, { opacity: 1, scaleY: 1, duration: 0.25, stagger: 0.04 })
          .fromTo(meters, { scaleX: 0 }, { scaleX: 1, duration: 0.4, stagger: 0.14, ease: 'power1.out' })
          .fromTo(result, { opacity: 0, y: 3 }, { opacity: 1, y: 0, duration: 0.28 }, '-=0.1');
      }
    }, root);
    return () => context.revert();
  }, [activeStage, stageCycle]);

  const handleStageKeyDown = (event, index) => {
    const keyOffset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const targetIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? SETUP_STAGES.length - 1
        : keyOffset
          ? (index + keyOffset + SETUP_STAGES.length) % SETUP_STAGES.length
          : null;
    if (targetIndex === null) return;
    event.preventDefault();
    chooseStage(targetIndex);
    qa(ref.current, '.setup-progress button')[targetIndex]?.focus();
  };

  return (
    <figure className="method-figure setup-figure" ref={ref}>
      <figcaption className="sr-only">An environment condition determines artifact access, launches three independent Modal sandboxes, and captures each trial's trajectory and measurements.</figcaption>
      <div className="setup-progress" role="tablist" aria-label="Experiment sequence">
        {SETUP_STAGES.map((label, index) => (
          <button key={label} id={`setup-stage-tab-${index}`} type="button" role="tab" aria-controls={`setup-stage-panel-${index}`} aria-selected={activeStage === index} tabIndex={activeStage === index ? 0 : -1} className={activeStage === index ? 'active' : ''} onClick={() => chooseStage(index)} onKeyDown={(event) => handleStageKeyDown(event, index)}>
            <i><em className={activeStage === index ? 'setup-countdown-fill' : ''}/></i><span>{label}</span>
          </button>
        ))}
      </div>
      <div className="setup-phase-stack">
        <section id="setup-stage-panel-0" aria-labelledby="setup-stage-tab-0" aria-hidden={activeStage !== 0} className={`setup-phase configure-phase ${activeStage === 0 ? 'active' : ''}`} data-stage="0" role="tabpanel">
          <header><strong>Choose the environment</strong></header>
          <div className="condition-choice-row" aria-hidden="true">{['Control', 'Single artifact', 'Combined'].map((condition) => <span className="condition-choice" key={condition}><i/>{condition}</span>)}</div>
          <p>Control, a single-artifact ablation, or Combined — only this choice varies.</p>
        </section>
        <section id="setup-stage-panel-1" aria-labelledby="setup-stage-tab-1" aria-hidden={activeStage !== 1} className={`setup-phase access-phase ${activeStage === 1 ? 'active' : ''}`} data-stage="1" role="tabpanel">
          <header><strong>The workspace exposes only what Pi can access</strong></header>
          <div className="access-motion" aria-hidden="true">
            <div className="access-workspace">
              <span>Workspace</span>
              <code>repo/</code>
              <code className="access-nested">src/</code>
              <code className="access-reveal">architecture.md</code>
              <code className="access-reveal">skeleton/</code>
              <code className="access-reveal">callgraph.json</code>
            </div>
          </div>
          <p>Control receives no artifacts; ablations receive one; Combined receives all three.</p>
        </section>
        <section id="setup-stage-panel-2" aria-labelledby="setup-stage-tab-2" aria-hidden={activeStage !== 2} className={`setup-phase launch-phase ${activeStage === 2 ? 'active' : ''}`} data-stage="2" role="tabpanel">
          <header><strong>One fixed task environment, repeated independently</strong></header>
          <div className="trial-runtime" aria-hidden="true">
            <div className="trial-runtime-header"><span className="modal-brand"><ModalMark/>Modal</span></div>
            <div className="trial-slots">
              {['Trial A', 'Trial B', 'Trial C'].map((trial) => (
                <div className="trial-slot" key={trial}>
                  <div className="trial-slot-top"><span>{trial}</span><i className="trial-status"/></div>
                  <div className="trial-activity"><i/><i/><i/></div>
                </div>
              ))}
            </div>
          </div>
          <p>Three trials per task per condition, isolated and run in parallel.</p>
        </section>
        <section id="setup-stage-panel-3" aria-labelledby="setup-stage-tab-3" aria-hidden={activeStage !== 3} className={`setup-phase outputs-phase ${activeStage === 3 ? 'active' : ''}`} data-stage="3" role="tabpanel">
          <header><strong>Every trial produces outcome and behavioral evidence</strong></header>
          <div className="output-panel" aria-hidden="true">
            <div className="output-block output-activity-block">
              <span className="output-kicker">tool activity</span>
              <svg className="output-activity-svg" viewBox="0 0 236 34">
                {OUTPUT_ACTIVITY_HEIGHTS.map((barHeight, index) => (
                  <rect key={index} x={index * 15} y={34 - barHeight} width="7" height={barHeight}/>
                ))}
              </svg>
            </div>
            <div className="output-block output-measures">
              <span className="output-kicker">measurements</span>
              {OUTPUT_MEASURES.map(([label, percent]) => (
                <div className="output-measure" key={label}>
                  <em>{label}</em>
                  <i className="output-meter"><b style={{ width: `${percent}%` }}/></i>
                </div>
              ))}
            </div>
            <div className="output-block output-result-block">
              <span className="output-kicker">result</span>
              <span className="output-result-chip">passed</span>
            </div>
          </div>
          <p>Each trial retains its complete trajectory, result, usage, and runtime.</p>
        </section>
      </div>
    </figure>
  );
}

const FROZEN_MODELS = [
  { short: 'GPT-5.6 Luna', role: 'primary' },
  { short: 'Claude Opus 5', role: 'replication' },
  { short: 'DeepSeek V4 Flash', role: 'cost-efficient replication' },
];

function ModelsHarnessFigure() {
  const ref = useRef(null);

  useCausalTimeline(ref, (root) => {
    const modelRows = qa(root, '.model-row');
    const orbit = q(root, '.loop-orbit');
    const reasoning = q(root, '.loop-state-reasoning');
    const environment = q(root, '.loop-state-environment');
    const modelLabel = q(reasoning, '.loop-state-detail');
    const token = q(root, '.loop-token');
    const branchRows = qa(root, '.env-branch-row');
    const orbitState = { angle: 180 };
    const positionToken = () => {
      const size = orbit.clientWidth;
      const radius = size * (124 / 360);
      const radians = orbitState.angle * (Math.PI / 180);
      gsap.set(token, {
        x: size / 2 + Math.cos(radians) * radius - token.offsetWidth / 2,
        y: size / 2 + Math.sin(radians) * radius - token.offsetHeight / 2,
      });
    };

    gsap.set(modelRows, { opacity: 0.45, backgroundColor: '#f5f5f5', color: '#777777' });
    gsap.set(environment, { backgroundColor: '#f5f5f5', color: '#777777' });
    gsap.set(branchRows, { opacity: 0, y: -5 });
    gsap.set(token, { opacity: 1 });
    positionToken();

    const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'power1.inOut' } });
    FROZEN_MODELS.forEach((configuration, index) => {
      tl.set(modelLabel, { textContent: configuration.short })
        .to(modelRows, { opacity: 0.45, backgroundColor: '#f5f5f5', color: '#777777', duration: 0.16 })
        .to(modelRows[index], { opacity: 1, backgroundColor: '#dedede', color: '#202020', duration: 0.2 }, '<')
        .to(reasoning, { backgroundColor: '#dedede', color: '#202020', duration: 0.2 }, '<')
        .to(environment, { backgroundColor: '#f5f5f5', color: '#777777', duration: 0.2 }, '<')
        .to({}, { duration: 0.6 })
        .to(orbitState, { angle: '+=180', duration: 1.7, ease: 'none', onUpdate: positionToken })
        .to(environment, { backgroundColor: '#dedede', color: '#202020', duration: 0.18 }, '-=0.12')
        .to(reasoning, { backgroundColor: '#f5f5f5', color: '#777777', duration: 0.18 }, '<')
        .to(branchRows, { opacity: 1, y: 0, duration: 0.24, stagger: 0.14 })
        .to({}, { duration: 1.5 })
        .to(branchRows, { opacity: 0, y: -5, duration: 0.2 })
        .to(orbitState, { angle: '+=180', duration: 1.7, ease: 'none', onUpdate: positionToken }, '<0.1')
        .to(reasoning, { backgroundColor: '#dedede', color: '#202020', duration: 0.18 }, '-=0.12')
        .to(environment, { backgroundColor: '#f5f5f5', color: '#777777', duration: 0.18 }, '<')
        .to({}, { duration: 0.4 });
    });
  });

  return (
    <figure className="method-figure models-harness-figure" ref={ref}>
      <figcaption className="sr-only">Three frozen model configurations take turns driving the same fixed Pi agent loop. In each cycle the model reasons, then the environment responds: it exposes a compact tool set (bash, read, grep) and the structural artifact, branching like a tree before the loop returns to the model.</figcaption>
      <div className="model-stack" aria-hidden="true">
        <span className="stack-label">frozen models</span>
        {FROZEN_MODELS.map((configuration) => (
          <div className="model-row" key={configuration.short}><strong>{configuration.short}</strong><small>{configuration.role}</small></div>
        ))}
      </div>
      <i className="model-feed-line" aria-hidden="true"/>
      <AgentLoop reasoningDetail={FROZEN_MODELS[0].short}/>
    </figure>
  );
}

function ExperimentView() {
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
    <ViewFrame id="experiment" className="experiment-view">
      <div className="experiment-hero two-column">
        <ResearchCopy id="experiment" title="Experiment" statement="Do structural representations change how coding agents understand and work through repositories?">
          <p>Cartograph artifacts define the condition. Each condition runs repeatedly under fixed controls and is evaluated through outcomes and complete agent traces.</p>
          <p className="measure-summary">Artifacts → Condition → Repeated runs → Measurements</p>
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
          title="Questions"
          statement="Four questions define the comparison and the evidence collected from every run."
          visual={<ResearchQuestions/>}
        />

        <ExperimentSection
          id="setup"
          title="Setup"
          statement="Only the structural-artifact condition changes; the task, repository, model, harness, and limits stay frozen."
          visual={<ExperimentSetupFigure/>}
          details={<TechnicalDetails label="Condition specification"><p><strong>Control:</strong> regular repository code with no generated structural artifact.</p><p><strong>Individual ablations:</strong> Architecture, Skeleton, and Call graph supplied one at a time.</p><p><strong>Combined:</strong> all three Cartograph artifacts supplied together.</p><p>Task, repository commit, model, Pi harness, prompt and tools, limits, environment, repetition count, ordering, and randomization are frozen before execution.</p></TechnicalDetails>}
        >
          <p>The workspace exposes only what the condition permits. Modal executes three isolated trials per task per condition, in parallel.</p>
        </ExperimentSection>

        <ExperimentSection
          id="models-harness"
          title="Models & Harness"
          statement="The agent loop alternates between two states: the model reasons, the environment responds."
          visual={<ModelsHarnessFigure/>}
          details={<TechnicalDetails label="Reproduction details"><dl className="reproduction-list"><div><dt>GPT-5.6 Luna</dt><dd>openrouter, openai/gpt-5.6-luna, canonical 20260709, max effort, 1,050,000 context</dd></div><div><dt>Claude Opus 5</dt><dd>openrouter, anthropic/claude-opus-5, canonical 20260723, medium effort, 1,000,000 context</dd></div><div><dt>DeepSeek V4 Flash</dt><dd>openrouter, deepseek/deepseek-v4-flash-0731, canonical 20260731, max effort, 1,048,576 context</dd></div><div><dt>Harness</dt><dd>Pi 0.84.1, fresh process, no session resume, ambient context disabled</dd></div><div><dt>DeepSWE source</dt><dd>v1.1, revision 435ee89ec2f2e2289f33b0da4f992f0b7b7266b9</dd></div><div><dt>Run policy</dt><dd>3 repetitions, targeted 5-condition matrix, identical tools, prompt suffix, limits, and randomization</dd></div><div><dt>Timeout</dt><dd>5,400 seconds for DeepSWE unless task environment is lower</dd></div><div><dt>Modal</dt><dd>SDK 0.9.0, app mapbench, fresh no-network task image, placement and concurrency recorded</dd></div><div><dt>Provenance</dt><dd>prompt/config hashes, repository commit, image, model metadata, complete JSONL + normalized trajectory</dd></div></dl></TechnicalDetails>}
        >
          <p>Models swap while the Pi harness stays fixed: <strong>GPT-5.6 Luna</strong> (primary), <strong>Claude Opus 5</strong> (replication), and <strong>DeepSeek V4 Flash</strong> (cost-efficient replication).</p>
        </ExperimentSection>
      </div>
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

const EXPERIMENT_TASK = 'Runner verification';

function ObservationDetail({ observation, metric }) {
  if (!observation) {
    return null;
  }

  const { condition, run } = observation;
  const score = run.hiddenGrader.score / run.hiddenGrader.maxScore;
  return (
    <aside className="observation-detail" aria-live="polite" aria-label={`${condition.label}, run ${formatRun(run.run)} details`}>
      <div className="observation-title-row">
        <h2>{condition.label} <span>/ {formatRun(run.run)}</span></h2>
        <span className={`observation-status ${run.status}`}>{run.status}</span>
      </div>
      <div className="observation-task">
        <span>Task</span>
        <strong>{EXPERIMENT_TASK}</strong>
      </div>
      <div className="observation-primary">
        <span>{metric.detailLabel}</span>
        <strong>{metric.format(metric.value(run))}</strong>
      </div>
      <dl className="observation-grid">
        <div><dt>Score</dt><dd>{Math.round(score * 100)}%</dd></div>
        <div><dt>Tokens</dt><dd>{formatTokens(run.tokens.total)}</dd></div>
        <div><dt>Runtime</dt><dd>{formatDuration(run.durationMs)}</dd></div>
        <div><dt>Cost</dt><dd>${run.estimatedCostUsd.toFixed(2)}</dd></div>
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

function ResultsView() {
  return (
    <ViewFrame id="results" className="experiments-view">
      <div className="experiments-heading">
        <h1 id="results-title" data-motion="heading">Results</h1>
        <p data-motion="text">Controlled runs across repository representations.</p>
      </div>
      <ExperimentsFigure/>
    </ViewFrame>
  );
}

const FUTURE_GROUPS = [
  {
    label: 'Validate',
    items: [
      { title: 'Broader evidence', copy: 'More models, harnesses, repositories, task families, and larger repeated samples.' },
    ],
  },
  {
    label: 'Investigate',
    items: [
      { title: 'Representation value', copy: 'Which artifacts, relationships, and formats actually change agent behavior.' },
      { title: 'Retrieval and overhead', copy: 'Eager context versus selective retrieval, and the cost of carrying artifacts.' },
    ],
  },
  {
    label: 'Build',
    items: [
      { title: 'New structural views', copy: 'Representations suggested by trial trajectories and failure analysis.' },
    ],
  },
];

function FutureFigure() {
  return (
    <section className="future-roadmap" data-motion="visual" aria-label="Future research roadmap">
      {FUTURE_GROUPS.map((group) => (
        <section className="future-group" key={group.label} aria-labelledby={`future-${group.label.toLowerCase()}-title`}>
          <div className="future-rail" aria-hidden="true"><i/></div>
          <h2 id={`future-${group.label.toLowerCase()}-title`}>{group.label}</h2>
          <div className="future-group-items">
            {group.items.map((item) => (
              <article className="future-item" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

function FutureView() {
  return (
    <ViewFrame id="future" className="future-view">
      <div className="two-column">
        <ResearchCopy
          id="future"
          title="Future Work"
          statement="The first study establishes a controlled baseline."
        >
          <p>Follow-up work broadens the evidence, investigates which representations matter, and builds the views the trajectories suggest.</p>
        </ResearchCopy>
        <FutureFigure/>
      </div>
    </ViewFrame>
  );
}

function App() {
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
    </div>
  );
}

const appRoot = globalThis.__mapbenchRoot || createRoot(document.getElementById('root'));
globalThis.__mapbenchRoot = appRoot;
appRoot.render(<App/>);
