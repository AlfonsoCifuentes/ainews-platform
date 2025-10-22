"use client";

import dynamic from 'next/dynamic';

const GraphVisualizer = dynamic(
  () => import('@/components/kg/GraphVisualizer').then(mod => ({ default: mod.GraphVisualizer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-3xl bg-muted">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    ),
  }
);

type GraphNode = {
  id: string;
  name: string;
  type: string;
};

type GraphEdge = {
  source: string;
  target: string;
  type: string;
};

interface GraphVisualizerWrapperProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function GraphVisualizerWrapper({ nodes, edges }: GraphVisualizerWrapperProps) {
  return <GraphVisualizer nodes={nodes} edges={edges} />;
}
