import {
  Background,
  BackgroundVariant,
  type Edge,
  Handle,
  MiniMap,
  type Node,
  type NodeTypes,
  Panel,
  Position,
  SolidFlow,
  useSolidFlow,
  useStore,
} from "@xgx/ui/flow";
import { createSignal } from "solid-js";

/**
 * A deterministic fixture for tests/flow.spec.ts. Not part of the catalogue: it is
 * reached at `?harness=flow` so the suite gets a page with nothing else on it, fixed
 * node positions, and a stable set of ids to assert against.
 *
 * Everything the tests need to read is published on `window.__flowHarness`. Reading the
 * store directly is deliberate — most of what is under test (measurement, selection,
 * connection state) has no DOM representation until it is already working.
 */

export type FlowHarnessApi = {
  connectCount: () => number;
  edges: () => { id: string; source: string; sourceHandle: string | null; target: string }[];
  lastConnect: () => unknown;
  nodes: () => { dragging: boolean; id: string; selected: boolean; x: number; y: number }[];
  measured: () => Record<string, { height?: number; width?: number } | undefined>;
  selection: () => string[];
  size: () => { height: number; width: number };
  viewport: () => { x: number; y: number; zoom: number };
};

declare global {
  interface Window {
    __flowHarness?: FlowHarnessApi;
  }
}

type HarnessData = { label: string };

function CardNode(props: { data: HarnessData; selected?: boolean }) {
  return (
    <>
      <Handle
        class="!size-3 !rounded-full !border !border-neutral-500 !bg-white"
        position={Position.Top}
        type="target"
      />
      <div
        class={`w-40 rounded-lg border bg-white p-3 text-sm ${
          props.selected ? "border-black" : "border-neutral-300"
        }`}
        data-testid="card-node"
      >
        {props.data.label}
      </div>
      <Handle
        class="!size-3 !rounded-full !border !border-neutral-500 !bg-white"
        position={Position.Bottom}
        type="source"
      />
    </>
  );
}

/** Two source handles with distinct ids — the only way an edge records which leg it left by. */
function BranchNode(props: { data: HarnessData; selected?: boolean }) {
  return (
    <>
      <Handle
        class="!size-3 !rounded-full !border !border-neutral-500 !bg-white"
        position={Position.Top}
        type="target"
      />
      <div
        class={`w-40 rounded-lg border bg-white p-3 text-sm ${
          props.selected ? "border-black" : "border-neutral-300"
        }`}
        data-testid="branch-node"
      >
        {props.data.label}
      </div>
      <Handle
        class="!size-3 !rounded-full !border !border-neutral-500 !bg-white"
        id="yes"
        position={Position.Bottom}
        style="left: 25%"
        type="source"
      />
      <Handle
        class="!size-3 !rounded-full !border !border-neutral-500 !bg-white"
        id="no"
        position={Position.Bottom}
        style="left: 75%"
        type="source"
      />
    </>
  );
}

const nodeTypes: NodeTypes = {
  branch: BranchNode as NodeTypes[string],
  card: CardNode as NodeTypes[string],
};

// Positions are spread out so every node and handle is a distinct, hittable target at
// zoom 1. Tests assert against these exact numbers.
const initialNodes: Node<HarnessData>[] = [
  { data: { label: "Alpha" }, id: "alpha", position: { x: 80, y: 60 }, type: "card" },
  { data: { label: "Bravo" }, id: "bravo", position: { x: 380, y: 60 }, type: "card" },
  { data: { label: "Charlie" }, id: "charlie", position: { x: 80, y: 300 }, type: "card" },
  { data: { label: "Delta" }, id: "delta", position: { x: 380, y: 300 }, type: "branch" },
  { data: { label: "Echo" }, id: "echo", position: { x: 700, y: 300 }, type: "card" },
];

const initialEdges: Edge[] = [
  { id: "alpha-bravo", source: "alpha", target: "bravo", type: "smoothstep" },
];

export function FlowHarness() {
  const [connectCount, setConnectCount] = createSignal(0);
  const [lastConnect, setLastConnect] = createSignal<unknown>(null);
  const [selection, setSelection] = createSignal<string[]>([]);

  return (
    <div class="h-screen w-screen bg-white p-0" data-testid="flow-harness">
      <div class="h-full w-full" data-testid="flow-container">
        <SolidFlow
          class="h-full w-full"
          edges={initialEdges}
          nodeTypes={nodeTypes}
          /*
           * Start drags on the first move rather than after the default 1px
           * threshold. XYDrag absorbs whatever movement the event that crosses
           * the threshold carried, which is ~1px for a real pointer but a whole
           * step for a synthetic one — so the drag assertions below can only
           * hold against exact deltas with the threshold out of the way.
           */
          nodeDragThreshold={0}
          nodes={initialNodes}
          onconnect={(connection) => {
            setConnectCount((count) => count + 1);
            setLastConnect(connection);
          }}
          onselectionchange={({ nodes }) => setSelection(nodes.map((node) => node.id))}
        >
          <Background gap={16} size={1} variant={BackgroundVariant.Dots} />
          <MiniMap pannable position="bottom-right" zoomable />
          <Panel position="top-left">
            <span data-testid="flow-panel">harness</span>
          </Panel>
          <HarnessBridge
            connectCount={connectCount}
            lastConnect={lastConnect}
            selection={selection}
          />
        </SolidFlow>
      </div>
    </div>
  );
}

function HarnessBridge(props: {
  connectCount: () => number;
  lastConnect: () => unknown;
  selection: () => string[];
}) {
  const store = useStore();
  const api = useSolidFlow();

  window.__flowHarness = {
    connectCount: props.connectCount,
    edges: () =>
      store.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        sourceHandle: edge.sourceHandle ?? null,
        target: edge.target,
      })),
    lastConnect: props.lastConnect,
    measured: () =>
      Object.fromEntries([...store.nodeLookup.values()].map((node) => [node.id, node.measured])),
    nodes: () =>
      store.nodes.map((node) => ({
        dragging: node.dragging ?? false,
        id: node.id,
        selected: node.selected ?? false,
        x: node.position.x,
        y: node.position.y,
      })),
    selection: props.selection,
    size: () => ({ height: store.height, width: store.width }),
    viewport: () => ({ ...api.getViewport() }),
  };

  return null;
}
