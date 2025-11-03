'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/shared/ToastProvider';

interface ContentReport {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
}

interface ContentReportsProps {
  locale: 'en' | 'es';
}

export function ContentReports({ locale }: ContentReportsProps) {
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
  const { showToast } = useToast();

  const t = locale === 'en' ? {
    title: 'Content Reports',
    all: 'All',
    pending: 'Pending',
    resolved: 'Resolved',
    resolve: 'Resolve',
    dismiss: 'Dismiss',
    type: 'Type',
    reason: 'Reason',
    reportedAt: 'Reported',
    noReports: 'No reports found',
    resolveSuccess: 'Report resolved successfully',
    dismissSuccess: 'Report dismissed successfully',
    error: 'Failed to update report',
  } : {
    title: 'Reportes de Contenido',
    all: 'Todos',
    pending: 'Pendiente',
    resolved: 'Resuelto',
    resolve: 'Resolver',
    dismiss: 'Descartar',
    type: 'Tipo',
    reason: 'Razón',
    reportedAt: 'Reportado',
    noReports: 'No hay reportes',
    resolveSuccess: 'Reporte resuelto exitosamente',
    dismissSuccess: 'Reporte descartado exitosamente',
    error: 'Error al actualizar reporte',
  };

  useEffect(() => {
    loadReports();
  }, [filter]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const status = filter === 'all' ? '' : filter;
      const response = await fetch(`/api/admin/reports?status=${status}`);
      const data = await response.json();
      if (response.ok) {
        setReports(data.data);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolve = async (reportId: string, status: 'resolved' | 'dismissed') => {
    try {
      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status }),
      });

      if (response.ok) {
        showToast(status === 'resolved' ? t.resolveSuccess : t.dismissSuccess, 'success');
        loadReports();
      } else {
        showToast(t.error, 'error');
      }
    } catch (error) {
      showToast(t.error, 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'resolved':
        return 'text-green-500 bg-green-500/10';
      case 'dismissed':
        return 'text-gray-500 bg-gray-500/10';
      default:
        return 'text-blue-500 bg-blue-500/10';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t.title}</h2>
        <div className="flex gap-2">
          {(['all', 'pending', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl transition-all ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80'
              }`}
            >
              {t[f]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t.noReports}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-secondary border border-white/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(report.status)}`}>
                      {report.status}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t.type}: {report.content_type}
                    </span>
                  </div>
                  <p className="text-sm font-semibold mb-2">{t.reason}: {report.reason}</p>
                  {report.description && (
                    <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t.reportedAt}: {new Date(report.created_at).toLocaleString()}
                  </p>
                </div>

                {report.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleResolve(report.id, 'resolved')}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t.resolve}
                    </Button>
                    <Button
                      onClick={() => handleResolve(report.id, 'dismissed')}
                      className="bg-gray-500 hover:bg-gray-600 text-white"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {t.dismiss}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
