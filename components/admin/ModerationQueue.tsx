'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/shared/ToastProvider';

interface ModerationItem {
  id: string;
  content_type: string;
  content_id: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: number;
  reason?: string;
  flagged_at: string;
  review_notes?: string;
}

interface ModerationQueueProps {
  locale: 'en' | 'es';
}

export function ModerationQueue({ locale }: ModerationQueueProps) {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const { showToast } = useToast();

  const t = locale === 'en' ? {
    title: 'Moderation Queue',
    all: 'All',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    approve: 'Approve',
    reject: 'Reject',
    priority: 'Priority',
    type: 'Type',
    reason: 'Reason',
    flaggedAt: 'Flagged',
    noItems: 'No items to moderate',
    approveSuccess: 'Item approved successfully',
    rejectSuccess: 'Item rejected successfully',
    error: 'Failed to update status',
  } : {
    title: 'Cola de Moderación',
    all: 'Todos',
    pending: 'Pendiente',
    approved: 'Aprobado',
    rejected: 'Rechazado',
    approve: 'Aprobar',
    reject: 'Rechazar',
    priority: 'Prioridad',
    type: 'Tipo',
    reason: 'Razón',
    flaggedAt: 'Marcado',
    noItems: 'No hay elementos para moderar',
    approveSuccess: 'Elemento aprobado exitosamente',
    rejectSuccess: 'Elemento rechazado exitosamente',
    error: 'Error al actualizar estado',
  };

  useEffect(() => {
    loadItems();
  }, [filter]);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const status = filter === 'all' ? '' : filter;
      const response = await fetch(`/api/admin/moderation?status=${status}`);
      const data = await response.json();
      if (response.ok) {
        setItems(data.data);
      }
    } catch (error) {
      console.error('Failed to load moderation queue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (itemId: string, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, status }),
      });

      if (response.ok) {
        showToast(status === 'approved' ? t.approveSuccess : t.rejectSuccess, 'success');
        loadItems();
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
      case 'approved':
        return 'text-green-500 bg-green-500/10';
      case 'rejected':
        return 'text-red-500 bg-red-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t.title}</h2>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
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

      {/* Items List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{t.noItems}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-secondary border border-white/10"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>
                      {t[item.status as keyof typeof t]}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t.type}: {item.content_type}
                    </span>
                    {item.priority > 0 && (
                      <span className="flex items-center gap-1 text-sm text-orange-500">
                        <AlertTriangle className="w-4 h-4" />
                        {t.priority}: {item.priority}
                      </span>
                    )}
                  </div>
                  {item.reason && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {t.reason}: {item.reason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t.flaggedAt}: {new Date(item.flagged_at).toLocaleString()}
                  </p>
                </div>

                {item.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleUpdateStatus(item.id, 'approved')}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t.approve}
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus(item.id, 'rejected')}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      {t.reject}
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
