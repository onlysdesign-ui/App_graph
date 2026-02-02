import { useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, type Edge, type Node, type NodeMouseHandler } from 'reactflow';
import dagre from 'dagre';

type RelatedTestSuite = {
  id: string;
  name: string;
  lastStatus: 'passed' | 'failed';
  path: string[];
  lastRun: string;
};

type AppGraphNode = {
  id: string;
  label: string;
  type: string;
  personas: string[];
  environments: string[];
  coverage: boolean;
  artifacts: string[];
  relatedTestSuites: RelatedTestSuite[];
};

type AppGraphEdge = {
  source: string;
  target: string;
};

type AppGraph = {
  nodes: AppGraphNode[];
  edges: AppGraphEdge[];
};

const mockGraph: AppGraph = {
  nodes: [
    {
      id: '/login',
      label: '/login',
      type: 'page',
      personas: ['guest', 'user'],
      environments: ['staging', 'production'],
      coverage: true,
      artifacts: ['screenshot', 'trace'],
      relatedTestSuites: [
        {
          id: 'TS-10',
          name: 'Авторизация',
          lastStatus: 'passed',
          path: ['/login', '/dashboard'],
          lastRun: '2026-02-02T09:15:00Z',
        },
      ],
    },
    {
      id: '/cart',
      label: '/cart',
      type: 'page',
      personas: ['user'],
      environments: ['staging'],
      coverage: true,
      artifacts: ['screenshot'],
      relatedTestSuites: [
        {
          id: 'TS-42',
          name: 'Оплата заказов',
          lastStatus: 'passed',
          path: ['/login', '/cart', '/checkout', '/thank-you'],
          lastRun: '2026-02-02T13:15:00Z',
        },
      ],
    },
    {
      id: '/checkout',
      label: '/checkout',
      type: 'page',
      personas: ['guest', 'user'],
      environments: ['staging'],
      coverage: true,
      artifacts: ['screenshot', 'trace'],
      relatedTestSuites: [
        {
          id: 'TS-42',
          name: 'Оплата заказов',
          lastStatus: 'passed',
          path: ['/login', '/cart', '/checkout', '/thank-you'],
          lastRun: '2026-02-02T13:15:00Z',
        },
      ],
    },
    {
      id: '/thank-you',
      label: '/thank-you',
      type: 'page',
      personas: ['user'],
      environments: ['staging', 'production'],
      coverage: false,
      artifacts: ['screenshot'],
      relatedTestSuites: [
        {
          id: 'TS-42',
          name: 'Оплата заказов',
          lastStatus: 'failed',
          path: ['/login', '/cart', '/checkout', '/thank-you'],
          lastRun: '2026-02-03T08:05:00Z',
        },
      ],
    },
    {
      id: '/inventory',
      label: '/inventory',
      type: 'api',
      personas: ['service'],
      environments: ['staging', 'production'],
      coverage: true,
      artifacts: ['trace'],
      relatedTestSuites: [
        {
          id: 'TS-77',
          name: 'Синхронизация склада',
          lastStatus: 'passed',
          path: ['/inventory', '/checkout'],
          lastRun: '2026-02-01T11:45:00Z',
        },
      ],
    },
    {
      id: '/dashboard',
      label: '/dashboard',
      type: 'page',
      personas: ['user'],
      environments: ['production'],
      coverage: true,
      artifacts: ['screenshot', 'trace', 'video'],
      relatedTestSuites: [
        {
          id: 'TS-10',
          name: 'Авторизация',
          lastStatus: 'passed',
          path: ['/login', '/dashboard'],
          lastRun: '2026-02-02T09:15:00Z',
        },
      ],
    },
  ],
  edges: [
    { source: '/login', target: '/dashboard' },
    { source: '/login', target: '/cart' },
    { source: '/cart', target: '/checkout' },
    { source: '/checkout', target: '/thank-you' },
    { source: '/inventory', target: '/checkout' },
  ],
};

const nodeWidth = 180;
const nodeHeight = 48;

const createLayout = (nodes: Node[], edges: Edge[]) => {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'LR', nodesep: 32, ranksep: 48 });

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  return nodes.map((node) => {
    const { x, y } = graph.node(node.id) as { x: number; y: number };
    return {
      ...node,
      position: {
        x: x - nodeWidth / 2,
        y: y - nodeHeight / 2,
      },
    } satisfies Node;
  });
};

