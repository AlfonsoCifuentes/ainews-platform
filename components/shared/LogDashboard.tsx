'use client';

import { useState, useEffect } from 'react';
import { logger, type LogEntry } from '@/lib/utils/logging';
import { ChevronDown, Copy, Trash2 } from 'lucide-react';

export function LogDashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info' | 'debug'>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    // Update logs every second
    const interval = setInterval(() => {
      const allLogs = logger.getLogs();
      const filtered = filter === 'all' 
        ? allLogs 
        : allLogs.filter(log => log.level === filter);
      setLogs(filtered);
    }, 1000);

    return () => clearInterval(interval);
  }, [filter]);

  const exportLogs = () => {
    const text = logger.exportLogs();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.json`;
    a.click();
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(logger.exportLogs());
  };

  const errorCount = logger.getLogsByLevel('error').length;
  const warnCount = logger.getLogsByLevel('warn').length;

  return (
    <div className="fixed bottom-0 right-0 z-50">
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`m-4 rounded-full p-3 shadow-lg transition-all ${
          isOpen 
            ? 'bg-red-600 text-white' 
            : errorCount > 0 
            ? 'bg-red-500 text-white animate-pulse' 
            : warnCount > 0 
            ? 'bg-yellow-500 text-white' 
            : 'bg-gray-800 text-white hover:bg-gray-700'
        }`}
        title={`Logs: ${errorCount} errors, ${warnCount} warnings`}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">Logs</span>
          {errorCount > 0 && <span className="bg-red-700 rounded-full w-5 h-5 flex items-center justify-center text-xs">{errorCount}</span>}
          {warnCount > 0 && !isOpen && <span className="bg-yellow-700 rounded-full w-5 h-5 flex items-center justify-center text-xs">{warnCount}</span>}
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Log Panel */}
      {isOpen && (
        <div className="absolute bottom-20 right-4 w-96 max-h-96 bg-gray-900 text-white border border-gray-700 rounded-lg shadow-2xl flex flex-col">
          {/* Header */}
          <div className="bg-gray-800 p-3 border-b border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-sm">Debug Logs</h3>
            <div className="flex gap-2">
              <button
                onClick={copyLogs}
                title="Copy logs"
                className="p-1 hover:bg-gray-700 rounded"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={exportLogs}
                title="Export logs"
                className="p-1 hover:bg-gray-700 rounded text-xs"
              >
                📥
              </button>
              <button
                onClick={() => logger.clearLogs()}
                title="Clear logs"
                className="p-1 hover:bg-gray-700 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="bg-gray-800 px-3 py-2 flex gap-2 border-b border-gray-700 flex-wrap">
            {(['all', 'error', 'warn', 'info', 'debug'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setFilter(level)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filter === level
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {level.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Logs Container */}
          <div className="overflow-y-auto flex-1 font-mono text-xs p-3 space-y-1">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`py-1 px-2 rounded ${
                    log.level === 'error'
                      ? 'bg-red-900/30 text-red-300'
                      : log.level === 'warn'
                      ? 'bg-yellow-900/30 text-yellow-300'
                      : log.level === 'info'
                      ? 'bg-blue-900/30 text-blue-300'
                      : 'text-gray-400'
                  }`}
                >
                  <span className="opacity-60 text-xs">{log.timestamp.split('T')[1].split('.')[0]}</span>{' '}
                  <span className="font-bold">[{log.component}]</span>{' '}
                  <span>{log.message}</span>
                  {log.data !== undefined && (
                    <details className="mt-1 ml-4 text-xs opacity-75">
                      <summary className="cursor-pointer hover:underline">Details</summary>
                      <pre className="mt-1 overflow-auto text-xs bg-black/30 p-1 rounded">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Auto-scroll toggle */}
          <div className="bg-gray-800 p-2 border-t border-gray-700 flex items-center gap-2">
            <input
              type="checkbox"
              id="autoscroll"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="autoscroll" className="text-xs cursor-pointer">
              Auto-scroll
            </label>
            <span className="ml-auto text-xs opacity-60">
              {logs.length} logs
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
