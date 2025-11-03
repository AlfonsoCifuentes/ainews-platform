'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  TrendingUp,
  Shield,
  FileCheck,
  GitCompare,
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface AgentStatus {
  name: string;
  type: string;
  status: 'idle' | 'running' | 'success' | 'error';
  lastRun: string;
  successRate: number;
  operationsToday: number;
}

interface AgentControlsProps {
  locale: 'en' | 'es';
}

export function AgentControls({ locale }: AgentControlsProps) {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const t = locale === 'en' ? {
    title: 'AI Agent Control Center',
    runNow: 'Run Now',
    viewLogs: 'View Logs',
    idle: 'Idle',
    running: 'Running',
    success: 'Success',
    error: 'Error',
    operations: 'Operations',
    successRate: 'Success Rate',
    lastRun: 'Last Run',
  } : {
    title: 'Centro de Control de Agentes IA',
    runNow: 'Ejecutar Ahora',
    viewLogs: 'Ver Registros',
    idle: 'Inactivo',
    running: 'Ejecutando',
    success: 'Éxito',
    error: 'Error',
    operations: 'Operaciones',
    successRate: 'Tasa de Éxito',
    lastRun: 'Última Ejecución',
  };

  const agentConfig = [
    {
      name: 'Trend Detector',
      type: 'trend_detector',
      icon: TrendingUp,
      color: 'from-orange-500 to-red-500',
    },
    {
      name: 'Fact Checker',
      type: 'fact_checker',
      icon: FileCheck,
      color: 'from-green-500 to-emerald-500',
    },
    {
      name: 'Bias Auditor',
      type: 'bias_auditor',
      icon: Shield,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      name: 'Multi-Perspective',
      type: 'multi_perspective',
      icon: GitCompare,
      color: 'from-purple-500 to-pink-500',
    },
  ];

  useEffect(() => {
    loadAgentStatus();
    const interval = setInterval(loadAgentStatus, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadAgentStatus = async () => {
    try {
      const response = await fetch('/api/agents/status');
      const data = await response.json();
      if (response.ok) {
        setAgents(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load agent status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runAgent = async (type: string) => {
    try {
      await fetch('/api/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType: type }),
      });
      await loadAgentStatus();
    } catch (error) {
      console.error('Failed to run agent:', error);
    }
  };

  const getStatusIcon = (status: AgentStatus['status']) => {
    switch (status) {
      case 'running':
        return <Activity className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Zap className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Brain className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <Brain className="h-8 w-8 text-primary" />
          {t.title}
        </h2>
        <p className="text-muted-foreground">Monitor and control AI agents</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {agentConfig.map((config) => {
          const status = agents.find(a => a.type === config.type);
          const Icon = config.icon;

          return (
            <motion.div
              key={config.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-3xl bg-gradient-to-br ${config.color} p-[1px]`}
            >
              <div className="rounded-3xl bg-black/90 p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${config.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{config.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {status && getStatusIcon(status.status)}
                        <span className="text-sm text-muted-foreground">
                          {status?.status || 'idle'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {status && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-xl bg-white/5">
                        <div className="text-xs text-muted-foreground mb-1">
                          {t.operations}
                        </div>
                        <div className="text-2xl font-bold">
                          {status.operationsToday}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white/5">
                        <div className="text-xs text-muted-foreground mb-1">
                          {t.successRate}
                        </div>
                        <div className="text-2xl font-bold">
                          {Math.round(status.successRate)}%
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {t.successRate}
                      </div>
                      <Progress value={status.successRate} className="h-2" />
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {t.lastRun}: {new Date(status.lastRun).toLocaleString(locale)}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => runAgent(config.type)}
                        disabled={status.status === 'running'}
                        className="flex-1"
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        {t.runNow}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.location.href = `/admin/logs?agent=${config.type}`}
                      >
                        {t.viewLogs}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
