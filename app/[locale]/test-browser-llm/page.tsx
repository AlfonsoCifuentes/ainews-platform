'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Zap, Loader2, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ModelDownloader } from '@/components/ai/ModelDownloader';
import { useBrowserLLM } from '@/hooks/use-browser-llm';

export default function BrowserLLMTestPage() {
  const { isReady, isInitializing, progress, error, initialize, generate } = useBrowserLLM();
  
  const [prompt, setPrompt] = useState(
    'Generate a brief course outline about Machine Learning for beginners. Output as JSON with title, description, and 3 modules.'
  );
  const [result, setResult] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDownloader, setShowDownloader] = useState(false);
  const [generationTime, setGenerationTime] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!isReady) {
      setShowDownloader(true);
      return;
    }

    setIsGenerating(true);
    setResult('');
    setGenerationTime(null);

    const startTime = Date.now();

    try {
      const response = await generate(prompt, {
        maxTokens: 2000,
        temperature: 0.7,
        systemPrompt: 'You are a helpful AI assistant. Always respond in valid JSON format when asked.',
      });

      const endTime = Date.now();
      setGenerationTime(endTime - startTime);
      setResult(response);

    } catch (err) {
      console.error('Generation error:', err);
      setResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-3">
            <Brain className="w-12 h-12 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Browser LLM Test
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Test AI models running directly in your browser. Zero API costs, complete privacy.
          </p>
        </motion.div>

        {/* Status Card */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isReady ? (
                <>
                  <Check className="w-5 h-5 text-green-500" />
                  Model Ready
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Model Not Downloaded
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isReady
                ? 'You can generate text 100% free and offline'
                : 'Download a model to start generating (one-time download)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isReady && !isInitializing && (
              <Button onClick={() => setShowDownloader(true)} className="gap-2">
                <Download className="w-4 h-4" />
                Download Model
              </Button>
            )}

            {isInitializing && progress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Downloading... {progress.progress}%</span>
                  {progress.loaded && progress.total && (
                    <span className="text-muted-foreground">
                      {Math.round(progress.loaded / 1024 / 1024)}MB / {Math.round(progress.total / 1024 / 1024)}MB
                    </span>
                  )}
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Generation Interface */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Input */}
          <Card>
            <CardHeader>
              <CardTitle>Input Prompt</CardTitle>
              <CardDescription>Enter your prompt to generate text</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={10}
                className="font-mono text-sm"
                placeholder="Enter your prompt..."
              />

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full gap-2"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    Generate (100% Free)
                  </>
                )}
              </Button>

              {generationTime && (
                <p className="text-sm text-muted-foreground text-center">
                  Generated in {(generationTime / 1000).toFixed(2)}s
                </p>
              )}
            </CardContent>
          </Card>

          {/* Output */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Output</CardTitle>
              <CardDescription>
                {result ? 'Result from browser-based AI' : 'Output will appear here'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                </div>
              ) : result ? (
                <pre className="bg-secondary p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono whitespace-pre-wrap">
                  {result}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No output yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Benefits */}
        <Card className="border-2 border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              Why Use Browser LLM?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">💰 Zero Cost</h4>
                <p className="text-sm text-muted-foreground">
                  $0.00 API costs forever after initial download
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">🔒 Private</h4>
                <p className="text-sm text-muted-foreground">
                  Nothing leaves your browser - complete privacy
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">📡 Offline</h4>
                <p className="text-sm text-muted-foreground">
                  Works without internet after download
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">🚀 Fast</h4>
                <p className="text-sm text-muted-foreground">
                  WebGPU acceleration on modern GPUs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Downloader Modal */}
      {showDownloader && (
        <ModelDownloader
          onComplete={() => {
            setShowDownloader(false);
            initialize();
          }}
          onSkip={() => setShowDownloader(false)}
          autoShow
        />
      )}
    </div>
  );
}
