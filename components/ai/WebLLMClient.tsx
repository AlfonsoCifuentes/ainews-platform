'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Brain, Download, Lock, RefreshCw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/Badge';
import { useWebLLM } from '@/hooks/use-web-llm';
import {
  getWebLLMModelMetadata,
  WEBLLM_MODEL_CATALOG,
  type WebLLMModelMetadata,
} from '@/lib/ai/web-llm';

interface WebLLMClientProps {
  locale: 'en' | 'es';
  onReady?: () => void;
}

export function WebLLMClient({ locale, onReady }: WebLLMClientProps) {
  const t = locale === 'en'
    ? {
        title: '🔒 Privacy Mode: On-Device AI (Optional)',
        subtitle: 'Run advanced AI models fully inside your browser — perfect for power users.',
        download: 'Download & Activate Model',
        loadCached: 'Load Cached Model',
        loading: 'Loading model…',
        ready: 'Model Ready • 100% Private',
        notSupported: 'Not available on this device',
        notSupportedMessage:
          'WebLLM requires a desktop browser with WebGPU support. Mobile and tablet users automatically rely on our fast cloud AI (OpenRouter/Groq).',
        benefits: [
          '🔒 Complete privacy — data never leaves your device',
          '⚡ Works offline after the first download',
          '💰 Zero API costs — entirely browser based',
          '🚀 Low latency once the model is cached',
        ],
        warnings: [
          '⚠️ Initial download: ~5GB (one-time)',
          '⚠️ Minimum 8GB RAM recommended',
          '⚠️ Desktop only (Chrome 113+, Edge 113+)',
          '⚠️ Requires GPU with WebGPU support',
        ],
        defaultMode: 'Default mode: Hyper-fast cloud AI (no download required).',
        modelLabel: 'Model',
        recommendedBadge: 'Recommended',
        cacheTitle: 'Detected local models',
        cacheEmpty: 'No local models detected yet. Download once to keep it cached for instant use.',
        cacheHint: 'Models stay cached in IndexedDB. Detection runs automatically on every visit.',
        rescan: 'Rescan cache',
        statusLabel: 'Status',
        checkingCache: 'Detecting local models…',
        lastStatus: 'Last status',
        errorTitle: 'Model load failed',
        errorHint: 'Retry the download or clear the cache if the problem persists.',
        cachedBadge: 'Cached locally',
        benefitsTitle: '✨ Benefits',
        requirementsTitle: '⚠️ Requirements',
        cloudHighlights: [
          '• Powered by OpenRouter & Groq (free tiers)',
          '• Fast responses (~500ms average)',
          '• Works on all devices (mobile, tablet, desktop)',
          '• No installation required',
        ],
        enableTip: 'For power users: Try Chrome 113+ or Edge 113+ with WebGPU enabled to unlock on-device AI.',
      }
    : {
        title: '🔒 Modo Privacidad: IA en tu Dispositivo (Opcional)',
        subtitle: 'Ejecuta modelos avanzados totalmente en tu navegador — ideal para usuarios expertos.',
        download: 'Descargar y Activar Modelo',
        loadCached: 'Cargar modelo en caché',
        loading: 'Cargando modelo…',
        ready: 'Modelo Listo • 100% Privado',
        notSupported: 'No disponible en este dispositivo',
        notSupportedMessage:
          'WebLLM requiere navegador de escritorio con soporte WebGPU. Los usuarios móviles/tablet usan automáticamente nuestra IA cloud rápida (OpenRouter/Groq).',
        benefits: [
          '🔒 Privacidad total — los datos nunca salen de tu equipo',
          '⚡ Funciona sin conexión tras la primera descarga',
          '💰 Cero costos API — todo ocurre en el navegador',
          '🚀 Baja latencia cuando el modelo está en caché',
        ],
        warnings: [
          '⚠️ Descarga inicial: ~5GB (una sola vez)',
          '⚠️ Se recomienda mínimo 8GB de RAM',
          '⚠️ Solo escritorio (Chrome 113+, Edge 113+)',
          '⚠️ GPU compatible con WebGPU requerida',
        ],
        defaultMode: 'Modo por defecto: IA cloud ultrarrápida (sin descarga).',
        modelLabel: 'Modelo',
        recommendedBadge: 'Recomendado',
        cacheTitle: 'Modelos locales detectados',
        cacheEmpty: 'Aún no detectamos modelos locales. Descárgalo una vez y quedará en caché.',
        cacheHint: 'Los modelos permanecen en IndexedDB. La detección ocurre automáticamente en cada visita.',
        rescan: 'Re-escanear caché',
        statusLabel: 'Estado',
        checkingCache: 'Detectando modelos locales…',
        lastStatus: 'Último estado',
        errorTitle: 'Error al cargar el modelo',
        errorHint: 'Intenta descargar de nuevo o limpia la caché si el problema persiste.',
        cachedBadge: 'En caché local',
        benefitsTitle: '✨ Beneficios',
        requirementsTitle: '⚠️ Requisitos',
        cloudHighlights: [
          '• Impulsado por OpenRouter y Groq (niveles gratuitos)',
          '• Respuestas rápidas (~500ms de promedio)',
          '• Funciona en todos los dispositivos (móvil, tablet, escritorio)',
          '• Sin instalación necesaria',
        ],
        enableTip: 'Para usuarios avanzados: Usa Chrome 113+ o Edge 113+ con WebGPU habilitado para activar la IA local.',
      };

  const {
    supported,
    ready,
    progress,
    statusText,
    isLoading,
    error,
    cachedModels,
    checkingCache,
    selectedModelId,
    setSelectedModelId,
    refreshCachedModels,
    loadModel,
  } = useWebLLM({
    autoLoadFromCache: true,
    onReady: () => onReady?.(),
  });

  const availableModels = useMemo<WebLLMModelMetadata[]>(() => {
    const map = new Map<string, WebLLMModelMetadata>();
    for (const model of WEBLLM_MODEL_CATALOG) {
      map.set(model.modelId, model);
    }
    for (const cached of cachedModels) {
      map.set(cached.modelId, cached);
    }
    if (!map.has(selectedModelId)) {
      map.set(selectedModelId, getWebLLMModelMetadata(selectedModelId));
    }
    return Array.from(map.values());
  }, [cachedModels, selectedModelId]);

  const metadata = useMemo(
    () => getWebLLMModelMetadata(selectedModelId),
    [selectedModelId],
  );

  const isSelectedCached = cachedModels.some((model) => model.modelId === selectedModelId);
  const ctaLabel = isSelectedCached ? t.loadCached : t.download;

  if (!supported) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl bg-blue-500/10 border border-blue-500/30 p-6"
      >
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-8 w-8 text-blue-400 flex-shrink-0" />
          <div className="space-y-3">
            <div>
              <h3 className="text-xl font-bold mb-2">{t.notSupported}</h3>
              <p className="text-sm text-muted-foreground">{t.notSupportedMessage}</p>
            </div>

            <div className="rounded-2xl bg-muted/50 border border-border p-4">
              <p className="text-sm font-semibold text-primary mb-2">✅ {t.defaultMode}</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {t.cloudHighlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-muted-foreground mt-2">{t.enableTip}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/10 p-6 space-y-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2 mb-1">
            <Brain className="h-6 w-6 text-primary" />
            {t.title}
          </h3>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        {ready && <Lock className="h-5 w-5 text-green-500" />}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.modelLabel}</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{metadata.label}</span>
            {metadata.recommended && <Badge variant="outline">{t.recommendedBadge}</Badge>}
            {isSelectedCached && <Badge variant="secondary">{t.cachedBadge}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">{metadata.size}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t.statusLabel}</span>
            {statusText && <span>{statusText}</span>}
          </div>
          {isLoading ? (
            <>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
            </>
          ) : ready ? (
            <p className="text-sm font-semibold text-green-400">{t.ready}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t.defaultMode}</p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4">
          <p className="text-sm font-semibold text-red-300">{t.errorTitle}</p>
          <p className="text-xs text-red-200">{t.errorHint}</p>
          <p className="text-xs text-red-200 mt-1">{error}</p>
        </div>
      )}

      <div className="space-y-3 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-primary">{t.cacheTitle}</h4>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => void refreshCachedModels()}
            disabled={checkingCache}
          >
            <RefreshCw className={`h-4 w-4 ${checkingCache ? 'animate-spin' : ''}`} />
            <span>{checkingCache ? t.checkingCache : t.rescan}</span>
          </Button>
        </div>

        {availableModels.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2">
            {availableModels.map((model) => {
              const isActive = model.modelId === selectedModelId;
              const cached = cachedModels.some((item) => item.modelId === model.modelId);
              return (
                <button
                  key={model.modelId}
                  type="button"
                  onClick={() => setSelectedModelId(model.modelId)}
                  className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                    isActive
                      ? 'border-primary bg-primary/20 shadow-lg'
                      : 'border-white/10 bg-white/5 hover:border-primary/60 hover:bg-primary/10'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{model.label}</span>
                    {model.recommended && <Badge variant="outline">{t.recommendedBadge}</Badge>}
                    {cached && <Badge variant="secondary">{t.cachedBadge}</Badge>}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{model.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{model.size}</p>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t.cacheEmpty}</p>
        )}

        <p className="text-xs text-muted-foreground">{t.cacheHint}</p>
      </div>

      <div className="space-y-2 border-t border-white/10 pt-4">
        <h4 className="text-sm font-semibold text-primary mb-2">{t.benefitsTitle}</h4>
        {t.benefits.map((benefit, index) => (
          <motion.div
            key={benefit}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-2 text-sm"
          >
            <Zap className="mt-0.5 h-4 w-4 text-green-400" />
            <span>{benefit}</span>
          </motion.div>
        ))}
      </div>

      <div className="space-y-2 border-t border-white/10 pt-4">
        <h4 className="text-sm font-semibold text-orange-400 mb-2">{t.requirementsTitle}</h4>
        {t.warnings.map((warning, index) => (
          <motion.div
            key={warning}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 + 0.3 }}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 text-orange-400" />
            <span>{warning}</span>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <Button
          onClick={() => void loadModel(selectedModelId)}
          size="lg"
          className="gap-2"
          disabled={isLoading}
        >
          <Download className="h-5 w-5" />
          {isLoading ? t.loading : ctaLabel}
        </Button>

        {!ready && !isLoading && (
          <p className="text-xs text-muted-foreground text-center max-w-md">{t.defaultMode}</p>
        )}
      </div>
    </motion.div>
  );
}
