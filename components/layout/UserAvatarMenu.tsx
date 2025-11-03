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
    { href: `/${locale}/settings`, label: locale === 'en' ? 'Settings' : 'Configuración', icon: '⚙️' },
  ];

  return (
    <div className="relative group">
      {/* Avatar Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-2 backdrop-blur-xl transition-all hover:border-primary/30 hover:bg-black/30"
      >
        {/* Avatar */}
        <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-purple-600/20">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name || 'User'}
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl font-bold text-primary">
              {(profile.display_name || 'U')[0].toUpperCase()}
            </div>
          )}
          {/* Level Badge */}
          <div className="absolute -bottom-1 -right-1 rounded-full bg-primary px-1.5 py-0.5 text-xs font-bold">
            {currentLevel}
          </div>
        </div>

        {/* Name (desktop only) */}
        <div className="hidden md:block">
          <p className="text-sm font-semibold">{profile.display_name || 'User'}</p>
          <p className="text-xs text-muted-foreground">
            Level {currentLevel} • {profile.total_xp || 0} XP
          </p>
        </div>

        {/* Dropdown Icon */}
        <svg
          className="h-4 w-4 text-muted-foreground transition-transform group-hover:rotate-180"
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
      <div className="absolute right-0 top-full mt-2 w-48 origin-top-right scale-0 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
        <div className="glass rounded-xl border border-white/10 p-2 shadow-xl">
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
