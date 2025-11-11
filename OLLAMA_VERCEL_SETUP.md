# 🌐 Usar Ollama en Vercel - Guía Completa

## 🎯 Objetivo

Hacer que Vercel use tu Ollama local (RTX 3080) para **$0.00 de costo API**, incluso en producción.

## ⚙️ Cómo Funciona

```
Vercel (Producción)
       ↓
   Internet
       ↓
  Túnel HTTPS ← Cloudflare Tunnel / Ngrok
       ↓
Tu PC (localhost:11434)
       ↓
  Ollama + RTX 3080
```

## 🚀 Opción 1: Cloudflare Tunnel (RECOMENDADO)

### ✅ Ventajas
- ✅ **100% GRATIS** (sin límites)
- ✅ No requiere cuenta
- ✅ URLs persistentes opcionales
- ✅ Más rápido que Ngrok
- ✅ No expira

### 📦 Instalación

```bash
# Windows
winget install Cloudflare.cloudflared

# Verificar instalación
cloudflared --version
```

### 🔧 Uso Rápido (Túnel Temporal)

```bash
# 1. Asegúrate que Ollama esté corriendo
ollama serve

# 2. En otra terminal, inicia el túnel
cloudflared tunnel --url http://localhost:11434
```

**Verás algo como:**
```
2025-11-11T06:00:00Z INF +--------------------------------------------------------------------------------------------+
2025-11-11T06:00:00Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
2025-11-11T06:00:00Z INF |  https://abc-def-ghi-jkl.trycloudflare.com                                                |
2025-11-11T06:00:00Z INF +--------------------------------------------------------------------------------------------+
```

### 🌍 Configurar en Vercel

1. Copia la URL: `https://abc-def-ghi-jkl.trycloudflare.com`

2. Ve a Vercel → Tu Proyecto → Settings → Environment Variables

3. Agrega:
   ```
   OLLAMA_BASE_URL=https://abc-def-ghi-jkl.trycloudflare.com/v1
   ```

4. Redeploy tu proyecto

### 🔒 Uso Permanente (Túnel con Nombre)

```bash
# 1. Login a Cloudflare (gratis)
cloudflared tunnel login

# 2. Crear túnel con nombre
cloudflared tunnel create ollama

# 3. Configurar ruta
cloudflared tunnel route dns ollama ollama.yourdomain.com

# 4. Correr túnel permanente
cloudflared tunnel run ollama
```

Ahora tendrás: `https://ollama.yourdomain.com` (permanente)

---

## 🚀 Opción 2: Ngrok

### ✅ Ventajas
- ✅ Fácil de usar
- ✅ UI web para ver tráfico
- ✅ URLs personalizadas con cuenta gratuita

### ⚠️ Desventajas
- ⚠️ Free tier: 1 agent, 1 endpoint, 40 conexiones/min
- ⚠️ URL cambia cada vez (a menos que pagues)

### 📦 Instalación

```bash
# Windows
winget install ngrok.ngrok

# Crear cuenta gratis: https://ngrok.com/
# Copiar authtoken de tu dashboard

# Configurar authtoken
ngrok config add-authtoken YOUR_AUTHTOKEN
```

### 🔧 Uso

```bash
# Iniciar túnel
ngrok http 11434
```

**Verás:**
```
Forwarding  https://abcd-1234-efgh-5678.ngrok-free.app -> http://localhost:11434
```

### 🌍 Configurar en Vercel

```
OLLAMA_BASE_URL=https://abcd-1234-efgh-5678.ngrok-free.app/v1
```

---

## 🚀 Opción 3: VPS con Ollama (PRODUCCIÓN)

### ✅ Ventajas
- ✅ Siempre disponible (no depende de tu PC)
- ✅ Más rápido (servidor dedicado)
- ✅ Escalable (puedes usar GPU cloud)

### 💰 Costo
- Hetzner GPU: ~€50/mes (RTX 4000)
- DigitalOcean GPU: ~$150/mes
- RunPod: ~$0.30/hora (solo cuando se usa)

### 🔧 Setup Rápido

```bash
# En tu VPS (Ubuntu)
curl https://ollama.ai/install.sh | sh

# Exponer Ollama a internet
sudo nano /etc/systemd/system/ollama.service

# Cambiar:
Environment="OLLAMA_HOST=0.0.0.0:11434"

# Reiniciar
sudo systemctl restart ollama

# Configurar Nginx con SSL (Let's Encrypt)
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d ollama.yourdomain.com
```

### 🌍 Configurar en Vercel

```
OLLAMA_BASE_URL=https://ollama.yourdomain.com/v1
```

---

## 🛠️ Script Automático

Usa nuestro script helper:

```bash
npm run ollama:setup-tunnel
```

Este script:
1. ✅ Verifica que Ollama esté corriendo
2. ✅ Te muestra las 3 opciones
3. ✅ Puede iniciar Cloudflare Tunnel automáticamente
4. ✅ Te da la URL para copiar a Vercel

---

## 🧪 Verificar que Funciona

### 1. Test Local del Túnel

```bash
# Si tu túnel es: https://abc.trycloudflare.com
curl https://abc.trycloudflare.com/api/tags
```

Deberías ver tus modelos Ollama.

### 2. Test desde Vercel

Después de deployar con `OLLAMA_BASE_URL` configurado:

```bash
# En tu app, ve a /api/courses/generate y genera un curso
# Verifica los logs en Vercel Dashboard
```

