'use client';

import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface Entity {
  id: string;
  name: string;
  type: string;
}

interface Relation {
  sourceId: string;
  targetId: string;
  type: string;
  weight: number;
}

interface GraphVisualizerProps {
  entities: Entity[];
  relations: Relation[];
}

const nodeColors: Record<string, string> = {
  person: '#3b82f6',
  organization: '#8b5cf6',
  model: '#06b6d4',
  company: '#10b981',
  paper: '#f59e0b',
  concept: '#ec4899',
};

export function GraphVisualizer({ entities, relations }: GraphVisualizerProps): JSX.Element {
  const total = entities.length;
  const radius = Math.max(300, total * 40);
  
  const initialNodes: Node[] = entities.map((entity, index) => {
    const angle = (index / total) * 2 * Math.PI;
    return {
      id: entity.id,
      type: 'default',
      position: {
        x: radius * Math.cos(angle) + 500,
        y: radius * Math.sin(angle) + 400,
      },
      data: {
        label: entity.name,
        type: entity.type,
      },
      style: {
        background: nodeColors[entity.type] || '#6b7280',
        color: '#fff',
        border: '2px solid #ffffff40',
        borderRadius: '12px',
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: 'bold',
      },
    };
  });

  const initialEdges: Edge[] = relations.map((rel, index) => ({
    id: 'e' + index,
    source: rel.sourceId,
    target: rel.targetId,
    label: rel.type,
    type: 'smoothstep',
    animated: rel.weight > 0.7,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#ffffff60',
    },
    style: {
      stroke: '#ffffff60',
      strokeWidth: 1 + rel.weight * 2,
    },
    labelStyle: {
      fill: '#fff',
      fontSize: '10px',
      background: '#00000080',
      padding: '2px 6px',
      borderRadius: '4px',
    },
  }));

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, []);

  if (entities.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No Knowledge Graph Data
      </div>
    );
  }

  const nodeRelations = selectedNode
    ? relations.filter(
        (r) => r.sourceId === selectedNode || r.targetId === selectedNode
      )
    : [];

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      fitView
      className="bg-transparent"
    >
      <Background color="#ffffff22" gap={16} />
      <Controls className="!bg-black/60 !border-white/10" />
      <MiniMap
        nodeColor={(node) => nodeColors[node.data.type as string] || '#6b7280'}
        className="!bg-black/60 !border-white/10"
      />
      
      <Panel position="top-right" className="glass rounded-xl border border-white/10 p-4 space-y-2">
        <h3 className="text-sm font-semibold mb-2">Entity Types</h3>
        {Object.entries(nodeColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded" style={{ background: color }} />
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </Panel>

      {selectedNode && (
        <Panel position="bottom-left" className="glass rounded-xl border border-white/10 p-4 max-w-sm">
          <h3 className="text-sm font-semibold mb-2">
            {nodes.find((n) => n.id === selectedNode)?.data.label as string}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Type: {nodes.find((n) => n.id === selectedNode)?.data.type as string}
          </p>
          {nodeRelations.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium">Relations:</p>
              {nodeRelations.slice(0, 5).map((rel, i) => {
                const targetId = rel.sourceId === selectedNode ? rel.targetId : rel.sourceId;
                const targetEntity = entities.find((e) => e.id === targetId);
                return (
                  <div key={i} className="text-xs text-muted-foreground">
                    {rel.type} {rel.sourceId === selectedNode ? '→' : '←'} {targetEntity?.name}
                  </div>
                );
              })}
              {nodeRelations.length > 5 && (
                <p className="text-xs text-muted-foreground italic">
                  +{nodeRelations.length - 5} more...
                </p>
              )}
            </div>
          )}
        </Panel>
      )}
    </ReactFlow>
  );
}
