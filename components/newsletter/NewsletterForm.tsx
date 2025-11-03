'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NewsletterFormProps {
  locale: 'en' | 'es';
}

export function NewsletterForm({ locale }: NewsletterFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const t = locale === 'en' ? {
    title: 'Stay Updated with AI News',
    subtitle: 'Get weekly AI insights delivered to your inbox',
    placeholder: 'Enter your email',
    subscribe: 'Subscribe',
    subscribing: 'Subscribing...',
    success: 'Successfully subscribed!',
    error: 'Failed to subscribe. Please try again.',
    invalidEmail: 'Please enter a valid email address',
  } : {
    title: 'Mantente Actualizado con Noticias IA',
    subtitle: 'Recibe insights semanales de IA en tu correo',
    placeholder: 'Ingresa tu email',
    subscribe: 'Suscribirse',
    subscribing: 'Suscribiendo...',
    success: '¡Suscripción exitosa!',
    error: 'Error al suscribirse. Inténtalo de nuevo.',
    invalidEmail: 'Por favor ingresa un email válido',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage(t.invalidEmail);
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(t.success);
        setEmail('');
        
        // Reset after 5 seconds
        setTimeout(() => {
          setStatus('idle');
          setMessage('');
        }, 5000);
      } else {
        setStatus('error');
        setMessage(data.error || t.error);
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setStatus('error');
      setMessage(t.error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-purple-500/20 to-pink-500/20 p-8 backdrop-blur-xl border border-white/10"
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 animate-pulse" />
      
      <div className="relative z-10 max-w-xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
          <Mail className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Newsletter</span>
        </div>

        <h2 className="text-3xl font-bold mb-2">{t.title}</h2>
        <p className="text-muted-foreground mb-6">{t.subtitle}</p>

        <form onSubmit={handleSubmit} className="flex gap-3">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.placeholder}
            disabled={status === 'loading' || status === 'success'}
            className="flex-1 bg-white/10 border-white/20 backdrop-blur-sm"
          />
          <Button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="min-w-[120px]"
          >
            {status === 'loading' && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            {status === 'loading' ? t.subscribing : t.subscribe}
          </Button>
        </form>

        {message && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 text-sm ${
              status === 'success' ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {message}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
