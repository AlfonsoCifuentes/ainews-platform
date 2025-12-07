"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { calculateLevel } from '@/lib/gamification/xp';
import {
  Bookmark,
  Flame,
  Gauge,
  Grid,
  LogOut,
  Settings,
  Trophy,
  User2,
} from 'lucide-react';

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
    { href: `/${locale}/dashboard`, label: locale === 'en' ? 'Dashboard' : 'Panel', icon: Gauge },
    { href: `/${locale}/profile`, label: locale === 'en' ? 'Profile' : 'Perfil', icon: User2 },
    { href: `/${locale}/bookmarks`, label: locale === 'en' ? 'Saved' : 'Guardados', icon: Bookmark },
    { href: `/${locale}/trending`, label: locale === 'en' ? 'Trending' : 'Tendencias', icon: Flame },
    { href: `/${locale}/kg`, label: locale === 'en' ? 'Knowledge Graph' : 'Grafo de Conocimiento', icon: Grid },
    { href: `/${locale}/leaderboard`, label: locale === 'en' ? 'Leaderboard' : 'Clasificación', icon: Trophy },
    { href: `/${locale}/settings`, label: locale === 'en' ? 'Settings' : 'Configuración', icon: Settings },
  ];

  return (
    <div className="relative group z-50 h-full">
      {/* Avatar Button - Compact */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        className="relative my-[2px] flex h-full min-h-[48px] items-center gap-2 border border-white/15 bg-[#050505] pl-0 pr-3 py-0 transition-all hover:border-white/40 rounded-none"
      >
        {/* Avatar */}
        <div className="relative h-10 w-10 overflow-hidden bg-white/10 border border-white/12">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name || 'User'}
              width={32}
              height={32}
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
        <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.14em] text-white/80">
          <span className="text-white">{profile.display_name?.split(' ')[0] || 'User'}</span>
          <span className="px-2 py-0.5 border border-white/20 bg-white/5 text-white/90">L{currentLevel}</span>
          <span className="px-2 py-0.5 border border-white/15 bg-white/5 text-white/80">{(profile.total_xp || 0).toLocaleString()} XP</span>
        </div>

        {/* Dropdown Icon */}
        <svg
          className="h-3 w-3 text-white/60 transition-transform group-hover:rotate-180"
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
        <div className="rounded-xl border border-white/12 bg-[#050505] p-2 shadow-2xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center gap-3 rounded-lg px-4 py-3 border border-white/10 bg-white/5 mb-2">
            <div className="h-10 w-10 overflow-hidden bg-white/10 border border-white/12 flex items-center justify-center">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name || 'User'}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-white">{(profile.display_name || 'U')[0].toUpperCase()}</span>
              )}
            </div>
            <div className="flex flex-col text-xs font-mono uppercase tracking-[0.12em] text-white">
              <span className="text-white text-sm leading-tight">{profile.display_name || 'User'}</span>
              <div className="flex gap-2 mt-1">
                <span className="px-2 py-0.5 border border-white/20 bg-white/5 text-white/90">L{currentLevel}</span>
                <span className="px-2 py-0.5 border border-white/15 bg-white/5 text-white/80">{(profile.total_xp || 0).toLocaleString()} XP</span>
              </div>
            </div>
          </div>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all uppercase tracking-[0.12em] text-[12px] ${
                    isActive ? 'bg-white/10 text-white' : 'text-white/80 hover:bg-white/5'
                  }`}
              >
                  <item.icon className="h-4 w-4 text-white" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
          
          {/* Divider */}
          <div className="my-2 border-t border-white/10" />
          
          {/* Sign Out */}
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-white transition-all hover:bg-white/5 uppercase tracking-[0.12em] text-[12px]"
            >
              <LogOut className="h-4 w-4 text-white" />
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
