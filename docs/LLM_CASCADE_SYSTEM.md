# LLM Provider Cascade System - Updated

## Current Configuration (November 2025)

### 🎯 Provider Priority Order

The system tries providers in this exact order, with intelligent fallback:

| Priority | Provider | API Endpoint | Model | Cost | Free Tier |
|----------|----------|--------------|-------|------|-----------|
| 1 | **Ollama** (Local/Ngrok) | Local/Remote | Any | $0 | Unlimited |
| 2 | **OpenAI** | api.openai.com | gpt-4o | $$ | Paid only |
| 3 | **Groq** | api.groq.com/openai/v1 | llama-3.1-8b-instant | $0 | 30 req/min |
| 4 | **OpenRouter** | openrouter.ai/api/v1 | google/gemini-2.0-flash-exp:free | $0 | Free models |
| 5 | **Anthropic** | api.anthropic.com | claude-3-5-sonnet | $$ | Limited |
| 6 | **Google Gemini** | generativelanguage.googleapis.com | gemini-2.0-flash-exp | $0 | 60 req/min |
| 7 | **DeepSeek** | api.deepseek.com | deepseek-chat | $$ | Token limited |
| 8 | **Mistral** | api.mistral.ai | mistral-large-latest | $$ | Limited |

### 🔧 Environment Variables Required

```bash
# Required to enable each provider
OLLAMA_BASE_URL=http://localhost:11434  # Optional - uses local if not on Vercel
OPENAI_API_KEY=sk-proj-...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-v1-...
ANTHROPIC_API_KEY=sk-ant-api03-...
GEMINI_API_KEY=AIzaSy...
DEEPSEEK_API_KEY=sk-...
MISTRAL_API_KEY=...
TOGETHER_API_KEY=...  # Optional
```

### 📊 How It Works

1. **Detection**: System checks which providers are configured (API keys present)
2. **Ordering**: Providers are tried in priority order (Ollama → OpenAI → Groq → etc)
3. **Fallback**: If a provider fails with 429/timeout, automatically tries next provider
4. **Retry**: Each provider gets 1 attempt, with exponential backoff between providers
5. **Logging**: Every attempt is logged with detailed diagnostics

### ⚡ Retry Strategy

- **Initial backoff**: 1 second
- **Max backoff**: 60 seconds  
- **Multiplier**: 2x between retries
- **Max retries**: 5 attempts total across all providers
- **Jitter**: ±500ms random delay to prevent thundering herd

### 🌍 Geolocation Optimization

Different providers are optimized for different regions:
- **Ollama**: Best for private/offline use
- **OpenAI**: Premium quality, US-based
- **Groq**: Very fast for JSON tasks
- **OpenRouter**: Multiple free models
- **Google Gemini**: Good Asia coverage
- **Mistral**: European-based provider

### ✅ Diagnostics

Check provider configuration:

```bash
# OpenAI diagnostic endpoint
GET /api/openai/diagnose

# All providers diagnostic
GET /api/courses/diagnose-providers

# Detect local models
GET /api/courses/detect-models

# Test LLM fallback chain
GET /api/courses/test-llm
```

### 💰 Cost Optimization

1. **Ollama first**: $0 if available (local or remote via tunnel)
2. **Groq second**: Most generous free tier (30 req/min)
3. **Free tier models**: OpenRouter + Gemini use free models by default
4. **Fallback to paid**: Anthropic/DeepSeek/Mistral only if free tiers exhausted

### 🚨 OpenAI Addition (2025-11-14)

OpenAI (GPT-4o) was added as the **2nd priority provider** because:
- Highest quality model available
- Excellent for complex reasoning
- Falls back to cheaper providers if rate-limited
- Supports all structured output formats

**Note**: OpenAI is paid-only (no free tier), but as a fallback option after Ollama.

### 🔄 System Behavior

**Example sequence**:
1. Request comes in for course generation
2. System checks: Ollama configured? → Yes → Try Ollama
3. Ollama fails → Try OpenAI (GPT-4o)
4. OpenAI rate-limited → Try Groq
5. Groq succeeds → Use Groq response, log success

**All steps are transparent** to the user with progress updates.

### 📝 Configuration Files

- `lib/ai/llm-client.ts` - Main cascade logic
- `app/api/courses/generate/route.ts` - Course generation endpoint
- `app/api/openai/diagnose/route.ts` - OpenAI verification
- `.env.local` - API keys (never commit!)

---

**Last Updated**: November 14, 2025  
**Commit**: `6cdf22f`
