"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { calculateLevel } from '@/lib/gamification/xp';

interface UserAvatarMenuProps {
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    total_xp: number;
    level: number;
  } | null;
  locale: 'en' | 'es';
}

export function UserAvatarMenu({ profile, locale }: UserAvatarMenuProps) {
  const pathname = usePathname();
  
  if (!profile) {
    return null;
  }

  const currentLevel = profile.level || calculateLevel(profile.total_xp || 0);

  const menuItems = [
    { href: `/${locale}/dashboard`, label: locale === 'en' ? 'Dashboard' : 'Panel', icon: '📊' },
    { href: `/${locale}/profile`, label: locale === 'en' ? 'Profile' : 'Perfil', icon: '👤' },
    { href: `/${locale}/bookmarks`, label: locale === 'en' ? 'Saved' : 'Guardados', icon: '🔖' },
    { href: `/${locale}/trending`, label: locale === 'en' ? 'Trending' : 'Tendencias', icon: '🔥' },
    { href: `/${locale}/kg`, label: locale === 'en' ? 'Knowledge Graph' : 'Grafo de Conocimiento', icon: '🕸️' },
    { href: `/${locale}/leaderboard`, label: locale === 'en' ? 'Leaderboard' : 'Clasificación', icon: '🏆' },
    { href: `/${locale}/settings`, label: locale === 'en' ? 'Settings' : 'Configuración', icon: '⚙️' },
  ];

  return (
    <div className="relative group">
      {/* Avatar Button - Compact */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        className="relative flex items-center gap-1.5 border border-white/10 bg-black/40 px-2 py-1 backdrop-blur-xl transition-all hover:border-white/20"
      >
        {/* Avatar */}
        <div className="relative h-6 w-6 overflow-hidden bg-white/10">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name || 'User'}
              width={24}
              height={24}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
              {(profile.display_name || 'U')[0].toUpperCase()}
            </div>
          )}
        </div>
        {/* Hidden marker to target animation */}
        <div className="user-avatar-target absolute inset-0 pointer-events-none" aria-hidden />

        {/* Compact info */}
        <div className="hidden lg:flex items-center gap-1 text-[10px] font-mono text-[#888]">
          <span className="text-white">{profile.display_name?.split(' ')[0] || 'User'}</span>
          <span>L{currentLevel}</span>
        </div>

        {/* Dropdown Icon */}
        <svg
          className="h-3 w-3 text-[#888] transition-transform group-hover:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </motion.button>

      {/* Dropdown Menu */}
      <div className="absolute right-0 top-full mt-2 w-56 origin-top-right scale-0 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
        <div className="glass rounded-xl border border-white/10 p-2 shadow-xl max-h-[80vh] overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all hover:bg-primary/10 ${
                  isActive ? 'bg-primary/20 text-primary' : ''
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
          
          {/* Divider */}
          <div className="my-2 border-t border-white/10" />
          
          {/* Sign Out */}
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-red-400 transition-all hover:bg-red-500/10"
            >
              <span className="text-xl">🚪</span>
              <span className="font-medium">
                {locale === 'en' ? 'Sign Out' : 'Cerrar Sesión'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
