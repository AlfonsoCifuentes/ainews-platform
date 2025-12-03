'use client';

import { motion } from 'framer-motion';

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

/**
 * AIPlaygroundStrip - Showcases autonomous AI agents
 * Reference: mues.ai clean modular sections
 */
export function AIPlaygroundStrip({ agents, locale }: AIPlaygroundStripProps) {
  const statusConfig = {
    active: { 
      color: 'bg-green-500', 
      text: locale === 'en' ? 'Active' : 'Activo',
      glow: 'shadow-green-500/50'
    },
    idle: { 
      color: 'bg-amber-500', 
      text: locale === 'en' ? 'Idle' : 'Inactivo',
      glow: 'shadow-amber-500/50'
    },
    learning: { 
      color: 'bg-primary', 
      text: locale === 'en' ? 'Learning' : 'Aprendiendo',
      glow: 'shadow-primary/50'
    },
  };

  return (
    <section className="relative py-16 lg:py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-3 mb-3"
          >
            <span className="text-2xl">🤖</span>
            <span className="text-xs uppercase tracking-[0.2em] text-primary/80 font-semibold">
              {locale === 'en' ? 'Behind the Scenes' : 'Entre Bastidores'}
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-white"
          >
            {locale === 'en' ? 'AI Playground' : 'Laboratorio IA'}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-white/50 max-w-xl mx-auto"
          >
            {locale === 'en' 
              ? 'Autonomous agents working 24/7 to curate, translate, and personalize your AI experience'
              : 'Agentes autónomos trabajando 24/7 para curar, traducir y personalizar tu experiencia IA'
            }
          </motion.p>
        </div>

        {/* Agent cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <AgentCard agent={agent} statusConfig={statusConfig} locale={locale} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AgentCard({ 
  agent, 
  statusConfig, 
  locale 
}: { 
  agent: Agent; 
  statusConfig: Record<string, { color: string; text: string; glow: string }>;
  locale: 'en' | 'es';
}) {
  const status = statusConfig[agent.status];

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="relative rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-6 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-white text-lg">{agent.name}</h3>
          <p className="text-xs text-white/40 mt-0.5">{agent.cadence}</p>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <motion.div
            className={`w-2 h-2 rounded-full ${status.color} ${status.glow} shadow-lg`}
            animate={agent.status === 'active' ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-xs text-white/50">{status.text}</span>
        </div>
      </div>

      {/* Stack badges */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {agent.stack.map((tech) => (
          <span
            key={tech}
            className="px-2 py-0.5 text-[10px] font-mono bg-white/5 border border-white/10 rounded text-white/60"
          >
            {tech}
          </span>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">
            {locale === 'en' ? 'Processed' : 'Procesados'}
          </p>
          <p className="text-lg font-bold text-white">
            {agent.metrics.processed.toLocaleString()}
          </p>
        </div>
        {agent.metrics.accuracy !== undefined && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">
              {locale === 'en' ? 'Accuracy' : 'Precisión'}
            </p>
            <p className="text-lg font-bold text-primary">
              {agent.metrics.accuracy}%
            </p>
          </div>
        )}
      </div>

      {/* Last run */}
      {agent.metrics.lastRun && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-[10px] text-white/30">
            {locale === 'en' ? 'Last run: ' : 'Última ejecución: '}
            <span className="text-white/50">{agent.metrics.lastRun}</span>
          </p>
        </div>
      )}

      {/* Hover glow */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/0 via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}
