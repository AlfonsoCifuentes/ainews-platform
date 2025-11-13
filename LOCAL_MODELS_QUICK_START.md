# 🚀 Local AI Models - Quick Start

**Generate unlimited courses with ZERO API costs using your own AI models!**

## ⚡ 5-Minute Setup

### 1. Install Ollama
```bash
# Download from: https://ollama.ai
# Then run it (stays in background)
ollama serve
```

### 2. Pull a Model
```bash
# Recommended for courses (7B, fast, good for JSON)
ollama pull neural-chat:latest

# Or lightweight alternative
ollama pull llama3.2:latest
```

### 3. Start AINews
```bash
npm run dev
```

### 4. Generate Courses
1. Go to `/courses`
2. Click "Generate Course"
3. See the green banner showing your local model
4. Create unlimited courses with zero costs! 🎓

---

## 📦 Available Models

| Model | Size | Speed | Best For | Command |
|-------|------|-------|----------|---------|
| **Neural Chat** ⭐ | 7B | ⚡ Fast | Courses (JSON) | `ollama pull neural-chat:latest` |
| Llama 3.2 | 3.2B | ⚡ Very Fast | Quick tasks | `ollama pull llama3.2:latest` |
| Mistral | 7B | ⚡ Fast | Balanced | `ollama pull mistral:latest` |
| Dolphin Mixtral | 47B | 🐢 Slow | Best quality | `ollama pull dolphin-mixtral:latest` |

---

## 🧪 Test Your Setup

```bash
# Diagnose your local models
npx tsx scripts/diagnose-local-models.ts

# Should output: ✅ ALL CHECKS PASSED!
```

---

## 🎯 How It Works

1. **Automatic Detection**: Platform auto-detects your Ollama models
2. **Smart Selection**: Picks best model for course generation
3. **Zero API Calls**: Uses your local GPU/CPU, no cloud services
4. **Unlimited Courses**: Generate as many as you want!
5. **Fast**: First run loads model (~30s), then very fast (~10-30s/course)

---

## 💡 Smart Features

- ✅ **Banner Shows Status**: Green = ready, Yellow = setup needed
- ✅ **Local Priority**: Uses Ollama first, falls back to cloud APIs
- ✅ **API Fallback**: If Ollama unavailable, uses configured cloud providers
- ✅ **Automatic Selection**: Picks recommended model automatically
- ✅ **Works Offline**: No internet needed after initial setup

---

## 🔧 Troubleshooting

### "Ollama Not Detected"
```bash
# Make sure Ollama is running in another terminal
ollama serve

# Check it's working
curl http://localhost:11434/api/tags
```

### "No Models Found"
```bash
# You need to pull a model first
ollama pull neural-chat:latest

# Verify
ollama list
```

### Using Remote Ollama
```bash
# If Ollama is on different machine/port:
OLLAMA_BASE_URL=http://192.168.1.100:11434

# Or via ngrok tunnel:
OLLAMA_BASE_URL=https://abc123.ngrok.io
```

---

## 📊 API Endpoints

**Detect Models:**
```bash
curl http://localhost:3000/api/courses/detect-models
```

Response shows:
- Available models
- Recommended model  
- Setup instructions if needed

---

## 🎓 Generate Courses

The course generator automatically:
1. ✅ Detects your local models
2. ✅ Uses best one for JSON generation
3. ✅ Falls back to cloud if needed
4. ✅ Logs everything for debugging

---

## 💰 Cost Savings

| Setup | Cost | Speed | Availability |
|-------|------|-------|--------------|
| **Ollama (Local)** 🏆 | $0 | ⚡⚡⚡ Fast | Offline OK |
| Cloud APIs (Free tier) | $0 | ⚡ Varies | Online only |
| Cloud APIs (Paid) | $$ | ⚡⚡ Good | Always on |

**With Ollama: Generate 1000 courses for $0 cost!**

---

## 📚 Full Documentation

- **Setup Guide**: `/docs/LOCAL_MODELS_SETUP.md`
- **Architecture**: See `lib/ai/local-models.ts`
- **API Details**: `app/api/courses/detect-models/route.ts`

---

## 🚀 Next Steps

1. ✅ Install Ollama
2. ✅ Pull neural-chat model
3. ✅ Run `npm run dev`
4. ✅ Go to `/courses`
5. ✅ Generate your first AI course!

**Questions?** Check the logs:
```bash
npm run dev  # Watch server logs
npx tsx scripts/diagnose-local-models.ts  # Full diagnosis
```

---

**Made with ❤️ for free AI learning!**
