'use client';

import { Cpu, Activity, Database, Eye } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  cadence: string;
  stack: string[];
  status: 'active' | 'idle' | 'learning';
  metrics: {
    processed: number;
    accuracy?: number;
    lastRun?: string;
  };
}

interface AIPlaygroundStripProps {
  agents: Agent[];
  locale: 'en' | 'es';
}

function getIcon(name: string) {
  if (name.includes('Trend') || name.includes('Detector')) return <Activity size={20} />;
  if (name.includes('Course') || name.includes('Generator')) return <Database size={20} />;
  if (name.includes('Fact') || name.includes('Checker')) return <Eye size={20} />;
  return <Cpu size={20} />;
}

/**
 * AIPlaygroundStrip - Brutalist agent cards grid
 * - Section numbering (03 — PLAYGROUND)
 * - Status indicators with glow
 * - Efficiency metrics
 */
export function AIPlaygroundStrip({ agents, locale }: AIPlaygroundStripProps) {
  return (
    <section className="py-24 border-t border-[#1F1F1F] relative z-10 bg-[#020309]">
      <div className="px-6 md:px-12 max-w-7xl mx-auto">
        <div className="mb-12">
          <h2 className="text-sm font-mono tracking-widest text-[#888888]">
            03 — {locale === 'en' ? 'AI PLAYGROUND' : 'LABORATORIO IA'}
          </h2>
          <div className="h-px w-24 bg-white/50 mt-2" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-[#0A0A0A]/50 border border-[#1F1F1F] p-6 hover:bg-[#0A0A0A] hover:border-white/20 transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-2 bg-white/5 rounded-sm text-white group-hover:text-black group-hover:bg-white transition-colors">
                  {getIcon(agent.name)}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      agent.status === 'active'
                        ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                        : agent.status === 'learning'
                        ? 'bg-yellow-500 animate-pulse'
                        : 'bg-gray-500'
                    }`}
                  />
                  <span className="text-[10px] uppercase font-mono tracking-wide text-[#888888]">
                    {agent.status}
                  </span>
                </div>
              </div>
              <h4 className="text-lg font-bold text-[#EAEAEA] mb-1">{agent.name}</h4>
              <p className="text-sm text-[#888888] mb-4">{agent.cadence}</p>

              <div className="flex flex-wrap gap-1 mb-4">
                {agent.stack.map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-0.5 text-[10px] font-mono border border-white/10 text-white/60 bg-black/30"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              <div className="flex justify-between items-end border-t border-white/5 pt-4">
                <span className="text-xs font-mono text-[#888888]">
                  {locale === 'en' ? 'PROCESSED' : 'PROCESADOS'}
                </span>
                <span className="text-xl font-mono text-white">{agent.metrics.processed}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
