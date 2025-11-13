# Local AI Models Setup Guide
# Complete guide to use Ollama with AINews Platform

## Quick Start (5 minutes)

### Step 1: Install Ollama
```bash
# macOS / Linux / Windows
# Download from: https://ollama.ai

# On Windows with WSL2:
# https://github.com/ollama/ollama/blob/main/docs/windows.md
```

### Step 2: Download a Model
```bash
# RECOMMENDED for courses: Neural Chat (7B, fast, good for JSON)
ollama pull neural-chat:latest

# OR lightweight option: LLaMA 3.2
ollama pull llama3.2:latest

# OR advanced: Dolphin Mixtral (best reasoning)
ollama pull dolphin-mixtral:latest
```

### Step 3: Verify Installation
```bash
# List your models
ollama list

# Check if Ollama API is running
curl http://localhost:11434/api/version
```

### Step 4: Configure AINews (Optional)
If Ollama is running locally (default), no configuration needed.

If using a remote Ollama instance (via ngrok, cloudflare tunnel, etc):
```bash
# In .env.local:
OLLAMA_BASE_URL=http://your-remote-ollama:11434
```

### Step 5: Test the Setup
```bash
# In project root:
npx tsx scripts/diagnose-local-models.ts

# Should show: ✅ ALL CHECKS PASSED!
```

## Generate Courses with Local AI

```bash
npm run dev

# Navigate to: http://localhost:3000/[locale]/courses
# Click "Generate Course"
# Select your topic, difficulty, duration
# Click "Generate" - uses your local model, ZERO API costs!
```

## Model Recommendations

### For Course Generation
**Neural Chat** (RECOMMENDED)
- Size: 7B parameters (~5GB)
- Speed: Fast ⚡
- Quality: Good JSON output
- Command: `ollama pull neural-chat:latest`

**Dolphin Mixtral** (Best Quality)
- Size: 47B parameters (~30GB)
- Speed: Slow (10-30s per course)
- Quality: Excellent reasoning
- Command: `ollama pull dolphin-mixtral:latest`
- Requirements: 40GB+ VRAM

### For General Use
**LLaMA 3.2** (Lightweight)
- Size: 3.2B parameters (~2.5GB)
- Speed: Very Fast ⚡
- Quality: Good for simple tasks
- Command: `ollama pull llama3.2:latest`

**Mistral** (Balanced)
- Size: 7B parameters (~5GB)
- Speed: Fast ⚡
- Quality: Good all-rounder
- Command: `ollama pull mistral:latest`

## Performance Tips

1. **First time is slow**: Model needs to load into VRAM. Be patient!
2. **GPU acceleration**: If you have NVIDIA/AMD GPU:
   - Install CUDA/ROCm
   - Ollama will auto-detect and use GPU
   - 3-10x faster generation

3. **Reduce model size if RAM is limited**:
   - 3B models: 6GB RAM needed
   - 7B models: 16GB RAM recommended
   - 13B models: 32GB RAM recommended

4. **Monitor generation**:
   ```bash
   # Watch Ollama logs
   ollama serve
   ```

## Switching Between Models

The platform auto-detects your models. To switch:

1. Pull additional model: `ollama pull dolphin-mixtral:latest`
2. Open `/api/courses/detect-models` in browser to see all models
3. Generate course - platform picks the best one automatically
4. Or in code, specify: `createLLMClient('ollama', 'your-model-name')`

## Troubleshooting

### Ollama not detected
```bash
# Check if Ollama is running
curl http://localhost:11434/api/version

# If error, start Ollama:
ollama serve
```

### Model loading slow
- First load is always slow (loading VRAM)
- Subsequent requests are faster
- If stuck for 5+ minutes, check logs: `ollama serve`

### Out of memory errors
- You need more RAM or a smaller model
- Check available models: `ollama list`
- Pull smaller model: `ollama pull llama3.2:latest`

### Using remote Ollama
```bash
# If Ollama is on different machine/port:
OLLAMA_BASE_URL=http://192.168.1.100:11434

# If behind ngrok tunnel:
OLLAMA_BASE_URL=https://abc123.ngrok.io
```

## Advanced: Using with Cloud Providers

You can mix local and cloud:

1. **Local models first** (zero cost, no API keys)
2. **Fallback to cloud** if local models are slow

No extra configuration needed! The platform automatically falls back to cloud providers if Ollama is unavailable.

## Storage & Privacy

- **All models stored locally**: `~/.ollama/models/` 
- **No data sent to cloud**: Fully private
- **Can work offline**: No internet required after setup
- **Model sharing**: Pull one model and share VRAM across multiple AI features

## Resources

- Ollama: https://ollama.ai
- Available Models: https://ollama.ai/library
- Ollama GitHub: https://github.com/ollama/ollama
- LLaMA Models: https://www.meta.com/blog/meta-llama/
- Mistral Models: https://mistral.ai/

## Need Help?

1. Check logs: `npx tsx scripts/diagnose-local-models.ts`
2. Verify Ollama: `curl http://localhost:11434/api/tags`
3. Check server logs: `npm run dev` (see console)
4. Restart Ollama: `ollama serve`

---

**Key Benefit**: Generate unlimited courses with ZERO API costs!
Your local models are instant, private, and always available.
