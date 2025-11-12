'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Check, X, Loader2, Info, Zap, Brain, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BrowserLLM, RECOMMENDED_MODELS, type DownloadProgress, listCachedModels, getModelDisplayName } from '@/lib/ai/browser-llm';
import { getBrowserLLM, setBrowserLLM } from '@/lib/ai/browser-llm';
import { useWebLLM } from '@/hooks/use-web-llm';
import { Badge } from '@/components/ui/Badge';
import { WEBLLM_MODEL_CATALOG, getWebLLMModelMetadata, type WebLLMModelMetadata } from '@/lib/ai/web-llm';

interface ModelDownloaderProps {
  onComplete?: () => void;
  onSkip?: () => void;
  autoShow?: boolean;
  allowModelChange?: boolean; // Permitir cambiar modelo aunque ya haya uno descargado
}

const MODEL_INFO: Record<keyof typeof RECOMMENDED_MODELS, {
  name: string;
  size: string;
  quality: string;
  speed: string;
  description: string;
}> = {
  premium: {
    name: 'TinyLlama 1.1B',
    size: '637MB',
    quality: '⭐⭐⭐⭐',
    speed: '🚀🚀🚀🚀',
    description: 'Best quality available, ideal for course generation',
  },
  balanced: {
    name: 'DistilGPT2',
    size: '350MB',
    quality: '⭐⭐⭐',
    speed: '🚀🚀🚀🚀🚀',
    description: 'Perfect balance of quality and speed',
  },
  fast: {
    name: 'GPT-2',
    size: '250MB',
    quality: '⭐⭐⭐',
    speed: '🚀🚀🚀🚀🚀',
    description: 'Fast summaries and classifications',
  },
  ultralight: {
    name: 'DistilBERT',
    size: '250MB',
    quality: '⭐⭐',
    speed: '🚀🚀🚀🚀🚀',
    description: 'Ultra lightweight for basic tasks',
  },
};

