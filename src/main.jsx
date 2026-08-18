import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const GITHUB_URL = 'https://github.com/michaelzoub/MapBench';
const VIEWS = [
  { id: 'mapbench', label: 'MapBench' },
  { id: 'cartograph', label: 'Cartograph' },
  { id: 'benchmark', label: 'Benchmark' },
  { id: 'experiments', label: 'Experiments' },
];

function Mark() {
  return <span className="brand-symbol" aria-hidden="true"><i/><i/><b/></span>;
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
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub ↗</a>
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
  return (
    <figure className="research-figure map-figure">
      <figcaption className="sr-only">Repository source becomes a structural map that guides agent navigation and produces a measured result.</figcaption>
      <div className="map-flow" aria-hidden="true">
        <div className="map-step repository-step">
          <p>Repository</p>
          <div className="file-list">{FILES.map((file, index) => <span key={file} style={{ '--i': index }}>{file}</span>)}</div>
        </div>
        <div className="map-step structure-step">
          <p>Structure</p>
          <div className="structure-field">
            {[0,1,2,3,4,5,6,7,8].map((node) => <i key={node} style={{ '--i': node }}/>) }
          </div>
        </div>
        <div className="map-step navigation-step">
          <p>Navigation</p>
          <div className="navigation-field">
            {[0,1,2,3,4].map((node) => <i key={node} style={{ '--i': node }}/>) }
            <b/>
          </div>
        </div>
        <div className="map-step outcome-step">
          <p>Outcome</p>
          <div className="outcome-value"><strong>verified</strong><span>correctness</span></div>
        </div>
        <span className="signal signal-one"/><span className="signal signal-two"/><span className="signal signal-three"/>
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
        action={<button className="text-action" onClick={() => onNavigate('benchmark')}>See the benchmark <span aria-hidden="true">→</span></button>}
      >
        <p>MapBench compares agent performance with and without deterministic structural views of the same source code.</p>
        <p>The model, task, commit, harness, and environment stay fixed. Only the representation changes.</p>
      </ResearchCopy>
      <MapExperimentFigure/>
    </ViewFrame>
  );
}

const SOURCE_FILES = ['runner.ts', 'parser.ts', 'workspace.ts'];
const PROJECTIONS = ['Architecture', 'Skeleton', 'Graph', 'Mermaid'];

function CartographFigure() {
  return (
    <figure className="research-figure cartograph-figure">
      <figcaption className="sr-only">Source files are parsed into one canonical representation and several deterministic projections.</figcaption>
      <div className="cartograph-flow" aria-hidden="true">
        <div className="cart-stage source-stage">
          <p>Source files</p>
          <div>{SOURCE_FILES.map((file, index) => <span key={file} style={{ '--i': index }}>{file}<i/></span>)}</div>
        </div>
        <div className="cart-stage parse-stage">
          <p>Parse</p>
          <div className="parse-cloud">{[0,1,2,3,4,5,6].map((dot) => <i key={dot} style={{ '--i': dot }}/>)}</div>
        </div>
        <div className="cart-stage canonical-stage">
          <p>Canonical structure</p>
          <div className="canonical-field">
            {['module','symbol','call','import','location','type'].map((item, index) => <span key={item} style={{ '--i': index }}>{item}</span>)}
          </div>
        </div>
        <div className="cart-stage projections-stage">
          <p>Projections</p>
          <div>{PROJECTIONS.map((item, index) => <span key={item} style={{ '--i': index }}>{item}</span>)}</div>
        </div>
        <b className="cart-pulse pulse-a"/><b className="cart-pulse pulse-b"/><b className="cart-pulse pulse-c"/>
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
const FIXED = ['model', 'harness', 'task', 'prompt', 'commit', 'sandbox'];

function BenchmarkFigure() {
  return (
    <figure className="research-figure benchmark-figure">
      <figcaption className="sr-only">Fixed experiment inputs surround a constant agent while the structural representation changes.</figcaption>
      <div className="benchmark-flow" aria-hidden="true">
        <div className="fixed-cloud">
          <p>Fixed</p>
          {FIXED.map((item, index) => <span key={item} style={{ '--i': index }}>{item}</span>)}
        </div>
        <div className="constant-agent"><i/><strong>Agent</strong><span>constant</span></div>
        <div className="condition-cycle">
          <p>Representation</p>
          <div className="condition-viewport"><div>{CONDITIONS.map((condition) => <span key={condition}>{condition}</span>)}</div></div>
        </div>
        <div className="verified-output"><i/><strong>Run</strong><span>held-out verification</span></div>
        <b className="run-pulse pulse-one"/><b className="run-pulse pulse-two"/>
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
  return (
    <figure className="research-figure experiments-figure">
      <figcaption className="sr-only">A quiet empty state for benchmark results that have not yet been recorded.</figcaption>
      <div className="results-field" aria-hidden="true">
        <div className="result-dots">{CONDITIONS.map((condition, index) => <span key={condition} style={{ '--i': index }}><i/>{condition === 'Architecture' ? 'Arch.' : condition === 'Call graph' ? 'Graph' : condition}</span>)}</div>
        <div className="results-message"><div className="waiting-mark"><i/><i/><i/></div><h2>Experiments in progress</h2><p>Results will appear as verified runs complete.</p></div>
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