Deberías ver:
```
[LLM Fallback] 🎯 Ollama added as PRIMARY provider (remote (https://...), zero cost)
[LLM Fallback] ✅ Ollama is running and ready (REMOTE TUNNEL - ZERO COST)
[LLM] 🏠 Using remote Ollama model: llama3.2:3b (ZERO API COST)
```

---

## 🔒 Seguridad (IMPORTANTE)

### ⚠️ Túneles Públicos son INSEGUROS por defecto

Cualquiera con la URL puede usar tu Ollama. **Opciones:**

### Opción A: API Key en Headers

1. Configura Ollama con autenticación (requiere proxy inverso)

```nginx
# nginx.conf
location /v1/ {
    if ($http_authorization != "Bearer YOUR_SECRET_KEY") {
        return 401;
    }
    proxy_pass http://localhost:11434/v1/;
}
```

2. En Vercel:
```
OLLAMA_BASE_URL=https://your-tunnel.com/v1
OLLAMA_API_KEY=YOUR_SECRET_KEY
```

### Opción B: IP Whitelist

Solo permite IPs de Vercel:

```nginx
# nginx.conf
location /v1/ {
    # Vercel IPs: https://vercel.com/docs/edge-network/regions#ip-addresses
    allow 76.76.21.0/24;
    allow 76.76.21.98;
    deny all;
    
    proxy_pass http://localhost:11434/v1/;
}
```

### Opción C: Cloudflare Access (GRATIS)

Añade autenticación con email a tu túnel:

```bash
cloudflared tunnel --url http://localhost:11434 --name ollama --access-policy email:tu@email.com
```

---

## 📊 Comparación de Opciones

| Método | Costo | Setup | Permanente | Seguridad | Velocidad |
|--------|-------|-------|------------|-----------|-----------|
| **Cloudflare (temp)** | 🆓 Gratis | ⚡ 1 min | ❌ No | ⚠️ Pública | 🚀 Rápida |
| **Cloudflare (named)** | 🆓 Gratis | 🔧 10 min | ✅ Sí | 🔒 Con Access | 🚀 Rápida |
| **Ngrok (free)** | 🆓 Gratis | ⚡ 2 min | ❌ No | ⚠️ Pública | 🐢 Media |
| **Ngrok (paid)** | 💰 $8/mes | ⚡ 2 min | ✅ Sí | 🔒 Con auth | 🚀 Rápida |
| **VPS** | 💰 €50/mes | 🔧 30 min | ✅ Sí | 🔒 Total | 🚀🚀 Muy rápida |

---

## 🎯 Recomendación

### Para Testing/Desarrollo:
**→ Cloudflare Tunnel temporal** (gratis, 1 minuto setup)

### Para Producción:
**→ Cloudflare Tunnel con nombre + Cloudflare Access** (gratis, seguro)

### Para Alta Disponibilidad:
**→ VPS con Ollama** (costo mensual, siempre disponible)

---

## 💡 Pro Tips

### 1. Keep Alive

Usa `pm2` o `systemd` para que el túnel siempre esté activo:

```bash
# Instalar pm2
npm install -g pm2

# Iniciar túnel con pm2
pm2 start cloudflared -- tunnel --url http://localhost:11434

# Guardar para auto-start
pm2 save
pm2 startup
```

### 2. Monitoreo

Agrega logging para ver uso:

```bash
# En tu .env.local
LOG_OLLAMA_REQUESTS=true
```

### 3. Fallback Cloud

Si tu PC está apagado, el sistema automáticamente usará Anthropic/Groq:

```
[LLM Fallback] ⚠️ Ollama not responding, skipping to cloud providers
[LLM Fallback] 🤖 Trying provider: ANTHROPIC
```

---

## 🆘 Troubleshooting

### Túnel conectado pero Vercel no lo alcanza

**Causa:** Firewall bloqueando

**Solución:**
```bash
# Windows: Permitir tráfico entrante en puerto 11434
netsh advfirewall firewall add rule name="Ollama" dir=in action=allow protocol=TCP localport=11434
```

### "Connection refused" desde Vercel

**Causa:** Ollama solo escucha en localhost

**Solución:**
```bash
# Configurar Ollama para escuchar en 0.0.0.0
$env:OLLAMA_HOST="0.0.0.0:11434"
ollama serve
```

### Túnel muy lento

**Causa:** Cloudflare free tier puede tener latencia

**Soluciones:**
1. Usa Ngrok con cuenta paga (más rápido)
2. Cambia a VPS en región cercana a Vercel (us-east-1)

---

## 📝 Variables de Entorno en Vercel

```bash
# Obligatorio
OLLAMA_BASE_URL=https://your-tunnel-url.com/v1

# Opcional (si configuraste autenticación)
OLLAMA_API_KEY=your_secret_key

# Opcional (para debugging)
LOG_OLLAMA_REQUESTS=true
```

**Recuerda:** Después de agregar variables, debes hacer **Redeploy** del proyecto.

---

## ✅ Checklist Final

- [ ] Ollama corriendo en localhost:11434
- [ ] Túnel iniciado (Cloudflare/Ngrok)
- [ ] URL HTTPS copiada
- [ ] `OLLAMA_BASE_URL` configurado en Vercel
- [ ] Proyecto redeployado
- [ ] Test de generación de curso exitoso
- [ ] Logs muestran "Using remote Ollama model"
- [ ] Costo API = $0.00 ✨

---

## 🎉 Resultado

**Vercel ahora usa tu RTX 3080 local = $0.00 API costs en producción** 🚀
