/*
 * Invisible information-architecture contracts.
 *
 * These goals are implementation metadata, not page content. Before adding or
 * changing anything visible, follow its page -> section -> subsection ->
 * component chain. If the change does not directly serve every ancestor, move,
 * simplify, or omit it. Never render this registry or spread it onto DOM nodes.
 */

const contract = ({ level, coreIdea, communicates, belongs, ...children }) => ({
  level,
  coreIdea,
  communicates,
  belongs,
  ...children,
});

function deepFreeze(value) {
  Object.values(value).forEach((child) => {
    if (child && typeof child === 'object' && !Object.isFrozen(child)) deepFreeze(child);
  });
  return Object.freeze(value);
}

export const SECTIONAL_LOGIC = deepFreeze({
  level: 'site',
  coreIdea: 'Test whether deterministic structural views help coding agents navigate unfamiliar repositories.',
  communicates: 'The project, artifact generator, controlled experiment, evidence, and next research steps form one causal story.',
  belongs: ['research framing', 'artifact generation', 'experimental controls', 'measured evidence', 'research extensions'],
  sharedComponents: {
    appShell: contract({
      level: 'component',
      coreIdea: 'Mount one research page inside a stable site shell.',
      communicates: 'Navigation changes the active research stage without changing the site’s overall framing.',
      belongs: ['persistent header', 'one active page', 'page transition orchestration'],
    }),
    header: contract({
      level: 'component',
      coreIdea: 'Provide quiet, persistent access to the site’s major research stages.',
      communicates: 'Where the reader is and which adjacent stage they can open.',
      belongs: ['primary page navigation', 'project identity', 'repository link'],
    }),
    siteCredit: contract({
      level: 'component',
      coreIdea: 'Acknowledge the collaborator who helped without entering the research argument.',
      communicates: 'This research is backed by Rubric Labs.',
      belongs: ['single quiet acknowledgement', 'collaborator mark', 'link to the collaborator'],
    }),
    projectMark: contract({
      level: 'component',
      coreIdea: 'Identify MapBench with one restrained, persistent mark.',
      communicates: 'The page belongs to the MapBench research project.',
      belongs: ['fixed monochrome project mark'],
    }),
    viewFrame: contract({
      level: 'component',
      coreIdea: 'Give each page one stable semantic and animation boundary.',
      communicates: 'Everything inside the frame serves one page goal.',
      belongs: ['one page heading', 'that page’s sections', 'page-level entrance motion'],
    }),
    researchCopy: contract({
      level: 'component',
      coreIdea: 'State a research idea before its supporting visual.',
      communicates: 'The question or claim the adjacent evidence should make understandable.',
      belongs: ['one heading', 'one framing statement', 'brief supporting copy', 'direct next action'],
    }),
    technicalDetails: contract({
      level: 'component',
      coreIdea: 'Keep reproducibility detail available without competing with the main argument.',
      communicates: 'Exact implementation facts are supporting evidence, not a second headline.',
      belongs: ['precise specifications', 'bounded caveats', 'reproduction details'],
    }),
    routedGraph: contract({
      level: 'component',
      coreIdea: 'Show a small, legible relationship graph when topology is the evidence.',
      communicates: 'Which entities connect and, when interactive, which relationships are local to a selected entity.',
      belongs: ['meaningful nodes', 'meaningful edges', 'minimal labels', 'relationship-focused interaction'],
    }),
  },
  pages: {
    mapbench: contract({
      level: 'page',
      coreIdea: 'Introduce the MapBench research question and the controlled comparison used to answer it.',
      communicates: 'The same coding task is run with no artifact and with three structural artifacts, then outcomes and navigation are measured.',
      belongs: ['research question', 'four-condition benchmark overview', 'measured outcomes', 'routes to method and results'],
      sections: {
        overview: contract({
          level: 'section',
          coreIdea: 'Make the benchmark’s causal loop understandable at a glance.',
          communicates: 'Repository structure becomes an artifact, the agent uses it to navigate, and task completion is observed.',
          belongs: ['concise research framing', 'one framing image', 'one causal sequence', 'experiment and results actions'],
          subsections: {
            benchmarkSequence: contract({
              level: 'subsection',
              coreIdea: 'Visualize one end-to-end benchmark traversal.',
              communicates: 'The generated artifact joins the agent’s unchanged repository access and may alter its route to a verified target.',
              belongs: ['repository input', 'generated structure', 'agent traversal', 'task outcome'],
              components: {
                figure: contract({
                  level: 'component',
                  coreIdea: 'Build repository → structure → navigation → outcome as one accumulating fixed-size sequence.',
                  communicates: 'Structure is an aid used during navigation, not a replacement for source code.',
                  belongs: ['causal stage progression', 'connectors that draw the handoff', 'one moving generated artifact', 'verified completion state'],
                }),
              },
            }),
            heroImage: contract({
              level: 'subsection',
              coreIdea: 'Hold the page inside one image of a route read from above, and state the research framing over it.',
              communicates: 'Traversal is the thing being studied, it is legible only from above the terrain, and the question is asked from inside that view.',
              belongs: ['one framing photograph', 'one continuous route', 'terrain the route crosses', 'the page framing stated over the image', 'experiment and results actions'],
              components: {
                heroMedia: contract({
                  level: 'component',
                  coreIdea: 'Present that photograph as one calm, rounded surface that fills the first screen and carries the framing copy.',
                  communicates: 'The image frames the research question and gives it a ground; it does not diagram or explain it.',
                  belongs: ['single landscape image', 'rounded media boundary', 'legibility ground for overlaid copy', 'quiet entrance motion'],
                }),
              },
            }),
          },
        }),
      },
    }),
    cartograph: contract({
      level: 'page',
      coreIdea: 'Explain how Cartograph deterministically turns source code into bounded structural views.',
      communicates: 'One canonical intermediate representation produces projections with intentional information boundaries.',
      belongs: ['generation pipeline', 'projection design', 'retained and omitted information'],
      sections: {
        overview: contract({
          level: 'section',
          coreIdea: 'Show the source-to-projection generation path.',
          communicates: 'Language-aware parsing creates one canonical graph that feeds all tested artifacts.',
          belongs: ['source files', 'parser', 'canonical IR', 'three tested projections', 'links to deeper design layers'],
          subsections: {
            pipeline: contract({
              level: 'subsection',
              coreIdea: 'Make the deterministic build sequence concrete.',
              communicates: 'Every projection comes from the same parsed structure rather than separate hand-authored interpretations.',
              belongs: ['source stage', 'parsing stage', 'IR stage', 'projection stage'],
              components: {
                figure: contract({
                  level: 'component',
                  coreIdea: 'Animate files through parsing, the IR, and the three projections.',
                  communicates: 'Shared upstream structure keeps the artifact comparison grounded.',
                  belongs: ['fixed-size causal animation', 'IR relationship inspection', 'projection outputs'],
                }),
              },
            }),
          },
        }),
        design: contract({
          level: 'section',
          coreIdea: 'Explain the distinct design purpose behind each projection.',
          communicates: 'Architecture, skeleton, and call graph expose different structure and therefore support different navigation decisions.',
          belongs: ['one purpose per projection', 'one honest tradeoff per projection', 'comparison grounded in artifact behavior'],
          subsections: {
            projectionComparison: contract({
              level: 'subsection',
              coreIdea: 'Compare the three views on purpose rather than appearance.',
              communicates: 'Each representation is useful for a different repository-understanding task.',
              belongs: ['architecture purpose', 'skeleton purpose', 'call-graph purpose'],
              components: {
                projectionRows: contract({
                  level: 'component',
                  coreIdea: 'Pair each projection with its purpose and tradeoff.',
                  communicates: 'The experiment compares meaningful information choices, not arbitrary formats.',
                  belongs: ['projection name', 'purpose', 'tradeoff'],
                }),
              },
            }),
          },
        }),
        boundary: contract({
          level: 'section',
          coreIdea: 'Show the concrete information differences between three downstream projections of the same analysis.',
          communicates: 'Architecture, skeleton, and call graph retain different parts of one canonical structural IR.',
          belongs: ['retained structure', 'omitted structure', 'bounded comparison dimensions'],
          subsections: {
            matrix: contract({
              level: 'subsection',
              coreIdea: 'Compare the exact structural capabilities exposed by each projection.',
              communicates: 'The three projections share one upstream analysis but expose different downstream information.',
              belongs: ['shared information dimensions', 'clear retained/omitted states', 'projection-level comparison'],
              components: {
                boundaryMatrix: contract({
                  level: 'component',
                  coreIdea: 'Render one scan-friendly matrix of projection boundaries.',
                  communicates: 'Readers can locate the exact structural distinction behind a condition.',
                  belongs: ['dimension rows', 'projection columns', 'concise state markers'],
                }),
              },
            }),
          },
        }),
      },
    }),
    experiment: contract({
      level: 'page',
      coreIdea: 'Explain how MapBench isolates artifact access and evaluates its effect.',
      communicates: 'Questions, controlled setup, artifact roles, and model choices form one intentional experiment design.',
      belongs: ['research questions', 'controlled conditions', 'artifact comparison', 'model and harness rationale'],
      sections: {
        hero: contract({
          level: 'section',
          coreIdea: 'Summarize the complete experimental chain before the detailed method.',
          communicates: 'Artifacts define conditions, conditions are repeated under fixed controls, and every run yields measurements.',
          belongs: ['single experiment question', 'four-condition sequence', 'repeated runs', 'measurement categories'],
          subsections: {
            benchmarkSequence: contract({
              level: 'subsection',
              coreIdea: 'Preview the experiment as four isolated conditions and one comparison.',
              communicates: 'Every condition runs alone in an identical container, and the runs only meet at the comparison.',
              belongs: ['four conditions', 'identical isolated containers', 'one comparison'],
              components: {
                figure: contract({
                  level: 'component',
                  coreIdea: 'Animate four conditions entering identical trial containers and resolving into one comparison.',
                  communicates: 'Each condition is tested alone under identical conditions, so any difference between them is the representation and nothing else.',
                  belongs: ['four condition labels', 'identical trial containers', 'one entry per container', 'a single comparison state'],
                }),
              },
            }),
          },
        }),
        questions: contract({
          level: 'section',
          coreIdea: 'Define the effects the experiment is designed to detect.',
          communicates: 'MapBench evaluates completion, efficiency, navigation behavior, and artifact overhead.',
          belongs: ['outcome question', 'efficiency question', 'trajectory question', 'context-cost question'],
          subsections: {
            researchQuestions: contract({
              level: 'subsection',
              coreIdea: 'Keep the four research questions parallel and directly measurable.',
              communicates: 'Every collected measure exists to answer one of these questions.',
              belongs: ['four concise testable questions'],
              components: {
                questionList: contract({
                  level: 'component',
                  coreIdea: 'Present the questions as one calm scan path.',
                  communicates: 'The study has a bounded evidence target.',
                  belongs: ['question text in experimental order'],
                }),
              },
            }),
          },
        }),
        setup: contract({
          level: 'section',
          coreIdea: 'Explain what changes, what stays fixed, and what the agent receives.',
          communicates: 'The same task and repository are rerun in isolated conditions; only artifact access changes.',
          belongs: ['controlled environment', 'agent access', 'independent trials', 'captured outputs'],
          subsections: {
            playback: contract({
              level: 'subsection',
              coreIdea: 'Let readers follow and control the complete setup progression.',
              communicates: 'Environment, access, trials, and outputs form one ordered sequence that can be paused, resumed, or inspected at any point.',
              belongs: ['play and pause control', 'seekable full-sequence progress', 'current stage position'],
              components: {
                timelineControls: contract({
                  level: 'component',
                  coreIdea: 'Control the setup sequence with one compact playback strip.',
                  communicates: 'The stage animation and the visible playhead remain synchronized.',
                  belongs: ['play and pause button', 'seek track', 'elapsed and total time'],
                }),
              },
            }),
            environment: contract({
              level: 'subsection',
              coreIdea: 'Separate experimental invariants from the treatment variable.',
              communicates: 'Task, repository, source tree, harness, and limits stay fixed while baseline, architecture, skeleton, and call graph cycle.',
              belongs: ['line-by-line invariant list', 'one condition sequence', 'fresh isolated environment'],
              components: {
                conditionCycle: contract({
                  level: 'component',
                  coreIdea: 'Animate only the active condition against a stable invariant list.',
                  communicates: 'The treatment changes; the execution context does not.',
                  belongs: ['five fixed facts', 'four ordered conditions', 'one active state at a time'],
                }),
              },
            }),
            trials: contract({
              level: 'subsection',
              coreIdea: 'Show the independent repetition unit without redefining it.',
              communicates: 'Each task-condition pair runs three isolated trials under the existing backend design.',
              belongs: ['three trial slots', 'isolation', 'existing Docker and Modal behavior'],
              components: {
                runtime: contract({
                  level: 'component',
                  coreIdea: 'Visualize three independent trial runtimes.',
                  communicates: 'Repetitions are separate executions of the same controlled setup.',
                  belongs: ['existing trial animation', 'runtime activity', 'backend context'],
                }),
                modalMark: contract({
                  level: 'component',
                  coreIdea: 'Identify Modal only where it explains the optional trial runtime substrate.',
                  communicates: 'The branded runtime is execution infrastructure, not an experimental condition.',
                  belongs: ['official Modal mark', 'runtime attribution'],
                }),
              },
            }),
            outputs: contract({
              level: 'subsection',
              coreIdea: 'Name the evidence retained from every trial.',
              communicates: 'Outcomes and complete behavioral traces support both performance and process analysis.',
              belongs: ['outcome', 'trajectory', 'usage', 'runtime'],
              components: {
                evidenceChart: contract({
                  level: 'component',
                  coreIdea: 'Show one trial and the complete set of evidence retained with it.',
                  communicates: 'Outcome, trajectory, usage, and runtime remain connected parts of one trial record.',
                  belongs: ['one trial node', 'four retained-evidence nodes', 'explicit trial-to-evidence connections'],
                }),
              },
            }),
          },
        }),
        artifacts: contract({
          level: 'section',
          coreIdea: 'Explain what each artifact is for, how it reaches the agent, and what understanding it provides.',
          communicates: 'The same system can be understood through repository structure, declaration structure, or static execution relationships.',
          belongs: ['agent questions', 'human-readable contents', 'delivery mechanism', 'same-system example'],
          subsections: {
            comparison: contract({
              level: 'subsection',
              coreIdea: 'Compare the three artifacts along shared, useful dimensions.',
              communicates: 'Differences in representation and delivery correspond to different navigation affordances.',
              belongs: ['architecture', 'skeleton', 'call graph', 'shared comparison rows'],
              components: {
                matrix: contract({
                  level: 'component',
                  coreIdea: 'Keep a horizontally comparable artifact matrix.',
                  communicates: 'Readers can compare purpose, contents, delivery, and high-level form without changing context.',
                  belongs: ['three artifact columns', 'four comparison rows', 'subtle row grouping'],
                }),
                examples: contract({
                  level: 'component',
                  coreIdea: 'Show only the core abstraction each projection carries.',
                  communicates: 'Architecture answers WHERE, skeleton answers WHAT, and the call graph answers HOW.',
                  belongs: ['architecture structure, entrypoints, and dependencies', 'skeleton files with their declarations', 'call-graph flow between functions', 'minimal form readable at a glance'],
                }),
              },
            }),
          },
        }),
        modelsHarness: contract({
          level: 'section',
          coreIdea: 'Identify the model used and explain what stays constant during evaluation.',
          communicates: 'Every measured run uses GPT-5.6 Luna at max effort while Pi stays fixed throughout.',
          belongs: ['evaluated model configuration', 'fixed Pi harness'],
          subsections: {
            evaluationChoice: contract({
              level: 'subsection',
              coreIdea: 'Separate model selection from the constant evaluation machinery.',
              communicates: 'One model configuration drives the same harness and action-observation loop in every run.',
              belongs: ['evaluated model configuration', 'one fixed harness loop'],
              components: {
                modelHarnessLoop: contract({
                  level: 'component',
                  coreIdea: 'Connect the evaluated model to the fixed Pi loop.',
                  communicates: 'GPT-5.6 Luna receives the same harness and condition protocol in every run.',
                  belongs: ['evaluated model', 'reasoning state', 'environment state', 'fixed Pi hub'],
                }),
                agentLoop: contract({
                  level: 'component',
                  coreIdea: 'Depict the fixed two-state action and observation loop used by every evaluated model.',
                  communicates: 'LM reasoning and the environment vary their state while the Pi harness remains fixed.',
                  belongs: ['LM reasoning state', 'Environment state', 'action arc', 'observation arc', 'fixed Pi hub'],
                }),
              },
            }),
          },
        }),
      },
    }),
    results: contract({
      level: 'page',
      coreIdea: 'Compare condition-level evidence while keeping individual tasks inspectable.',
      communicates: 'Representation effects should be read through distributions, means, and concrete task records, with sample provenance explicit.',
      belongs: ['metric selection', 'condition comparison', 'per-task evidence', 'measured-sample provenance'],
      sections: {
        evidence: contract({
          level: 'section',
          coreIdea: 'Turn repeated-run data into a legible condition comparison.',
          communicates: 'A reader can switch metrics, compare all four conditions, and inspect the measured task behind a mark.',
          belongs: ['metric controls', 'task and mean plot', 'range', 'selected observation detail'],
          subsections: {
            conditionChart: contract({
              level: 'subsection',
              coreIdea: 'Keep aggregate and run-level evidence in the same analytical view.',
              communicates: 'Means summarize conditions without hiding variability or failure states.',
              belongs: ['shared axes', 'per-task observations', 'condition means', 'ranges', 'metric switching'],
              components: {
                chart: contract({
                  level: 'component',
                  coreIdea: 'Render one comparable plot for the selected metric.',
                  communicates: 'The visual encoding remains stable while only the metric changes.',
                  belongs: ['four conditions', 'one mark per task', 'mean and range marks', 'fixed chart dimensions'],
                }),
                observation: contract({
                  level: 'component',
                  coreIdea: 'Ground the selected mark in a concrete measured record.',
                  communicates: 'Hovering or pinning reveals the task, repository, result, tokens, runtime, and cost behind one mark.',
                  belongs: ['selected condition', 'selected task', 'repository', 'primary metric', 'supporting measures'],
                }),
              },
            }),
          },
        }),
      },
    }),
    future: contract({
      level: 'page',
      coreIdea: 'Show how the initial controlled study expands into a useful research program.',
      communicates: 'Future work should broaden evidence, investigate mechanisms, and build representations justified by observed behavior.',
      belongs: ['validation', 'mechanism investigation', 'evidence-led artifact development'],
      sections: {
        roadmap: contract({
          level: 'section',
          coreIdea: 'State where the research goes next without turning it into a plan.',
          communicates: 'What remains follows from what the current evidence can and cannot settle.',
          belongs: ['one closing statement'],
          subsections: {
            directions: contract({
              level: 'subsection',
              coreIdea: 'State where the research goes next in one passage.',
              communicates: 'The next steps follow from limits in the present evidence, not from a plan.',
              belongs: ['one statement of the remaining work'],
              components: {
                statement: contract({
                  level: 'component',
                  coreIdea: 'Carry the whole of the remaining work as one paragraph beside the photograph.',
                  communicates: 'This page is a closing statement, not a roadmap artifact.',
                  belongs: ['one paragraph'],
                }),
              },
            }),
          },
        }),
      },
    }),
  },
});

