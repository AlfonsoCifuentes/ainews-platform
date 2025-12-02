import { useState, useEffect, useCallback } from 'react';
import type { ModuleVisualSlot, ModuleVisualSlotType } from '@/lib/types/visual-slots';

interface UseModuleVisualSlotsOptions {
  slotType?: ModuleVisualSlotType;
  limit?: number;
}

interface UseModuleVisualSlotsResult {
  slots: ModuleVisualSlot[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useModuleVisualSlots(
  moduleId: string | null | undefined,
  locale: 'en' | 'es',
  options: UseModuleVisualSlotsOptions = {}
): UseModuleVisualSlotsResult {
  const [slots, setSlots] = useState<ModuleVisualSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refresh = useCallback(() => setRefreshNonce((value) => value + 1), []);

  useEffect(() => {
    if (!moduleId) {
      setSlots([]);
      return;
    }

    const safeModuleId = moduleId;

    let isMounted = true;
    const controller = new AbortController();

    async function fetchSlots() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ moduleId: safeModuleId, locale });
        if (options.slotType) params.set('slotType', options.slotType);
        if (options.limit) params.set('limit', String(options.limit));

        const response = await fetch(`/api/courses/modules/visual-slots?${params.toString()}`, {
          method: 'GET',
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || 'Failed to fetch visual slots');
        }

        const payload = await response.json() as {
          success: boolean;
          slots?: ModuleVisualSlot[];
          error?: string;
        };

        if (!isMounted) return;

        if (!payload.success) {
          throw new Error(payload.error || 'Failed to fetch visual slots');
        }

        setSlots(payload.slots ?? []);
      } catch (err) {
        if (!isMounted) return;
        console.error('[useModuleVisualSlots] Error', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setSlots([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void fetchSlots();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [moduleId, locale, options.slotType, options.limit, refreshNonce]);

  return { slots, loading, error, refresh };
}
