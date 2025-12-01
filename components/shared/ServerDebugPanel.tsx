'use client';

import { useEffect, useState } from 'react';
import { X, Copy } from 'lucide-react';

interface ServerDebugData {
  route?: string;
  status?: number;
  statusText?: string;
  trace?: string;
  body?: unknown;
  triggerType?: string;
  headers?: Record<string, unknown> | null;
}

export function ServerDebugPanel() {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<ServerDebugData | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setData(d);
      setVisible(true);
    };

    window.addEventListener('server-debug', handler as EventListener);
    return () => window.removeEventListener('server-debug', handler as EventListener);
  }, []);

  if (!visible || !data) return null;

  const onCopy = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    } catch {}
  };

  return (
    <div className="group fixed bottom-6 right-6 z-50 max-w-[680px] w-[90%] md:w-[680px] rounded-2xl border border-white/10 bg-slate-900/95 text-white p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Server Debug</div>
          {data.route && <div className="text-[13px]">Route: <code className="text-slate-200">{data.route}</code></div>}
          <div className="mt-1 text-xs text-slate-300">Status: {data.status || 'N/A'} {data.statusText && `- ${data.statusText}`}</div>
          {data.trace && <div className="text-xs text-slate-300">Trace: {data.trace}</div>}
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded px-2 py-1 bg-slate-800 hover:bg-slate-700" onClick={onCopy} title="Copy debug details"><Copy className="w-4 h-4" /></button>
          <button className="rounded px-2 py-1 bg-red-600 hover:bg-red-500" onClick={() => setVisible(false)} title="Close"><X className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="mt-3 text-xs font-mono overflow-auto text-slate-200">
        <pre className="whitespace-pre-wrap max-h-56 overflow-auto">{JSON.stringify(data.body || data, null, 2)}</pre>
      </div>

      <div className="mt-2 text-[11px] text-slate-400">Trigger: {data.triggerType || 'n/a'}</div>
    </div>
  );
}
