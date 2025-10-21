/**
 * Voice Assistant for hands-free interaction
 * Supports voice commands, TTS for articles, and voice search
 */

export interface VoiceCommand {
  command: string;
  params?: Record<string, string>;
  confidence: number;
}

export interface SpeechOptions {
  lang: 'en-US' | 'es-ES';
  rate?: number;
  pitch?: number;
  volume?: number;
}

// Browser API types (not fully defined in TypeScript)
interface SpeechRecognitionInterface {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: unknown) => void;
  onerror: (event: unknown) => void;
  onend: () => void;
}

export class VoiceAssistant {
  private recognition: SpeechRecognitionInterface | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    // Initialize Web Speech API
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      
      // Initialize Speech Recognition
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInterface; webkitSpeechRecognition?: new () => SpeechRecognitionInterface }).SpeechRecognition ||
        (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInterface; webkitSpeechRecognition?: new () => SpeechRecognitionInterface }).webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
      }
    }
  }

  /**
   * Check if voice features are supported
   */
  isSupported(): { recognition: boolean; synthesis: boolean } {
    return {
      recognition: !!this.recognition,
      synthesis: !!this.synthesis,
    };
  }

  /**
   * Start listening for voice commands
   */
  async startListening(
    lang: 'en-US' | 'es-ES' = 'en-US'
  ): Promise<VoiceCommand> {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported');
    }

    return new Promise((resolve, reject) => {
      if (!this.recognition) return;
      
      this.recognition.lang = lang;
      this.isListening = true;

      this.recognition.onresult = (event: unknown) => {
        const speechEvent = event as { results: { [key: number]: { [key: number]: { transcript: string; confidence: number } } } };
        const result = speechEvent.results[0];
        const transcript = result[0].transcript.toLowerCase();
        const confidence = result[0].confidence;

        const command = this.parseCommand(transcript, lang);
        resolve({ ...command, confidence });
      };

      this.recognition.onerror = (event: unknown) => {
        const errorEvent = event as { error: string };
        this.isListening = false;
        reject(new Error(errorEvent.error));
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      this.recognition.start();
    });
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Parse voice command into structured format
   */
  private parseCommand(
    transcript: string,
    lang: 'en-US' | 'es-ES'
  ): Omit<VoiceCommand, 'confidence'> {
    const isSpanish = lang === 'es-ES';

    // Navigation commands
    const navPatterns = isSpanish
      ? [
          { regex: /ir a (inicio|home)/i, command: 'navigate', params: { to: '/' } },
          { regex: /ir a noticias/i, command: 'navigate', params: { to: '/news' } },
          { regex: /ir a cursos/i, command: 'navigate', params: { to: '/courses' } },
          { regex: /ir a (flashcards|tarjetas)/i, command: 'navigate', params: { to: '/flashcards' } },
          { regex: /ir a (grafo|conocimiento)/i, command: 'navigate', params: { to: '/kg' } },
          { regex: /ir a tendencias/i, command: 'navigate', params: { to: '/trending' } },
        ]
      : [
          { regex: /go to (home|homepage)/i, command: 'navigate', params: { to: '/' } },
          { regex: /go to news/i, command: 'navigate', params: { to: '/news' } },
          { regex: /go to courses/i, command: 'navigate', params: { to: '/courses' } },
          { regex: /go to flashcards/i, command: 'navigate', params: { to: '/flashcards' } },
          { regex: /go to knowledge graph/i, command: 'navigate', params: { to: '/kg' } },
          { regex: /go to trending/i, command: 'navigate', params: { to: '/trending' } },
        ];

    for (const pattern of navPatterns) {
      if (pattern.regex.test(transcript)) {
        return { command: pattern.command, params: pattern.params };
      }
    }

    // Search commands
    const searchPatterns = isSpanish
      ? [
          { regex: /buscar (.+)/i, command: 'search' },
          { regex: /busca (.+)/i, command: 'search' },
        ]
      : [
          { regex: /search for (.+)/i, command: 'search' },
          { regex: /find (.+)/i, command: 'search' },
        ];

    for (const pattern of searchPatterns) {
      const match = transcript.match(pattern.regex);
      if (match) {
        return { command: pattern.command, params: { query: match[1] } };
      }
    }

    // Reading commands
    const readPatterns = isSpanish
      ? [
          { regex: /(leer|lee) (este artículo|artículo)/i, command: 'read_article' },
          { regex: /pausar/i, command: 'pause_reading' },
          { regex: /continuar/i, command: 'resume_reading' },
          { regex: /detener/i, command: 'stop_reading' },
        ]
      : [
          { regex: /read (this )?article/i, command: 'read_article' },
          { regex: /pause/i, command: 'pause_reading' },
          { regex: /resume/i, command: 'resume_reading' },
          { regex: /stop/i, command: 'stop_reading' },
        ];

    for (const pattern of readPatterns) {
      if (pattern.regex.test(transcript)) {
        return { command: pattern.command };
      }
    }

    // Language switching
    if (
      /cambiar a inglés/i.test(transcript) ||
      /switch to english/i.test(transcript)
    ) {
      return { command: 'change_language', params: { lang: 'en' } };
    }
    if (
      /cambiar a español/i.test(transcript) ||
      /switch to spanish/i.test(transcript)
    ) {
      return { command: 'change_language', params: { lang: 'es' } };
    }

    // Help command
    if (/ayuda|help/i.test(transcript)) {
      return { command: 'help' };
    }

    // Unknown command
    return { command: 'unknown', params: { transcript } };
  }

  /**
   * Speak text using TTS
   */
  async speak(text: string, options: SpeechOptions): Promise<void> {
    if (!this.synthesis) {
      throw new Error('Speech synthesis not supported');
    }

    // Cancel any ongoing speech
    this.stopSpeaking();

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.lang;
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        reject(new Error(event.error));
      };

      this.currentUtterance = utterance;
      this.synthesis!.speak(utterance);
    });
  }

  /**
   * Pause current speech
   */
  pauseSpeaking(): void {
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.pause();
    }
  }

  /**
   * Resume paused speech
   */
  resumeSpeaking(): void {
    if (this.synthesis && this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  /**
   * Stop current speech
   */
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.currentUtterance = null;
    }
  }

  /**
   * Get speaking status
   */
  isSpeaking(): boolean {
    return this.synthesis?.speaking || false;
  }

  /**
   * Get available voices
   */
  getVoices(lang?: 'en-US' | 'es-ES'): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];

    const voices = this.synthesis.getVoices();
    if (lang) {
      return voices.filter((voice) => voice.lang.startsWith(lang.split('-')[0]));
    }
    return voices;
  }

  /**
   * Read article content with TTS
   */
  async readArticle(
    content: string,
    options: SpeechOptions,
    onProgress?: (charIndex: number) => void
  ): Promise<void> {
    if (!this.synthesis) {
      throw new Error('Speech synthesis not supported');
    }

    // Split content into chunks (TTS has character limits)
    const chunks = this.splitIntoChunks(content, 200);

    for (let i = 0; i < chunks.length; i++) {
      if (!this.synthesis.speaking && this.currentUtterance === null) {
        break; // User stopped reading
      }

      await this.speak(chunks[i], options);
      
      if (onProgress) {
        const totalChars = chunks.slice(0, i + 1).join(' ').length;
        onProgress(totalChars);
      }
    }
  }

  /**
   * Split text into readable chunks
   */
  private splitIntoChunks(text: string, wordsPerChunk: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += wordsPerChunk) {
      chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
    }

    return chunks;
  }

  /**
   * Get help text for voice commands
   */
  getHelpText(lang: 'en-US' | 'es-ES'): string {
    const isSpanish = lang === 'es-ES';

    if (isSpanish) {
      return `
Comandos de voz disponibles:

Navegación:
- "Ir a inicio" - Volver a la página principal
- "Ir a noticias" - Ver noticias de IA
- "Ir a cursos" - Explorar cursos
- "Ir a flashcards" - Practicar con flashcards
- "Ir a grafo" - Ver grafo de conocimiento
- "Ir a tendencias" - Ver temas en tendencia

Búsqueda:
- "Buscar [tema]" - Buscar contenido

Lectura:
- "Leer artículo" - Leer el artículo actual en voz alta
- "Pausar" - Pausar la lectura
- "Continuar" - Reanudar la lectura
- "Detener" - Detener la lectura

Otros:
- "Cambiar a inglés" - Cambiar idioma a inglés
- "Ayuda" - Mostrar esta ayuda
      `.trim();
    } else {
      return `
Available voice commands:

Navigation:
- "Go to home" - Return to homepage
- "Go to news" - View AI news
- "Go to courses" - Explore courses
- "Go to flashcards" - Practice with flashcards
- "Go to knowledge graph" - View knowledge graph
- "Go to trending" - View trending topics

Search:
- "Search for [topic]" - Search for content

Reading:
- "Read article" - Read current article aloud
- "Pause" - Pause reading
- "Resume" - Resume reading
- "Stop" - Stop reading

Other:
- "Switch to Spanish" - Change language to Spanish
- "Help" - Show this help
      `.trim();
    }
  }
}
