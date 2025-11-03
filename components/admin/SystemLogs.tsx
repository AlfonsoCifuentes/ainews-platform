'use client';

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

interface SystemLog {
  id: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  created_at: string;
}

export function SystemLogs({ locale }: { locale: 'en' | 'es' }) {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const t = locale === 'en' ? {
    title: 'System Logs',
    action: 'Action',
    resource: 'Resource',
    timestamp: 'Timestamp',
    noLogs: 'No logs found',
  } : {
    title: 'Registros del Sistema',
    action: 'Acción',
    resource: 'Recurso',
    timestamp: 'Fecha',
    noLogs: 'No hay registros',
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const response = await fetch('/api/admin/logs');
      const data = await response.json();
      if (response.ok) {
        setLogs(data.data);
      }
    } catch {
      console.error('Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t.title}</h2>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t.noLogs}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-xl bg-secondary border border-white/10 hover:border-primary/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="font-semibold">{log.action}</span>
                  {log.resource_type && (
                    <span className="text-sm text-muted-foreground ml-3">
                      {t.resource}: {log.resource_type}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
