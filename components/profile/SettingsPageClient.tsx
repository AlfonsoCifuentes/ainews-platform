"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Bell, Globe, Palette, Shield, AlertTriangle, Save, X } from 'lucide-react';

interface SettingsPageClientProps {
  profile: any;
  locale: 'en' | 'es';
  translations: {
    title: string;
    subtitle: string;
    profile: string;
    displayName: string;
    bio: string;
    locale: string;
    theme: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    notifications: string;
    emailNotifications: string;
    weeklyDigest: string;
    achievementNotifications: string;
    courseReminders: string;
    privacy: string;
    dangerZone: string;
    deleteAccount: string;
    deleteWarning: string;
    save: string;
    cancel: string;
    saved: string;
  };
}

export function SettingsPageClient({
  profile,
  locale,
  translations,
}: SettingsPageClientProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [preferredLocale, setPreferredLocale] = useState<'en' | 'es'>(
    profile?.preferred_locale || locale
  );
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(
    profile?.theme || 'system'
  );
  const [emailNotifications, setEmailNotifications] = useState(
    profile?.email_notifications ?? true
  );
  const [weeklyDigest, setWeeklyDigest] = useState(profile?.weekly_digest ?? true);
  const [achievementNotifications, setAchievementNotifications] = useState(
    profile?.achievement_notifications ?? true
  );
  const [courseReminders, setCourseReminders] = useState(
    profile?.course_reminders ?? true
  );

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          bio,
          preferredLocale,
          theme,
          emailNotifications,
          weeklyDigest,
          achievementNotifications,
          courseReminders,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(translations.saved);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(data.error || 'Failed to save');
      }
    } catch (error) {
      setMessage('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      {/* Header */}
      <div className="mb-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Settings className="h-12 w-12 text-primary" />
          <div>
            <h1 className="text-5xl font-bold tracking-tight">{translations.title}</h1>
            <p className="mt-2 text-xl text-muted-foreground">{translations.subtitle}</p>
          </div>
        </motion.div>
      </div>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl bg-primary/20 p-4 text-center font-semibold text-primary"
        >
          {message}
        </motion.div>
      )}

      {/* Profile Settings */}
      <div className="mb-8 rounded-3xl border border-white/20 bg-black/20 p-8 backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <Globe className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{translations.profile}</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold">
              {translations.displayName}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">{translations.bio}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">{translations.locale}</label>
              <select
                value={preferredLocale}
                onChange={(e) => setPreferredLocale(e.target.value as 'en' | 'es')}
                className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">{translations.theme}</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
                className="w-full rounded-xl border border-white/20 bg-black/40 px-4 py-3 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="light">{translations.themeLight}</option>
                <option value="dark">{translations.themeDark}</option>
                <option value="system">{translations.themeSystem}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="mb-8 rounded-3xl border border-white/20 bg-black/20 p-8 backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{translations.notifications}</h2>
        </div>

        <div className="space-y-4">
          {[
            { key: 'emailNotifications', value: emailNotifications, setter: setEmailNotifications, label: translations.emailNotifications },
            { key: 'weeklyDigest', value: weeklyDigest, setter: setWeeklyDigest, label: translations.weeklyDigest },
            { key: 'achievementNotifications', value: achievementNotifications, setter: setAchievementNotifications, label: translations.achievementNotifications },
            { key: 'courseReminders', value: courseReminders, setter: setCourseReminders, label: translations.courseReminders },
          ].map((item) => (
            <label key={item.key} className="flex cursor-pointer items-center justify-between">
              <span className="font-medium">{item.label}</span>
              <button
                type="button"
                onClick={() => item.setter(!item.value)}
                className={`relative h-8 w-14 rounded-full transition-all ${
                  item.value ? 'bg-primary' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
                    item.value ? 'right-1' : 'left-1'
                  }`}
                />
              </button>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={isLoading}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          <Save size={20} />
          {translations.save}
        </motion.button>
      </div>
    </div>
  );
}
