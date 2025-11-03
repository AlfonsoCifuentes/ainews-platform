"use client";

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface AvatarUploadProps {
  currentAvatar?: string | null;
  onUploadSuccess?: (url: string) => void;
  locale: 'en' | 'es';
}

export function AvatarUpload({
  currentAvatar,
  onUploadSuccess,
  locale,
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatar || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const translations = {
    en: {
      upload: 'Upload Avatar',
      change: 'Change Avatar',
      remove: 'Remove',
      uploading: 'Uploading...',
      maxSize: 'Max 5MB (JPG, PNG, WebP, GIF)',
      error: 'Upload failed',
    },
    es: {
      upload: 'Subir Avatar',
      change: 'Cambiar Avatar',
      remove: 'Eliminar',
      uploading: 'Subiendo...',
      maxSize: 'Máx 5MB (JPG, PNG, WebP, GIF)',
      error: 'Error al subir',
    },
  }[locale];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type');
      return;
    }

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large (max 5MB)');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setPreview(data.avatarUrl);
        onUploadSuccess?.(data.avatarUrl);
      } else {
        setError(data.error || translations.error);
        setPreview(currentAvatar || null);
      }
    } catch {
      setError(translations.error);
      setPreview(currentAvatar || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/avatar', {
        method: 'DELETE',
      });

      if (response.ok) {
        setPreview(null);
        onUploadSuccess?.('');
      } else {
        const data = await response.json();
        setError(data.error || translations.error);
      }
    } catch {
      setError(translations.error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar Preview */}
      <div className="relative h-32 w-32">
        {preview ? (
          <div className="group relative h-full w-full overflow-hidden rounded-full border-4 border-primary shadow-lg shadow-primary/50">
            <Image
              src={preview}
              alt="Avatar"
              fill
              className="object-cover"
            />
            {!isUploading && (
              <button
                onClick={handleRemove}
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
              >
                <X className="h-8 w-8 text-white" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full border-4 border-dashed border-white/20 bg-black/20">
            <Upload className="h-12 w-12 text-muted-foreground" />
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/80">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div className="flex flex-col items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="rounded-xl bg-primary px-6 py-2 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {preview ? translations.change : translations.upload}
        </motion.button>

        <p className="text-xs text-muted-foreground">{translations.maxSize}</p>

        {error && (
          <p className="text-sm font-semibold text-red-400">{error}</p>
        )}
      </div>
    </div>
  );
}