const CHILD_LEVELS = {
  pages: 'page',
  sections: 'section',
  subsections: 'subsection',
  components: 'component',
  sharedComponents: 'component',
};

const PAGE_CHAIN = ['pages', 'sections', 'subsections', 'components'];
const ALLOWED_CHILD_GROUPS = {
  site: ['pages', 'sharedComponents'],
  page: ['sections'],
  section: ['subsections'],
  subsection: ['components'],
  component: [],
};

function chainAt(path) {
  if (typeof path !== 'string' || !path.trim()) throw new Error('Sectional logic path must be a non-empty string');
  const parts = path.split('.');
  const isSharedComponent = parts[0] === 'sharedComponents';
  const validLength = isSharedComponent
    ? parts.length === 2
    : parts.length >= 2 && parts.length <= 8 && parts.length % 2 === 0;

  if (!validLength || (!isSharedComponent && parts[0] !== 'pages')) {
    throw new Error(`Invalid sectional logic path: ${path}`);
  }

  let node = SECTIONAL_LOGIC;
  const chain = [{ path: 'site', contract: node }];
  const expectedGroups = isSharedComponent ? ['sharedComponents'] : PAGE_CHAIN;

  for (let index = 0; index < parts.length; index += 2) {
    const group = parts[index];
    const key = parts[index + 1];
    const expectedGroup = expectedGroups[index / 2];
    if (group !== expectedGroup) {
      throw new Error(`Invalid sectional logic hierarchy at ${path}: expected ${expectedGroup}, found ${group}`);
    }

    node = node[group]?.[key];
    const nodePath = parts.slice(0, index + 2).join('.');
    if (!node) throw new Error(`Missing sectional logic contract: ${nodePath}`);
    if (node.level !== CHILD_LEVELS[group]) {
      throw new Error(`Sectional logic level mismatch at ${nodePath}: expected ${CHILD_LEVELS[group]}, found ${node.level}`);
    }
    chain.push({ path: nodePath, contract: node });
  }

  return chain;
}

