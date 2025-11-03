'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Network, Search, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Node {
  id: string;
  label: string;
  type: 'company' | 'technology' | 'person' | 'concept';
  connections: number;
}

interface Edge {
  source: string;
  target: string;
  type: string;
}

interface KnowledgeGraphClientProps {
  locale: 'en' | 'es';
}

export function KnowledgeGraphClient({ locale }: KnowledgeGraphClientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const t = locale === 'en' ? {
    title: 'AI Knowledge Graph',
    subtitle: 'Explore the interconnected world of AI',
    search: 'Search entities...',
    filter: 'Filter',
    all: 'All',
    companies: 'Companies',
    technologies: 'Technologies',
    people: 'People',
    concepts: 'Concepts',
    connections: 'connections',
    noData: 'No data available',
    loading: 'Loading knowledge graph...',
  } : {
    title: 'Grafo de Conocimiento IA',
    subtitle: 'Explora el mundo interconectado de la IA',
    search: 'Buscar entidades...',
    filter: 'Filtrar',
    all: 'Todos',
    companies: 'Empresas',
    technologies: 'Tecnologías',
    people: 'Personas',
    concepts: 'Conceptos',
    connections: 'conexiones',
    noData: 'No hay datos disponibles',
    loading: 'Cargando grafo de conocimiento...',
  };

  useEffect(() => {
    // Load sample data (in production, fetch from API)
    const sampleNodes: Node[] = [
      { id: '1', label: 'OpenAI', type: 'company', connections: 15 },
      { id: '2', label: 'GPT-4', type: 'technology', connections: 12 },
      { id: '3', label: 'Sam Altman', type: 'person', connections: 8 },
      { id: '4', label: 'Transformer', type: 'concept', connections: 20 },
      { id: '5', label: 'Google DeepMind', type: 'company', connections: 18 },
      { id: '6', label: 'Gemini', type: 'technology', connections: 10 },
      { id: '7', label: 'Anthropic', type: 'company', connections: 9 },
      { id: '8', label: 'Claude', type: 'technology', connections: 11 },
      { id: '9', label: 'LLM', type: 'concept', connections: 25 },
      { id: '10', label: 'Neural Network', type: 'concept', connections: 22 },
    ];

    const sampleEdges: Edge[] = [
      { source: '1', target: '2', type: 'develops' },
      { source: '1', target: '3', type: 'led_by' },
      { source: '2', target: '4', type: 'uses' },
      { source: '2', target: '9', type: 'is_a' },
      { source: '5', target: '6', type: 'develops' },
      { source: '6', target: '9', type: 'is_a' },
      { source: '7', target: '8', type: 'develops' },
      { source: '8', target: '9', type: 'is_a' },
      { source: '9', target: '10', type: 'based_on' },
      { source: '4', target: '10', type: 'type_of' },
    ];

    setNodes(sampleNodes);
    setEdges(sampleEdges);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate node positions (simple circular layout)
    const centerX = canvas.width / 4;
    const centerY = canvas.height / 4;
    const radius = Math.min(centerX, centerY) * 0.7;

    const positions = nodes.map((_, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });

    // Draw edges
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
    ctx.lineWidth = 1;
    edges.forEach((edge) => {
      const sourceIdx = nodes.findIndex(n => n.id === edge.source);
      const targetIdx = nodes.findIndex(n => n.id === edge.target);
      if (sourceIdx === -1 || targetIdx === -1) return;

      const source = positions[sourceIdx];
      const target = positions[targetIdx];

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach((node, i) => {
      const pos = positions[i];
      const size = 8 + (node.connections / 5);

      // Node color based on type
      const colors = {
        company: '#3b82f6',
        technology: '#8b5cf6',
        person: '#ec4899',
        concept: '#10b981',
      };

      // Draw node circle
      ctx.fillStyle = colors[node.type];
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
      ctx.fill();

      // Draw label
      ctx.fillStyle = '#fff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, pos.x, pos.y + size + 15);
    });
  }, [nodes, edges]);

  const filteredNodes = nodes.filter((node) => {
    const matchesSearch = node.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || node.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <Network className="h-5 w-5 text-purple-500" />
            <span className="text-sm font-medium text-purple-300">Knowledge Graph</span>
          </div>
          
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </motion.div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterType('all')}
              size="sm"
            >
              {t.all}
            </Button>
            <Button
              variant={filterType === 'company' ? 'default' : 'outline'}
              onClick={() => setFilterType('company')}
              size="sm"
            >
              {t.companies}
            </Button>
            <Button
              variant={filterType === 'technology' ? 'default' : 'outline'}
              onClick={() => setFilterType('technology')}
              size="sm"
            >
              {t.technologies}
            </Button>
            <Button
              variant={filterType === 'person' ? 'default' : 'outline'}
              onClick={() => setFilterType('person')}
              size="sm"
            >
              {t.people}
            </Button>
            <Button
              variant={filterType === 'concept' ? 'default' : 'outline'}
              onClick={() => setFilterType('concept')}
              size="sm"
            >
              {t.concepts}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graph Visualization */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 h-[600px]">
              <canvas
                ref={canvasRef}
                className="w-full h-full rounded-xl bg-black/20"
              />
            </div>
          </div>

          {/* Entity List */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold mb-4">
              Entities ({filteredNodes.length})
            </h3>
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredNodes.map((node) => (
                <motion.button
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  whileHover={{ scale: 1.02 }}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    selectedNode?.id === node.id
                      ? 'bg-primary text-white'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{node.label}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      node.type === 'company' ? 'bg-blue-500/20 text-blue-300' :
                      node.type === 'technology' ? 'bg-purple-500/20 text-purple-300' :
                      node.type === 'person' ? 'bg-pink-500/20 text-pink-300' :
                      'bg-green-500/20 text-green-300'
                    }`}>
                      {node.type}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {node.connections} {t.connections}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10"
        >
          <div className="flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-primary" />
            <h3 className="font-bold">Legend</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500" />
              <span className="text-sm">{t.companies}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-500" />
              <span className="text-sm">{t.technologies}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-pink-500" />
              <span className="text-sm">{t.people}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500" />
              <span className="text-sm">{t.concepts}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
