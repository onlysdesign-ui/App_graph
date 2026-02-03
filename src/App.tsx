import { useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, type Edge, type Node, type NodeMouseHandler } from 'reactflow';
import dagre from 'dagre';

type GraphArtifacts = Record<string, string>;

type AppGraphNode = {
  id: string;
  type: string;
  label: string;
  path: string;
  states: string[];
  artifacts: GraphArtifacts;
  coverage: {
    visited: boolean;
    visits: number;
    coverageScore: number;
  };
  metadata: Record<string, string | number | boolean | string[]>;
};

type AppGraphEdge = {
  source: string;
  target: string;
  type: string;
  label: string;
  conditions?: Record<string, string | number | boolean>;
};

type AppGraph = {
  environment: string;
  persona: string;
  version: string;
  nodes: AppGraphNode[];
  edges: AppGraphEdge[];
};

const mockGraph: AppGraph = {
  environment: 'staging',
  persona: 'guest',
  version: 'v2.3.14',
  nodes: [
    {
      id: 'node-1',
      type: 'route',
      label: 'Home Page',
      path: '/',
      states: ['guest', 'logged-in'],
      artifacts: {
        screenshot: 'homepage_guest.png',
        domSnapshot: 'HomePage.html',
        trace: 'homepage_trace.zip',
      },
      coverage: {
        visited: true,
        visits: 6,
        coverageScore: 0.8,
      },
      metadata: {
        entryPoint: true,
        stableSelectors: ["input[name='search_query']"],
      },
    },
    {
      id: 'node-2',
      type: 'state',
      label: "Search Results: 'cats'",
      path: '/results?search_query=cats',
      states: ['guest'],
      artifacts: {
        screenshot: 'search_results_cats.png',
        domSnapshot: 'SearchResultsPage.html',
      },
      coverage: {
        visited: true,
        visits: 4,
        coverageScore: 0.65,
      },
      metadata: {
        searchQuery: 'cats',
        resultCount: 17,
      },
    },
    {
      id: 'node-3',
      type: 'route',
      label: 'Video Player Page',
      path: '/watch?v=abc123',
      states: ['guest', 'logged-in'],
      artifacts: {
        screenshot: 'video_page_guest.png',
        domSnapshot: 'VideoPage.html',
        trace: 'video_trace.zip',
      },
      coverage: {
        visited: true,
        visits: 10,
        coverageScore: 0.9,
      },
      metadata: {
        videoTitle: 'Funny Cats Compilation',
        videoId: 'abc123',
      },
    },
    {
      id: 'node-4',
      type: 'action',
      label: 'Login with Test User',
      path: '/login',
      states: ['unauthenticated'],
      artifacts: {
        screenshot: 'login_success.png',
      },
      coverage: {
        visited: true,
        visits: 2,
        coverageScore: 1.0,
      },
      metadata: {
        loginMethod: 'OAuth',
        provider: 'Google',
      },
    },
    {
      id: 'node-5',
      type: 'action',
      label: 'Like Video',
      path: '/api/like',
      states: ['logged-in'],
      artifacts: {
        trace: 'like_action_trace.zip',
      },
      coverage: {
        visited: true,
        visits: 2,
        coverageScore: 1.0,
      },
      metadata: {
        videoId: 'abc123',
      },
    },
    {
      id: 'node-6',
      type: 'action',
      label: 'Subscribe to Channel',
      path: '/api/subscribe',
      states: ['logged-in'],
      artifacts: {},
      coverage: {
        visited: true,
        visits: 1,
        coverageScore: 1.0,
      },
      metadata: {
        channelId: 'ch999',
      },
    },
    {
      id: 'node-7',
      type: 'action',
      label: 'Post Comment',
      path: '/api/comment',
      states: ['logged-in'],
      artifacts: {
        screenshot: 'comment_posted.png',
      },
      coverage: {
        visited: true,
        visits: 1,
        coverageScore: 1.0,
      },
      metadata: {
        commentText: 'Отличное видео!',
      },
    },
  ],
  edges: [
    {
      source: 'node-1',
      target: 'node-2',
      type: 'navigation',
      label: "Search 'cats'",
      conditions: {
        input: 'cats',
      },
    },
    {
      source: 'node-2',
      target: 'node-3',
      type: 'navigation',
      label: 'Click first result',
    },
    {
      source: 'node-4',
      target: 'node-1',
      type: 'state-transition',
      label: 'Login success',
    },
    {
      source: 'node-3',
      target: 'node-5',
      type: 'action',
      label: 'Click Like',
    },
    {
      source: 'node-3',
      target: 'node-6',
      type: 'action',
      label: 'Click Subscribe',
    },
    {
      source: 'node-3',
      target: 'node-7',
      type: 'action',
      label: 'Add Comment',
    },
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

  const entryNode = graph.nodes.find((node) => node.metadata.entryPoint)?.id;
  const startNode = entryNode ?? graph.nodes[0]?.id;

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
        label: edge.label,
        labelStyle: { fill: '#e2e8f0', fontSize: 12, fontWeight: 600 },
        style: { stroke: '#38bdf8' },
      });
    }
  });

  const nodes = Array.from(nodeMap.values());
  const edges = Array.from(edgeMap.values());

  return { nodes: createLayout(nodes, edges), edges };
};

const App = () => {
  const { nodes: baseNodes, edges: baseEdges } = useMemo(() => buildGraph(mockGraph), []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => mockGraph.nodes.find((node) => node.id === selectedNodeId) ?? null,
    [selectedNodeId],
  );

  const nodes = useMemo(() => baseNodes, [baseNodes]);
  const edges = useMemo(() => baseEdges, [baseEdges]);

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    setSelectedNodeId(node.id);
  };

  const handleCloseSidebar = () => {
    setSelectedNodeId(null);
  };

  return (
    <div className="h-screen w-screen bg-slate-950">
      <div className="absolute left-6 top-6 z-10 rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-slate-100 shadow-lg backdrop-blur">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Default Graph</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200">
            env: {mockGraph.environment}
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200">
            persona: {mockGraph.persona}
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200">
            version: {mockGraph.version}
          </span>
        </div>
      </div>
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
                <p className="mt-1 text-xs text-slate-400">ID: {selectedNode.id}</p>
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
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Path</p>
                <p className="mt-2 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-100">
                  {selectedNode.path}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">States</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedNode.states.map((state) => (
                    <span
                      key={state}
                      className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200"
                    >
                      {state}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Artifacts</p>
                {Object.keys(selectedNode.artifacts).length === 0 ? (
                  <p className="mt-2 text-xs text-slate-400">No artifacts</p>
                ) : (
                  <div className="mt-2 flex flex-col gap-2">
                    {Object.entries(selectedNode.artifacts).map(([name, value]) => (
                      <div
                        key={name}
                        className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs text-slate-200"
                      >
                        <span className="text-slate-400">{name}:</span> {value}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Coverage</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-200">
                  <span
                    className={`rounded-full px-2 py-1 font-semibold ${
                      selectedNode.coverage.visited
                        ? 'bg-emerald-500/20 text-emerald-200'
                        : 'bg-rose-500/20 text-rose-200'
                    }`}
                  >
                    {selectedNode.coverage.visited ? 'Visited' : 'Not visited'}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
                    visits: {selectedNode.coverage.visits}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1">
                    score: {Math.round(selectedNode.coverage.coverageScore * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Metadata</p>
              <div className="mt-3 flex flex-1 flex-col gap-2 overflow-y-auto pr-2">
                {Object.entries(selectedNode.metadata).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs">
                    <p className="text-slate-400">{key}</p>
                    <p className="mt-1 text-slate-100">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

export default App;