function validateNode(node, path) {
  if (!node || typeof node !== 'object') throw new Error(`Missing sectional logic at ${path}`);
  for (const key of ['level', 'coreIdea', 'communicates']) {
    if (typeof node[key] !== 'string' || !node[key].trim()) {
      throw new Error(`Invalid sectional logic field ${path}.${key}`);
    }
  }
  if (!Array.isArray(node.belongs) || node.belongs.length === 0 || node.belongs.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new Error(`Invalid sectional logic field ${path}.belongs`);
  }
  for (const [group, childLevel] of Object.entries(CHILD_LEVELS)) {
    if (!node[group]) continue;
    if (!ALLOWED_CHILD_GROUPS[node.level]?.includes(group)) {
      throw new Error(`Invalid sectional logic hierarchy at ${path}.${group}`);
    }
    if (typeof node[group] !== 'object' || Array.isArray(node[group]) || Object.keys(node[group]).length === 0) {
      throw new Error(`Invalid sectional logic group ${path}.${group}`);
    }
    Object.entries(node[group]).forEach(([key, child]) => {
      const childPath = `${path}.${group}.${key}`;
      if (child.level !== childLevel) throw new Error(`Sectional logic level mismatch at ${childPath}`);
      validateNode(child, childPath);
    });
  }
}

export function validateSectionalLogic() {
  validateNode(SECTIONAL_LOGIC, 'site');
}

// Returns the immutable semantic ancestry for internal authoring and review.
// Nothing from this chain should be forwarded to rendered elements.
export function getSectionalLogicChain(path) {
  return chainAt(path).map(({ contract: node }) => node);
}

export function enforceSectionalLogic(path, expectedLevel) {
  const chain = chainAt(path);
  const node = chain[chain.length - 1].contract;
  if (expectedLevel && node.level !== expectedLevel) {
    throw new Error(`Sectional logic level mismatch at ${path}: expected ${expectedLevel}, found ${node.level}`);
  }
  return node;
}
