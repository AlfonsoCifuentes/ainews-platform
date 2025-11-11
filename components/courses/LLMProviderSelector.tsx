'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Cloud, Zap, Info, Download, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ModelDownloader } from '@/components/ai/ModelDownloader';
import { isBrowserLLMReady } from '@/lib/ai/browser-llm';

interface LLMProviderSelectorProps {
  onProviderSelected: (provider: 'browser' | 'cloud') => void;
  onBrowserModelReady?: () => void;
}

export function LLMProviderSelector({
  onProviderSelected,
  onBrowserModelReady,
}: LLMProviderSelectorProps) {
  const [showDownloader, setShowDownloader] = useState(false);
  const [isModelReady, setIsModelReady] = useState(isBrowserLLMReady());

  const handleBrowserLLM = () => {
    if (isModelReady) {
      onProviderSelected('browser');
    } else {
      setShowDownloader(true);
    }
  };

  const handleCloudAPI = () => {
    onProviderSelected('cloud');
  };

  const handleModelDownloadComplete = () => {
    setShowDownloader(false);
    setIsModelReady(true);
    onBrowserModelReady?.();
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold">Elige cómo generar tu curso</h3>
          <p className="text-muted-foreground">
            Selecciona entre AI local (privado, gratis) o Cloud (rápido, sin descarga)
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Browser LLM Option */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleBrowserLLM}
            className="cursor-pointer"
          >
            <Card
              className={`
                border-2 transition-all h-full
                ${isModelReady
                  ? 'border-green-500/50 bg-green-500/5 hover:border-green-500'
                  : 'border-primary/20 hover:border-primary/50'
                }
              `}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      AI en tu Navegador
                      {isModelReady && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      {isModelReady ? 'Modelo descargado y listo' : '3.8GB descarga única'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>$0.00</strong> costo API para siempre</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>100% privado</strong> - nada sale de tu navegador</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Funciona offline</strong> después de descargar</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span><strong>WebGPU</strong> acelerado en GPUs modernas</span>
                  </div>
                </div>

                {/* Características desbloqueables */}
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-yellow-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    🔓 Funciones que se desbloquean:
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">💬</span>
                      <span>Chatbot IA ilimitado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">🤖</span>
                      <span>Chat estilo ChatGPT</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">✨</span>
                      <span>Generación de cursos sin límites</span>
                    </div>
                  </div>
                </div>

                <Alert className={isModelReady ? 'border-green-500/20 bg-green-500/5' : ''}>
                  <Info className={`w-4 h-4 ${isModelReady ? 'text-green-500' : ''}`} />
                  <AlertDescription className="text-xs">
                    {isModelReady ? (
                      'Tu modelo está listo. Click para usar.'
                    ) : (
                      'Primera vez: 5-15 min descarga. Después: instantáneo.'
                    )}
                  </AlertDescription>
                </Alert>

                <Button
                  className="w-full gap-2"
                  variant={isModelReady ? 'default' : 'outline'}
                >
                  {isModelReady ? (
                    <>
                      <Brain className="w-4 h-4" />
                      Usar Modelo Local
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Descargar Modelo (3.8GB)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Cloud API Option */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCloudAPI}
            className="cursor-pointer"
          >
            <Card
              className="border-2 border-blue-500/20 hover:border-blue-500/50 transition-all h-full"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Cloud className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle>API Cloud</CardTitle>
                    <CardDescription>Sin descarga, instantáneo</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Instantáneo</strong> - sin esperar descarga</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Ultra rápido</strong> - servidores dedicados</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Sin storage</strong> - 0 bytes en tu dispositivo</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span><strong>Multi-modelo</strong> - 7 proveedores en cascada</span>
                  </div>
                </div>

                <Alert className="border-blue-500/20 bg-blue-500/5">
                  <Info className="w-4 h-4 text-blue-500" />
                  <AlertDescription className="text-xs">
                    Usa Groq (gratis), Anthropic, Gemini y más. Fallback automático.
                  </AlertDescription>
                </Alert>

                <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                  <Cloud className="w-4 h-4" />
                  Usar API Cloud
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recommendation */}
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                  💡 Recomendación
                </p>
                <p className="text-yellow-800 dark:text-yellow-200">
                  <strong>Primera vez:</strong> Usa Cloud API (instantáneo). Si generas cursos frecuentemente, 
                  descarga el modelo para <strong>$0 costo</strong> permanente.
                </p>
                <p className="text-yellow-800 dark:text-yellow-200 text-xs">
                  El modelo descargado se guarda en el cache de tu navegador. Solo se descarga 1 vez.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Model Downloader Modal */}
      <AnimatePresence>
        {showDownloader && (
          <ModelDownloader
            onComplete={handleModelDownloadComplete}
            onSkip={() => {
              setShowDownloader(false);
              handleCloudAPI();
            }}
            autoShow
          />
        )}
      </AnimatePresence>
    </>
  );
}
