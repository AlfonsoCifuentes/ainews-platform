'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { logger, type LogEntry } from '@/lib/utils/logging';
import {
  clearLogs as clearInlineLogs,
  getLogs as getInlineLogs,
  type ClientLogEntry,
} from '@/lib/utils/logger';
import {
  AlertTriangle,
  Bug,
  Copy,
  Download,
  Filter,
  Globe,
  Database,
  Pin,
  PinOff,
  RefreshCw,
  ScrollText,
  Trash2,
} from 'lucide-react';

type CombinedLog = {
  id: string;
  timestamp: string;
  level: string;
  component: string;
  message: string;
  data?: string | null;
  source: 'client' | 'runtime';
};

const parseTimestamp = (value: string): number => {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

const LEVEL_TAGS: Record<string, string> = {
  error: 'bg-red-500/20 text-red-200 border border-red-500/40',
  warn: 'bg-yellow-500/20 text-yellow-100 border border-yellow-500/40',
  info: 'bg-blue-500/20 text-blue-100 border border-blue-500/40',
  debug: 'bg-gray-500/20 text-gray-100 border border-gray-500/40',
  success: 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/40',
  network: 'bg-purple-500/20 text-purple-100 border border-purple-500/40',
  db: 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/40',
};

const LEVEL_FILTERS = ['all', 'error', 'warn', 'info', 'debug', 'success', 'network', 'db'] as const;

export function LogDashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [clientLogs, setClientLogs] = useState<ClientLogEntry[]>([]);
  const [runtimeLogs, setRuntimeLogs] = useState<LogEntry[]>([]);
  const [levelFilter, setLevelFilter] = useState<(typeof LEVEL_FILTERS)[number]>('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [pinLeft, setPinLeft] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setClientLogs(getInlineLogs());
    setRuntimeLogs(logger.getLogs());

    const handleClientLog = (event: Event) => {
      const payload = event as CustomEvent<ClientLogEntry>;
      setClientLogs((prev) => {
        const next = [...prev, payload.detail];
        return next.slice(-350);
      });
    };

    window.addEventListener('thotnet-log', handleClientLog as EventListener);

    const interval = window.setInterval(() => {
      setRuntimeLogs(logger.getLogs());
    }, 1500);

    const handleServerDebug = (event: Event) => {
      // Open the dashboard when a server debug event is emitted
      setIsOpen(true);
      // also log a runtime entry about the server debug
      const payload = (event as CustomEvent).detail;
      logger.error('ServerDebug', 'Server debug occurred', payload);
    };

    window.addEventListener('server-debug', handleServerDebug as EventListener);

    return () => {
      window.removeEventListener('thotnet-log', handleClientLog as EventListener);
      window.removeEventListener('server-debug', handleServerDebug as EventListener);
      window.clearInterval(interval);
    };
  }, []);

  const combinedLogs = useMemo<CombinedLog[]>(() => {
    const client = clientLogs.map((entry) => ({
      id: `${entry.id}-client`,
      timestamp: entry.timestamp,
      level: entry.level,
      component: entry.module,
      message: entry.message,
      data: entry.data,
      source: 'client' as const,
    }));

    const runtime = runtimeLogs.map((entry, idx) => ({
      id: `${entry.timestamp}-${idx}`,
      timestamp: entry.timestamp,
      level: entry.level,
      component: entry.component,
      message: entry.message,
      data: entry.data ? JSON.stringify(entry.data, null, 2) : undefined,
      source: 'runtime' as const,
    }));

    return [...client, ...runtime].sort((a, b) =>
      parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp)
    );
  }, [clientLogs, runtimeLogs]);

  const moduleOptions = useMemo(() => {
    const modules = new Set<string>(['all']);
    combinedLogs.forEach((log) => modules.add(log.component));
    return Array.from(modules);
  }, [combinedLogs]);

  const filteredLogs = useMemo(() => {
    return combinedLogs.filter((log) => {
      if (levelFilter !== 'all' && log.level !== levelFilter) return false;
      if (moduleFilter !== 'all' && log.component !== moduleFilter) return false;
      if (searchQuery) {
        const term = searchQuery.toLowerCase();
        return (
          log.message.toLowerCase().includes(term) ||
          log.component.toLowerCase().includes(term) ||
          (log.data?.toLowerCase().includes(term) ?? false)
        );
      }
      return true;
    });
  }, [combinedLogs, levelFilter, moduleFilter, searchQuery]);

  const errorCount = combinedLogs.filter((log) => log.level === 'error').length;
  const warnCount = combinedLogs.filter((log) => log.level === 'warn').length;

  useEffect(() => {
    if (!isOpen || !autoScroll) return;
    const el = logContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [filteredLogs, isOpen, autoScroll]);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(filteredLogs, null, 2)).catch(() => {
      // ignore
    });
  };

  const handleExport = () => {
    const text = JSON.stringify(combinedLogs, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `thotnet-logs-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    logger.clearLogs();
    clearInlineLogs();
    setClientLogs([]);
    setRuntimeLogs([]);
  };

  const positionClasses = pinLeft ? 'left-0 pl-4' : 'right-0 pr-4';

  // Count network and db logs
  const networkCount = combinedLogs.filter((log) => log.level === 'network').length;
  const dbCount = combinedLogs.filter((log) => log.level === 'db').length;

  return (
    <div className={`fixed bottom-0 z-[80] pointer-events-none ${positionClasses}`}>
      {/* Minimal bug icon button - only shows badge when there are errors/warnings */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`pointer-events-auto relative mb-4 flex items-center justify-center rounded-full p-2.5 shadow-lg transition-all ${
          isOpen
            ? 'bg-purple-600 text-white'
            : errorCount > 0
            ? 'bg-red-600 text-white animate-pulse'
            : warnCount > 0
            ? 'bg-yellow-500 text-black'
            : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white'
        }`}
        title="Toggle debug overlay"
      >
        <Bug className="h-4 w-4" />
        {(errorCount > 0 || warnCount > 0) && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {errorCount + warnCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`pointer-events-auto mb-6 max-h-[70vh] w-[420px] rounded-2xl border border-white/10 bg-slate-900/95 text-white shadow-2xl backdrop-blur-xl ${
            pinLeft ? 'ml-4' : 'mr-4'
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs uppercase tracking-wide text-slate-300">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              ThotNet Core Diagnostics
            </div>
            <div className="flex items-center gap-3 text-[10px] font-semibold">
              <div className="flex items-center gap-1 text-red-300" title="Errors">
                <AlertTriangle className="h-3 w-3" /> {errorCount}
              </div>
              <div className="flex items-center gap-1 text-yellow-200" title="Warnings">
                <Filter className="h-3 w-3" /> {warnCount}
              </div>
              <div className="flex items-center gap-1 text-purple-300" title="Network calls">
                <Globe className="h-3 w-3" /> {networkCount}
              </div>
              <div className="flex items-center gap-1 text-cyan-300" title="DB calls">
                <Database className="h-3 w-3" /> {dbCount}
              </div>
              <button
                className="rounded-full border border-white/10 p-1 transition hover:bg-white/10"
                onClick={() => setPinLeft((prev) => !prev)}
                title={pinLeft ? 'Unpin from left' : 'Pin to left'}
              >
                {pinLeft ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-3 border-b border-white/5 px-4 py-3 text-xs">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Nivel</label>
                <select
                  className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-xs"
                  value={levelFilter}
                  onChange={(event) => setLevelFilter(event.target.value as (typeof LEVEL_FILTERS)[number])}
                >
                  {LEVEL_FILTERS.map((level) => (
                    <option key={level} value={level}>
                      {level.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Módulo</label>
                <select
                  className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-xs"
                  value={moduleFilter}
                  onChange={(event) => setModuleFilter(event.target.value)}
                >
                  {moduleOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">Buscar</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Trace ID, mensaje, módulo..."
                  className="flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <button
                  className={`rounded-full border border-white/10 p-2 transition ${autoScroll ? 'bg-white/10' : 'bg-transparent'}`}
                  onClick={() => setAutoScroll((prev) => !prev)}
                  title={autoScroll ? 'Desactivar auto-scroll' : 'Activar auto-scroll'}
                >
                  {autoScroll ? <ScrollText className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div ref={logContainerRef} className="max-h-[45vh] overflow-y-auto px-4 py-3 text-xs">
            {filteredLogs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-slate-400">
                No hay logs para los filtros seleccionados.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="mb-3 rounded-xl border border-white/5 bg-white/5 p-3 shadow-inner">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>
                      {(() => {
                        const parsed = new Date(log.timestamp);
                        return Number.isNaN(parsed.getTime())
                          ? log.timestamp
                          : parsed.toLocaleTimeString();
                      })()}
                    </span>
                    <span className="uppercase tracking-wide text-slate-400">{log.source}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${LEVEL_TAGS[log.level] ?? LEVEL_TAGS.debug}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-200">[{log.component}]</span>
                  </div>
                  <p className="mt-2 text-sm text-white">{log.message}</p>
                  {log.data && (
                    <details className="mt-2 rounded-lg bg-black/40 p-2 text-[11px] text-slate-200">
                      <summary className="cursor-pointer select-none text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Detalles
                      </summary>
                      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] text-slate-200">
                        {log.data}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-slate-400">
            <span>{combinedLogs.length} eventos registrados</span>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-white/10 p-2 transition hover:bg-white/10"
                onClick={handleCopy}
                title="Copiar logs filtrados"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded-full border border-white/10 p-2 transition hover:bg-white/10"
                onClick={handleExport}
                title="Exportar JSON"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                className="rounded-full border border-red-400/40 p-2 text-red-200 transition hover:bg-red-500/10"
                onClick={handleClear}
                title="Limpiar todo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