const buildGraph = (graph: AppGraph) => {
  const nodeMap = new Map<string, Node>();
  const edgeMap = new Map<string, Edge>();

  const startNode = graph.nodes[0]?.id;

  graph.nodes.forEach((node) => {
    const isStart = node.id === startNode;
    nodeMap.set(node.id, {
      id: node.id,
      data: { label: node.label },
      position: { x: 0, y: 0 },
      className: isStart
        ? 'rounded-xl border border-emerald-300 bg-emerald-500/20 text-emerald-100 shadow-lg'
        : 'rounded-xl border border-slate-700 bg-slate-900/80 text-slate-100 shadow-md',
    });
  });

  graph.edges.forEach((edge) => {
    const id = `${edge.source}->${edge.target}`;
    if (!edgeMap.has(id)) {
      edgeMap.set(id, {
        id,
        source: edge.source,
        target: edge.target,
        animated: true,
        style: { stroke: '#38bdf8' },
      });
    }
  });

  const nodes = Array.from(nodeMap.values());
  const edges = Array.from(edgeMap.values());

  return { nodes: createLayout(nodes, edges), edges };
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const buildHighlightSet = (path: string[]) => {
  const nodeIds = new Set(path);
  const edgeIds = new Set<string>();

  path.forEach((nodeId, index) => {
    const next = path[index + 1];
    if (next) {
      edgeIds.add(`${nodeId}->${next}`);
    }
  });

  return { nodeIds, edgeIds };
};

const App = () => {
  const { nodes: baseNodes, edges: baseEdges } = useMemo(() => buildGraph(mockGraph), []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightedSuite, setHighlightedSuite] = useState<RelatedTestSuite | null>(null);

  const selectedNode = useMemo(
    () => mockGraph.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [selectedNodeId],
  );

  const highlight = useMemo(
    () => (highlightedSuite ? buildHighlightSet(highlightedSuite.path) : null),
    [highlightedSuite],
  );

  const nodes = useMemo(() => {
    if (!highlight) {
      return baseNodes;
    }

    return baseNodes.map((node) => {
      const isHighlighted = highlight.nodeIds.has(node.id);
      return {
        ...node,
        className: `${node.className} ${
          isHighlighted ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-slate-950' : ''
        }`,
      };
    });
  }, [baseNodes, highlight]);

  const edges = useMemo(() => {
    if (!highlight) {
      return baseEdges;
    }

    return baseEdges.map((edge) => {
      const isHighlighted = highlight.edgeIds.has(edge.id);
      return {
        ...edge,
        style: {
          ...edge.style,
          stroke: isHighlighted ? '#38bdf8' : '#334155',
          strokeWidth: isHighlighted ? 2.5 : 1.2,
        },
      };
    });
  }, [baseEdges, highlight]);

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    setSelectedNodeId(node.id);
    setHighlightedSuite(null);
  };

  const handleCloseSidebar = () => {
    setSelectedNodeId(null);
    setHighlightedSuite(null);
  };

  return (
    <div className="h-screen w-screen bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        onNodeClick={handleNodeClick}
      >
        <Background gap={24} size={1} color="#1f2937" />
        <Controls position="bottom-right" />
      </ReactFlow>
      <aside
        className={`absolute right-0 top-0 h-full w-[360px] border-l border-slate-800 bg-slate-950/95 p-6 text-slate-100 shadow-xl backdrop-blur ${
          selectedNode ? 'translate-x-0' : 'translate-x-full'
        } transition-transform duration-300`}
      >
        {selectedNode && (
          <div className="flex h-full flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Node</p>
                <h2 className="text-2xl font-semibold text-white">{selectedNode.label}</h2>
                <p className="mt-1 text-sm text-slate-300">Type: {selectedNode.type}</p>
              </div>
              <button
                type="button"
                onClick={handleCloseSidebar}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-200">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Personas</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedNode.personas.map((persona) => (
                    <span
                      key={persona}
                      className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
                    >
                      {persona}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Environments</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedNode.environments.map((env) => (
                    <span
                      key={env}
                      className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
                    >
                      {env}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Artifacts</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedNode.artifacts.map((artifact) => (
                    <span
                      key={artifact}
                      className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
                    >
                      {artifact}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Coverage</span>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    selectedNode.coverage
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : 'bg-rose-500/20 text-rose-200'
                  }`}
                >
                  {selectedNode.coverage ? 'Covered' : 'Not covered'}
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Related Test Suites</p>
              <div className="mt-3 flex flex-1 flex-col gap-3 overflow-y-auto pr-2">
                {selectedNode.relatedTestSuites.map((suite) => {
                  const isPassed = suite.lastStatus === 'passed';
                  return (
                    <button
                      key={suite.id}
                      type="button"
                      onMouseEnter={() => setHighlightedSuite(suite)}
                      onMouseLeave={() => setHighlightedSuite(null)}
                      className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-left transition hover:border-slate-600"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">
                          {suite.id} {suite.name}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isPassed ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'
                          }`}
                        >
                          {isPassed ? '✅' : '❌'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        Last run: <span className="text-slate-200">{formatDate(suite.lastRun)}</span>
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

export default App;
