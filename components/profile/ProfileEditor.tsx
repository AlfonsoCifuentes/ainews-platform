"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGamification } from '@/lib/hooks/useGamification';
import type { UserProfile } from '@/lib/types/user';

interface ProfileEditorProps {
  profile: UserProfile;
  locale: 'en' | 'es';
  translations: Record<string, string>;
  onSave: () => void;
  onCancel: () => void;
}

export function ProfileEditor({ profile, locale, translations: t, onSave, onCancel }: ProfileEditorProps) {
  const { updateProfile, isLoading } = useGamification();
  const [formData, setFormData] = useState({
    display_name: profile.display_name || '',
    bio: profile.bio || '',
    preferred_locale: profile.preferred_locale || locale,
    theme: profile.theme || 'system',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateProfile({
      display_name: formData.display_name,
      bio: formData.bio,
      preferred_locale: formData.preferred_locale,
      theme: formData.theme === 'system' ? undefined : formData.theme,
    });
    if (success) {
      onSave();
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="glass rounded-2xl border border-white/10 p-6"
    >
      <h3 className="mb-6 text-xl font-bold">{t.editProfile}</h3>

      <div className="space-y-4">
        {/* Display Name */}
        <div>
          <label htmlFor="display_name" className="mb-2 block text-sm font-semibold">
            {t.displayName}
          </label>
          <input
            id="display_name"
            type="text"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-xl transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
            minLength={3}
            maxLength={30}
          />
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="mb-2 block text-sm font-semibold">
            {t.bio}
          </label>
          <textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-xl transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            rows={4}
            maxLength={500}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {formData.bio.length}/500 {locale === 'en' ? 'characters' : 'caracteres'}
          </p>
        </div>

        {/* Preferred Locale */}
        <div>
          <label htmlFor="preferred_locale" className="mb-2 block text-sm font-semibold">
            {t.preferredLocale}
          </label>
          <select
            id="preferred_locale"
            value={formData.preferred_locale}
            onChange={(e) => setFormData({ ...formData, preferred_locale: e.target.value as 'en' | 'es' })}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-xl transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="en">{t.englishLocale}</option>
            <option value="es">{t.spanishLocale}</option>
          </select>
        </div>

        {/* Theme */}
        <div>
          <label htmlFor="theme" className="mb-2 block text-sm font-semibold">
            {t.theme}
          </label>
          <select
            id="theme"
            value={formData.theme}
            onChange={(e) => setFormData({ ...formData, theme: e.target.value as 'light' | 'dark' | 'system' })}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 backdrop-blur-xl transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="light">{t.lightTheme}</option>
            <option value="dark">{t.darkTheme}</option>
            <option value="system">{t.systemTheme}</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <motion.button
          type="submit"
          disabled={isLoading}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:shadow-xl hover:shadow-primary/50 disabled:opacity-50"
        >
          {isLoading ? (locale === 'en' ? 'Saving...' : 'Guardando...') : t.save}
        </motion.button>
        <motion.button
          type="button"
          onClick={onCancel}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-xl border border-white/10 px-6 py-3 font-semibold transition-all hover:bg-white/5"
        >
          {t.cancel}
        </motion.button>
      </div>
    </motion.form>
  );
}
