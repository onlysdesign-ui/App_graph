import { useMemo } from 'react';
import ReactFlow, { Background, Controls, type Edge, type Node } from 'reactflow';
import dagre from 'dagre';

type Step = {
  index: number;
  page: string;
  action: string;
};

type TestCase = {
  id: string;
  name: string;
  steps: Step[];
};

const mockCases: TestCase[] = [
  {
    id: 'TS-001',
    name: 'Login flow',
    steps: [
      { index: 1, page: '/login', action: 'navigate' },
      { index: 2, page: '/login', action: 'fill_email' },
      { index: 3, page: '/dashboard', action: 'redirect' },
    ],
  },
  {
    id: 'TS-002',
    name: 'Forgot password',
    steps: [
      { index: 1, page: '/login', action: 'navigate' },
      { index: 2, page: '/forgot-password', action: 'click_link' },
      { index: 3, page: '/reset', action: 'submit_form' },
    ],
  },
  {
    id: 'TS-003',
    name: 'Signup',
    steps: [
      { index: 1, page: '/signup', action: 'navigate' },
      { index: 2, page: '/signup', action: 'fill_form' },
      { index: 3, page: '/welcome', action: 'redirect' },
    ],
  },
];

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

const buildGraph = (cases: TestCase[]) => {
  const pages = new Map<string, Node>();
  const edgeMap = new Map<string, Edge>();

  const startPage = cases[0]?.steps[0]?.page;

  cases.forEach((testCase) => {
    testCase.steps.forEach((step, index) => {
      if (!pages.has(step.page)) {
        const isStart = step.page === startPage;
        pages.set(step.page, {
          id: step.page,
          data: { label: step.page },
          position: { x: 0, y: 0 },
          className: isStart
            ? 'rounded-xl border border-emerald-300 bg-emerald-500/20 text-emerald-100 shadow-lg'
            : 'rounded-xl border border-slate-700 bg-slate-900/80 text-slate-100 shadow-md',
        });
      }

      const next = testCase.steps[index + 1];
      if (next && next.page !== step.page) {
        const id = `${step.page}->${next.page}`;
        if (!edgeMap.has(id)) {
          edgeMap.set(id, {
            id,
            source: step.page,
            target: next.page,
            animated: true,
            style: { stroke: '#38bdf8' },
          });
        }
      }
    });
  });

  const nodes = Array.from(pages.values());
  const edges = Array.from(edgeMap.values());

  return { nodes: createLayout(nodes, edges), edges };
};

const App = () => {
  const { nodes, edges } = useMemo(() => buildGraph(mockCases), []);

  return (
    <div className="h-screen w-screen bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
      >
        <Background gap={24} size={1} color="#1f2937" />
        <Controls position="bottom-right" />
      </ReactFlow>
    </div>
  );
};

export default App;
