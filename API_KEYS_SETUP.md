# Configuración de API Keys para AINews

## 🔑 APIs Requeridas

Para que el generador de cursos funcione, necesitas configurar al menos UNA de las siguientes APIs:

### Opción 1: OpenRouter (Recomendado) 🌟

**Ventajas:**
- Acceso a múltiples modelos (Gemini, Llama, etc.)
- Tier gratuito generoso
- Mejor para producción

**Pasos:**
1. Visita [https://openrouter.ai](https://openrouter.ai)
2. Crea una cuenta gratuita
3. Ve a "API Keys" en tu dashboard
4. Crea una nueva API key
5. Copia la key (empieza con `sk-or-...`)

### Opción 2: Groq (Alternativa)

**Ventajas:**
- Muy rápido (optimizado para inferencia)
- Tier gratuito disponible
- Buena opción para desarrollo

**Pasos:**
1. Visita [https://console.groq.com](https://console.groq.com)
2. Crea una cuenta gratuita
3. Ve a "API Keys"
4. Crea una nueva API key
5. Copia la key (empieza con `gsk_...`)

---

## 📝 Configuración del Archivo `.env.local`

1. **Copia el archivo de ejemplo:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edita `.env.local` y añade tus keys:**

   ```bash
   # Supabase (Ya configurado)
   NEXT_PUBLIC_SUPABASE_URL=tu-url-actual
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-key-actual
   SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

   # LLM APIs - Añade AL MENOS UNA de estas:
   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   # O
   GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

   # Opcional: Email notifications
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. **Reinicia el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

---

## ✅ Verificar Configuración

Una vez configurado, el generador de cursos debería funcionar. Si ves este error:

```
LLM API not configured
Please set OPENROUTER_API_KEY or GROQ_API_KEY in your .env.local file
```

Significa que necesitas configurar las API keys siguiendo los pasos anteriores.

---

## 🎯 Modelo Recomendado

**Por defecto usamos:**
- OpenRouter: `google/gemini-2.0-flash-exp:free` (rápido y gratuito)
- Groq: `llama-3.1-8b-instant` (muy rápido)

Puedes cambiar el modelo en `lib/ai/llm-client.ts` si lo deseas.

---

## 💰 Costos

**Tier Gratuito:**
- **OpenRouter**: ~$5 en créditos gratuitos para empezar
- **Groq**: Límite de requests/día gratuito generoso

**Recomendación:** Usa el tier gratuito para desarrollo y pruebas. Para producción, considera el tier de pago de OpenRouter ($5-$10/mes típicamente).

---

## 🐛 Troubleshooting

### Error: "Failed to generate course"

**Causas comunes:**
1. **API key no configurada** → Verifica `.env.local`
2. **API key inválida** → Regenera la key en el dashboard
3. **Límite de requests excedido** → Espera unos minutos o usa otra API

### Error: "MISSING_MESSAGE: news.readTime (es)"

Este error ya está **SOLUCIONADO** ✅. Si lo ves, limpia el caché:
```bash
rm -rf .next
npm run dev
```

---

## 📚 Documentación de APIs

- **OpenRouter**: [https://openrouter.ai/docs](https://openrouter.ai/docs)
- **Groq**: [https://console.groq.com/docs](https://console.groq.com/docs)

---

## 🚀 ¿Listo?

Una vez configurado, podrás:
- ✅ Generar cursos de IA en segundos
- ✅ Personalizar dificultad (beginner/intermediate/advanced)
- ✅ Ajustar duración (short/medium/long)
- ✅ Cursos en inglés y español automáticamente

**¡Disfruta generando cursos! 🎓**
