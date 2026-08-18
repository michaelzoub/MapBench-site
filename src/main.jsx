import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
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

function MapExperimentFigure() {
  const ref = useRef(null);

  useCausalTimeline(ref, (root) => {
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
    const sourceStart = point(root, q(rows[2], '.stage-port'));
    const corePoint = point(root, structureCore);
    const route = navNodes.map((node) => point(root, node));

    gsap.set(rows, { opacity: 0.38, color: '#777777' });
    gsap.set([...structureNodes, ...structureEdges, ...navEdges], { opacity: 0 });
    gsap.set(navNodes, { opacity: 0.2, backgroundColor: '#cfcfcf' });
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
        .to(navNodes[index], { backgroundColor: '#151515', duration: 0.12 }, '<');
    });

    tl.to(agentToken, { ...place(agentToken, point(root, outcomePort)), duration: 0.62 })
      .set(agentToken, { opacity: 0 })
      .to(outcome, { opacity: 1, backgroundColor: '#151515', color: '#ffffff', duration: 0.28 })
      .to({}, { duration: 1.15 })
      .to(outcome, { opacity: 0.22, backgroundColor: '#f1f1f1', color: '#777777', duration: 0.2 })
      .set([...structureNodes, ...structureEdges, ...navEdges], { opacity: 0 })
      .set(navNodes, { opacity: 0.2, backgroundColor: '#cfcfcf' })
      .set(rows, { opacity: 0.38, color: '#777777' });
  });

  return (
    <figure className="research-figure sequence-figure map-sequence" ref={ref}>
      <figcaption className="sr-only">Repository source becomes structure, guides a deliberate navigation path, and lands in a verified outcome.</figcaption>
      <div className="sequence-track" aria-hidden="true">
        <section className="sequence-stage repository-stage">
          <header><span>01</span><p>Repository</p></header>
          <div className="repository-files">
            {FILES.map((file) => <span className="repository-file" key={file}><code>{file}</code><i className="stage-port"/></span>)}
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage structure-stage">
          <header><span>02</span><p>Structure</p></header>
          <div className="structure-map">
            <i className="structure-edge edge-a"/><i className="structure-edge edge-b"/><i className="structure-edge edge-c"/><i className="structure-edge edge-d"/>
            <b className="structure-node node-a"/><b className="structure-node node-b"/><b className="structure-node core"/><b className="structure-node node-c"/><b className="structure-node node-d"/>
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage navigation-stage">
          <header><span>03</span><p>Navigation</p></header>
          <div className="navigation-map">
            <i className="nav-edge nav-edge-a"/><i className="nav-edge nav-edge-b"/><i className="nav-edge nav-edge-c"/>
            <b className="nav-node nav-a"/><b className="nav-node nav-b"/><b className="nav-node nav-c"/><b className="nav-node nav-d"/>
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage outcome-stage">
          <header><span>04</span><p>Outcome</p></header>
          <div className="verified-card"><i className="outcome-port"/><strong>Verified</strong><span>correctness</span></div>
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
const IR_NODES = ['module', 'symbol', 'call', 'import', 'location', 'type'];

function CartographFigure() {
  const ref = useRef(null);

  useCausalTimeline(ref, (root) => {
    const files = qa(root, '.source-file');
    const fileTokens = qa(root, '.file-token');
    const treeSitter = q(root, '.tree-sitter-card');
    const parserPort = q(root, '.parser-port');
    const irNodes = qa(root, '.ir-node');
    const irEdges = qa(root, '.ir-edge');
    const irPort = q(root, '.ir-port');
    const projections = qa(root, '.projection-row');
    const projectionTokens = qa(root, '.projection-token');
    const parserPoint = point(root, parserPort);

    gsap.set(files, { opacity: 0.38, color: '#777777' });
    gsap.set(fileTokens, { opacity: 0 });
    gsap.set(treeSitter, { backgroundColor: '#f1f1f1', color: '#686868' });
    gsap.set([...irNodes, ...irEdges], { opacity: 0 });
    gsap.set(projections, { opacity: 0.26, backgroundColor: '#f1f1f1', color: '#777777' });
    gsap.set(projectionTokens, { opacity: 0 });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.35, defaults: { ease: 'power2.inOut' } });
    files.forEach((file, index) => {
      const start = point(root, q(file, '.stage-port'));
      gsap.set(fileTokens[index], place(fileTokens[index], start));
      tl.to(file, { opacity: 1, color: '#151515', duration: 0.18 })
        .set(fileTokens[index], { opacity: 1 })
        .to(fileTokens[index], { ...place(fileTokens[index], parserPoint), duration: 0.58 })
        .set(fileTokens[index], { opacity: 0 });
    });

    tl.to(treeSitter, { backgroundColor: '#151515', color: '#ffffff', duration: 0.24 })
      .to(q(root, '.parser-to-ir'), { backgroundColor: '#8e8e8e', duration: 0.2 })
      .to(irNodes, { opacity: 1, duration: 0.18, stagger: 0.09 })
      .to(irEdges, { opacity: 1, duration: 0.2, stagger: 0.08 });

    projections.forEach((projection, index) => {
      const start = point(root, irPort);
      const end = point(root, q(projection, '.projection-port'));
      gsap.set(projectionTokens[index], place(projectionTokens[index], start));
      tl.set(projectionTokens[index], { opacity: 1 })
        .to(projectionTokens[index], { ...place(projectionTokens[index], end), duration: 0.58 })
        .set(projectionTokens[index], { opacity: 0 })
        .to(projection, { opacity: 1, backgroundColor: '#151515', color: '#ffffff', duration: 0.18 });
    });

    tl.to({}, { duration: 1.15 })
      .set(fileTokens, { opacity: 0 })
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
            {SOURCE_FILES.map((file) => <span className="source-file" key={file}><code>{file}</code><i className="stage-port"/></span>)}
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage parser-stage">
          <header><span>02</span><p>Parse</p></header>
          <div className="tree-sitter-card"><i className="parser-port"/><strong>Tree-sitter</strong><span>typed parse</span></div>
        </section>
        <i className="track-line parser-to-ir"/>
        <section className="sequence-stage ir-stage">
          <header><span>03</span><p>Canonical IR</p></header>
          <div className="canonical-ir">
            <i className="ir-edge ir-edge-a"/><i className="ir-edge ir-edge-b"/><i className="ir-edge ir-edge-c"/><i className="ir-edge ir-edge-d"/><i className="ir-edge ir-edge-e"/>
            {IR_NODES.map((node, index) => <b className={`ir-node ir-node-${index + 1}`} key={node}>{node}</b>)}
            <i className="ir-port"/>
          </div>
        </section>
        <i className="track-line"/>
        <section className="sequence-stage projection-stage">
          <header><span>04</span><p>Projections</p></header>
          <div className="projection-list">
            {PROJECTIONS.map((item) => <span className="projection-row" key={item}><i className="projection-port"/>{item}</span>)}
          </div>
        </section>
        {SOURCE_FILES.map((file) => <span className="motion-token file-token" key={file}><em>file</em></span>)}
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
const FIXED = ['model', 'harness', 'task', 'environment'];

function BenchmarkFigure() {
  const ref = useRef(null);

  useCausalTimeline(ref, (root) => {
    const conditions = qa(root, '.condition-row');
    const slots = qa(root, '.run-slot');
    const tokens = qa(root, '.run-token');
    const verifier = q(root, '.verifier-card');

    gsap.set(conditions, { opacity: 0.36, backgroundColor: '#f1f1f1', color: '#6f6f6f' });
    gsap.set(slots, { opacity: 0.24, backgroundColor: '#f1f1f1', color: '#777777' });
    gsap.set(tokens, { opacity: 0 });
    gsap.set(verifier, { opacity: 0.3, backgroundColor: '#f1f1f1', color: '#777777' });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.1, defaults: { ease: 'power2.inOut' } });
    conditions.forEach((condition) => {
      const source = point(root, q(condition, '.condition-port'));
      tl.to(condition, { opacity: 1, backgroundColor: '#151515', color: '#ffffff', duration: 0.2 });

      tokens.forEach((token, index) => {
        const destination = point(root, slots[index]);
        tl.set(token, { ...place(token, source), opacity: 1 })
          .to(token, { ...place(token, destination), duration: 0.62 })
          .set(token, { opacity: 0 })
          .to(slots[index], { opacity: 1, backgroundColor: '#dedede', color: '#151515', duration: 0.16 });
      });

      tl.to(verifier, { opacity: 1, backgroundColor: '#151515', color: '#ffffff', duration: 0.22 })
        .to({}, { duration: 0.6 })
        .to(condition, { opacity: 0.36, backgroundColor: '#f1f1f1', color: '#6f6f6f', duration: 0.16 })
        .set(slots, { opacity: 0.24, backgroundColor: '#f1f1f1', color: '#777777' })
        .set(verifier, { opacity: 0.3, backgroundColor: '#f1f1f1', color: '#777777' });
    });
  });

  return (
    <figure className="research-figure benchmark-sequence" ref={ref}>
      <figcaption className="sr-only">Model, harness, task, and environment remain fixed while each representation completes runs 01, 02, and 03 in order.</figcaption>
      <div className="fixed-strip" aria-hidden="true">
        <span className="fixed-label">Fixed</span>
        {FIXED.map((item) => <span className="fixed-item" key={item}><i/>{item}</span>)}
      </div>
      <div className="benchmark-track" aria-hidden="true">
        <section className="condition-list">
          <header><span>Variable</span><p>Representation</p></header>
          {CONDITIONS.map((condition) => <div className="condition-row" key={condition}>{condition}<i className="condition-port"/></div>)}
        </section>
        <i className="benchmark-line"/>
        <section className="run-bank">
          <header><span>Sequential</span><p>Runs</p></header>
          <div className="run-slots"><span className="run-slot">01</span><span className="run-slot">02</span><span className="run-slot">03</span></div>
        </section>
        <i className="benchmark-line"/>
        <section className="verify-stage">
          <header><span>Held-out</span><p>Outcome</p></header>
          <div className="verifier-card"><i/>Verified</div>
        </section>
        {['01', '02', '03'].map((run) => <span className="motion-token run-token" key={run}><em>{run}</em></span>)}
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

createRoot(document.getElementById('root')).render(<App/>);
