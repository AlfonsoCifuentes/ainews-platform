'use client';

import { useEffect, useRef, useState } from 'react';

interface GraphNode {
  id: string;
  name: string;
  type: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
}

interface GraphVisualizerProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
}

export function GraphVisualizer({
  nodes,
  edges,
  width = 800,
  height = 600,
  onNodeClick,
}: GraphVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [simulationNodes, setSimulationNodes] = useState<GraphNode[]>([]);
  
  useEffect(() => {
    if (!nodes.length) return;
    
    // Initialize node positions
    const initialNodes = nodes.map((node) => ({
      ...node,
      x: width / 2 + Math.random() * 100 - 50,
      y: height / 2 + Math.random() * 100 - 50,
      vx: 0,
      vy: 0,
    }));
    
    setSimulationNodes(initialNodes);
  }, [nodes, width, height]);
  
  useEffect(() => {
    if (!simulationNodes.length) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Simple force simulation
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Apply forces
      const updatedNodes = simulationNodes.map((node) => {
        let fx = 0;
        let fy = 0;
        
        // Center force
        fx += (width / 2 - node.x!) * 0.01;
        fy += (height / 2 - node.y!) * 0.01;
        
        // Repulsion between nodes
        simulationNodes.forEach((other) => {
          if (other.id === node.id) return;
          const dx = node.x! - other.x!;
          const dy = node.y! - other.y!;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 100 / (dist * dist);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        });
        
        // Edge attraction
        edges.forEach((edge) => {
          if (edge.source === node.id) {
            const target = simulationNodes.find((n) => n.id === edge.target);
            if (target) {
              const dx = target.x! - node.x!;
              const dy = target.y! - node.y!;
              fx += dx * 0.01;
              fy += dy * 0.01;
            }
          }
          if (edge.target === node.id) {
            const source = simulationNodes.find((n) => n.id === edge.source);
            if (source) {
              const dx = source.x! - node.x!;
              const dy = source.y! - node.y!;
              fx += dx * 0.01;
              fy += dy * 0.01;
            }
          }
        });
        
        // Update velocity and position
        const vx = (node.vx || 0) * 0.9 + fx;
        const vy = (node.vy || 0) * 0.9 + fy;
        const x = Math.max(30, Math.min(width - 30, node.x! + vx));
        const y = Math.max(30, Math.min(height - 30, node.y! + vy));
        
        return { ...node, x, y, vx, vy };
      });
      
      // Draw edges
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      edges.forEach((edge) => {
        const source = updatedNodes.find((n) => n.id === edge.source);
        const target = updatedNodes.find((n) => n.id === edge.target);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x!, source.y!);
          ctx.lineTo(target.x!, target.y!);
          ctx.stroke();
        }
      });
      
      // Draw nodes
      updatedNodes.forEach((node) => {
        const typeColors: Record<string, string> = {
          person: '#3b82f6',
          organization: '#8b5cf6',
          model: '#ec4899',
          company: '#f59e0b',
          paper: '#10b981',
          concept: '#6366f1',
        };
        
        ctx.fillStyle = typeColors[node.type] || '#6b7280';
        ctx.beginPath();
        ctx.arc(node.x!, node.y!, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.name.slice(0, 15), node.x!, node.y! + 20);
      });
      
      setSimulationNodes(updatedNodes);
    };
    
    const interval = setInterval(animate, 50);
    return () => clearInterval(interval);
  }, [simulationNodes, edges, width, height]);
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onNodeClick) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clicked = simulationNodes.find((node) => {
      const dx = x - node.x!;
      const dy = y - node.y!;
      return Math.sqrt(dx * dx + dy * dy) < 15;
    });
    
    if (clicked) {
      onNodeClick(clicked);
    }
  };
  
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">No graph data to visualize</p>
      </div>
    );
  }
  
  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        className="border rounded-lg bg-background cursor-pointer"
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries({
          person: '#3b82f6',
          organization: '#8b5cf6',
          model: '#ec4899',
          company: '#f59e0b',
          paper: '#10b981',
          concept: '#6366f1',
        }).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