export function ModelDownloader({
  onComplete,
  onSkip,
  autoShow = false,
  allowModelChange = false,
}: ModelDownloaderProps) {
  const [isOpen, setIsOpen] = useState(autoShow);
  const [selectedModel, setSelectedModel] = useState<keyof typeof RECOMMENDED_MODELS>('premium');
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [cachedModels, setCachedModels] = useState<string[]>([]);
  const [selectedCachedModel, setSelectedCachedModel] = useState<string | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(true);

  const {
    supported: webLLMSupported,
    cachedModels: webLLMCachedModels,
    checkingCache: checkingWebLLMCache,
    isLoading: webLLMIsLoading,
    progress: webLLMProgress,
    statusText: webLLMStatusText,
    selectedModelId: webLLMSelectedModelId,
    setSelectedModelId: setWebLLMSelectedModelId,
    loadModel: loadWebLLM,
    ready: webLLMReady,
    error: webLLMError,
    refreshCachedModels: refreshWebLLMCachedModels,
  } = useWebLLM({ autoLoadFromCache: false });

  const webLLMAvailableModels = useMemo<WebLLMModelMetadata[]>(() => {
    const catalog = new Map<string, WebLLMModelMetadata>();
    for (const model of WEBLLM_MODEL_CATALOG) {
      catalog.set(model.modelId, model);
    }
    for (const cached of webLLMCachedModels) {
      catalog.set(cached.modelId, cached);
    }
    if (webLLMSelectedModelId && !catalog.has(webLLMSelectedModelId)) {
      catalog.set(webLLMSelectedModelId, getWebLLMModelMetadata(webLLMSelectedModelId));
    }
    return Array.from(catalog.values());
  }, [webLLMCachedModels, webLLMSelectedModelId]);

  const webLLMSelectedIsCached = webLLMCachedModels.some((model) => model.modelId === webLLMSelectedModelId);

  // Detectar modelos en caché al montar
  useEffect(() => {
    async function detectCachedModels() {
      setIsLoadingCache(true);
      try {
        const cached = await listCachedModels();
        console.log('[ModelDownloader] Detected cached models:', cached);
        setCachedModels(cached);
        
        // Si hay modelos en caché y no estamos forzando cambio
        if (cached.length > 0 && !allowModelChange) {
          // Auto-seleccionar el primer modelo en caché
          setSelectedCachedModel(cached[0]);
          
          // Verificar si ya hay una instancia cargada
          const existing = getBrowserLLM();
          if (existing?.isReady()) {
            setIsComplete(true);
          } else {
            // Auto-cargar el primer modelo en caché
            await loadCachedModel(cached[0]);
          }
        }
      } catch (err) {
        console.error('[ModelDownloader] Error detecting cached models:', err);
      } finally {
        setIsLoadingCache(false);
      }
    }
    
    detectCachedModels();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowModelChange]);

  const loadCachedModel = async (modelId: string) => {
    setIsDownloading(true);
    setError(null);
    setDownloadProgress({ status: 'loading', progress: 50 });

    try {
      console.log(`[ModelDownloader] Loading cached model: ${modelId}`);
      const llm = new BrowserLLM({ modelId });

      await llm.initialize((progress) => {
        setDownloadProgress(progress);
      });

      setBrowserLLM(llm);
      setIsComplete(true);
      setDownloadProgress({ status: 'ready', progress: 100 });

      onComplete?.();
    } catch (err) {
      console.error('[ModelDownloader] Error loading cached model:', err);
      setError('Error loading model from cache. Please download again.');
      setDownloadProgress(null);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    // Don't auto-detect if user explicitly wants to change model
    // This allows changing models
    if (!autoShow || allowModelChange) {
      const existing = getBrowserLLM();
      if (existing?.isReady() && !allowModelChange) {
        setIsComplete(true);
      }
    }
  }, [autoShow, allowModelChange]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
    setDownloadProgress({ status: 'downloading', progress: 0 });

    try {
      const modelId = RECOMMENDED_MODELS[selectedModel];
      const llm = new BrowserLLM({ modelId });

      await llm.initialize((progress) => {
        setDownloadProgress(progress);
      });

      // Store in singleton
      setBrowserLLM(llm);

      setIsComplete(true);
      setDownloadProgress({ status: 'ready', progress: 100 });

      // Notify parent
      setTimeout(() => {
        onComplete?.();
      }, 1500);

    } catch (err) {
      console.error('Download failed:', err);
      setError(err instanceof Error ? err.message : 'Download failed');
      setDownloadProgress({ status: 'error', progress: 0 });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSkip = () => {
    setIsOpen(false);
    onSkip?.();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  if (!isOpen && !autoShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-2xl"
        >
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-3xl font-bold flex items-center gap-2">
                    <Brain className="w-8 h-8 text-primary" />
                    {isLoadingCache ? 'Detectando modelos...' : (allowModelChange ? 'Cambiar Modelo AI' : 'Descargar Modelo AI')}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {isLoadingCache 
                      ? 'Buscando modelos ya descargados en tu navegador...'
                      : (allowModelChange 
                        ? 'Selecciona un nuevo modelo para descargar o usa uno ya descargado'
                        : cachedModels.length > 0 
                          ? `${cachedModels.length} modelo${cachedModels.length > 1 ? 's' : ''} encontrado${cachedModels.length > 1 ? 's' : ''} - Carga instantánea disponible`
                          : 'Ejecuta AI directamente en tu navegador - 100% gratis, privado y offline'
                      )
                    }
                  </CardDescription>
                </div>
                {!isDownloading && !isComplete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSkip}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Benefits */}
              <Alert className="border-primary/20 bg-primary/5">
                <Info className="w-4 h-4 text-primary" />
                <AlertDescription className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-green-500" />
                    <span><strong>$0.00</strong> de costo después de descargar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-green-500" />
                    <span><strong>100% privado</strong> - nada sale de tu navegador</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-green-500" />
                    <span><strong>Funciona offline</strong> después de la primera descarga</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-green-500" />
                    <span><strong>WebGPU acelerado</strong> en GPUs modernas</span>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Cached Models Selector */}
              {cachedModels.length > 0 && !isComplete && (
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Modelos ya descargados:
                  </label>
                  <div className="grid gap-2">
                    {cachedModels.map((modelId) => (
                      <motion.button
                        key={modelId}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedCachedModel(modelId);
                          loadCachedModel(modelId);
                        }}
                        disabled={isDownloading}
                        className={`
                          p-3 rounded-lg border-2 text-left transition-all
                          ${selectedCachedModel === modelId
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-border hover:border-green-500/50 bg-background'
                          }
                          ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                              <Check className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                              <div className="font-semibold text-sm">
                                {getModelDisplayName(modelId)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Ya descargado - Cargar instantáneamente
                              </div>
                            </div>
                          </div>
                          <Zap className="w-5 h-5 text-green-500" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  
                  {cachedModels.length > 0 && (
                    <div className="text-center text-xs text-muted-foreground">
                      o descarga un modelo nuevo abajo ↓
                    </div>
                  )}
                </div>
              )}

              {/* Model Selection */}
              {!isDownloading && !isComplete && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Elige tu modelo:</label>
                  <div className="grid gap-3">
                    {Object.entries(MODEL_INFO).map(([key, info]) => (
                      <motion.button
                        key={key}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedModel(key as keyof typeof RECOMMENDED_MODELS)}
                        className={`
                          p-4 rounded-lg border-2 text-left transition-all
                          ${selectedModel === key
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-card hover:border-primary/50'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{info.name}</h4>
                              <span className="text-xs text-muted-foreground">({info.size})</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{info.description}</p>
                            <div className="flex items-center gap-3 text-xs">
                              <span>Calidad: {info.quality}</span>
                              <span>Velocidad: {info.speed}</span>
                            </div>
                          </div>
                          {selectedModel === key && (
                            <div className="ml-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* WebLLM Large Models */}
              <div className="space-y-4 border-t border-primary/20 pt-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Brain className="w-5 h-5 text-primary" />
                      Modelos WebLLM (≥ 1 GB)
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Activa modelos gigantes directamente en tu GPU para máxima calidad y privacidad.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => void refreshWebLLMCachedModels()}
                    disabled={checkingWebLLMCache || webLLMIsLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${checkingWebLLMCache ? 'animate-spin' : ''}`} />
                    {checkingWebLLMCache ? 'Escaneando caché...' : 'Re-escanear caché'}
                  </Button>
                </div>

                {!webLLMSupported ? (
                  <Alert className="border-blue-500/40 bg-blue-500/10">
                    <Info className="w-4 h-4 text-blue-400" />
                    <AlertDescription className="text-sm">
                      Tu navegador no soporta WebGPU todavía. Usa Chrome o Edge 113+ en escritorio para activar WebLLM.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      {webLLMAvailableModels.map((model) => {
                        const isActive = model.modelId === webLLMSelectedModelId;
                        const cached = webLLMCachedModels.some((item) => item.modelId === model.modelId);
                        return (
                          <motion.button
                            key={model.modelId}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setWebLLMSelectedModelId(model.modelId)}
                            className={`rounded-2xl border p-4 text-left transition-all duration-200 ${
                              isActive
                                ? 'border-primary bg-primary/15 shadow-lg'
                                : 'border-white/10 bg-white/5 hover:border-primary/60 hover:bg-primary/10'
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold">{model.label}</span>
                              {model.recommended && <Badge variant="outline">Recomendado</Badge>}
                              {cached && <Badge variant="secondary">En caché</Badge>}
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">{model.description}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Tamaño: {model.size}</p>
                          </motion.button>
                        );
                      })}
                    </div>

                    {webLLMIsLoading && (
                      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{webLLMSelectedIsCached ? 'Cargando modelo en caché…' : 'Descargando modelo WebLLM…'}</span>
                          <span>{Math.round(webLLMProgress)}%</span>
                        </div>
                        <Progress value={webLLMProgress} className="h-2" />
                        {webLLMStatusText && <p className="text-xs text-muted-foreground">{webLLMStatusText}</p>}
                      </div>
                    )}

                    {webLLMError && (
                      <Alert variant="destructive">
                        <X className="w-4 h-4" />
                        <AlertDescription className="text-sm">{webLLMError}</AlertDescription>
                      </Alert>
                    )}

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <Button
                        onClick={() => void loadWebLLM(webLLMSelectedModelId)}
                        size="lg"
                        className="gap-2"
                        disabled={webLLMIsLoading}
                      >
                        <Download className="w-5 h-5" />
                        {webLLMIsLoading
                          ? 'Preparando modelo WebLLM...'
                          : webLLMSelectedIsCached
                            ? 'Activar modelo WebLLM en caché'
                            : 'Descargar modelo WebLLM (5GB)'}
                      </Button>

                      {webLLMReady ? (
                        <Badge variant="success" className="w-fit">
                          Activo: {getWebLLMModelMetadata(webLLMSelectedModelId).label}
                        </Badge>
                      ) : (
                        <p className="text-xs text-muted-foreground max-w-sm">
                          Los modelos WebLLM entregan respuestas premium sin depender de la nube. Descarga una vez y utilízalos offline.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Download Progress */}
              {isDownloading && downloadProgress && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {downloadProgress.status === 'downloading' && '📥 Descargando...'}
                        {downloadProgress.status === 'loading' && '⚙️ Cargando modelo...'}
                        {downloadProgress.status === 'ready' && '✅ ¡Listo!'}
                      </span>
                      <span className="text-muted-foreground">
                        {downloadProgress.progress}%
                        {downloadProgress.loaded && downloadProgress.total && (
                          <> ({formatBytes(downloadProgress.loaded)} / {formatBytes(downloadProgress.total)})</>
                        )}
                      </span>
                    </div>
                    <Progress value={downloadProgress.progress} className="h-2" />
                    {downloadProgress.file && (
                      <p className="text-xs text-muted-foreground truncate">
                        {downloadProgress.file}
                      </p>
                    )}
                  </div>

                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription className="text-sm">
                      Esta descarga solo ocurre <strong>1 vez</strong>. El modelo se guarda en el cache de tu navegador.
                      Las siguientes veces será instantáneo.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Success */}
              {isComplete && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8 space-y-4"
                >
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
                    <Check className="w-10 h-10 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-green-500">¡Modelo descargado!</h3>
                    <p className="text-muted-foreground mt-2">
                      Ahora puedes generar cursos 100% gratis y offline
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Error */}
              {error && (
                <Alert variant="destructive">
                  <X className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                {!isDownloading && !isComplete && (
                  <>
                    <Button
                      onClick={handleDownload}
                      className="flex-1 gap-2"
                      size="lg"
                    >
                      <Download className="w-5 h-5" />
                      Descargar {MODEL_INFO[selectedModel].size}
                    </Button>
                    <Button
                      onClick={handleSkip}
                      variant="outline"
                      size="lg"
                      className="gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Usar API Cloud
                    </Button>
                  </>
                )}

                {isDownloading && (
                  <Button disabled className="flex-1 gap-2" size="lg">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Descargando...
                  </Button>
                )}

                {isComplete && (
                  <Button
                    onClick={() => {
                      setIsOpen(false);
                      onComplete?.();
                    }}
                    className="flex-1 gap-2"
                    size="lg"
                  >
                    <Check className="w-5 h-5" />
                    Continuar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
