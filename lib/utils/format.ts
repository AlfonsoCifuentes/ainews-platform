/**
 * Formats a date relative to now
 * e.g., "2 hours ago", "Yesterday", "Last week"
 */
export function formatRelativeTimeFromNow(date: Date, locale: 'en' | 'es'): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  const translations = {
    en: {
      justNow: 'Just now',
      minutesAgo: (n: number) => `${n} ${n === 1 ? 'minute' : 'minutes'} ago`,
      hoursAgo: (n: number) => `${n} ${n === 1 ? 'hour' : 'hours'} ago`,
      yesterday: 'Yesterday',
      daysAgo: (n: number) => `${n} days ago`,
      lastWeek: 'Last week',
      weeksAgo: (n: number) => `${n} weeks ago`,
      lastMonth: 'Last month',
      monthsAgo: (n: number) => `${n} months ago`,
      lastYear: 'Last year',
      yearsAgo: (n: number) => `${n} years ago`,
    },
    es: {
      justNow: 'Justo ahora',
      minutesAgo: (n: number) => `Hace ${n} ${n === 1 ? 'minuto' : 'minutos'}`,
      hoursAgo: (n: number) => `Hace ${n} ${n === 1 ? 'hora' : 'horas'}`,
      yesterday: 'Ayer',
      daysAgo: (n: number) => `Hace ${n} días`,
      lastWeek: 'La semana pasada',
      weeksAgo: (n: number) => `Hace ${n} semanas`,
      lastMonth: 'El mes pasado',
      monthsAgo: (n: number) => `Hace ${n} meses`,
      lastYear: 'El año pasado',
      yearsAgo: (n: number) => `Hace ${n} años`,
    },
  };

  const t = translations[locale];

  if (diffSec < 60) return t.justNow;
  if (diffMin < 60) return t.minutesAgo(diffMin);
  if (diffHour < 24) return t.hoursAgo(diffHour);
  if (diffDay === 1) return t.yesterday;
  if (diffDay < 7) return t.daysAgo(diffDay);
  if (diffWeek === 1) return t.lastWeek;
  if (diffWeek < 4) return t.weeksAgo(diffWeek);
  if (diffMonth === 1) return t.lastMonth;
  if (diffMonth < 12) return t.monthsAgo(diffMonth);
  if (diffYear === 1) return t.lastYear;
  return t.yearsAgo(diffYear);
}

/**
 * Formats a date to a localized string
 */
export function formatDate(date: Date, locale: 'en' | 'es'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Formats a date to a localized string with time
 */
export function formatDateTime(date: Date, locale: 'en' | 'es'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
}

/**
 * Formats a number to a compact localized string
 * e.g., 1000 -> "1K", 1000000 -> "1M"
 */
export function formatCompactNumber(num: number, locale: 'en' | 'es'): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
}

/**
 * Formats a duration in seconds to readable time
 * e.g., 125 -> "2m 5s", 3665 -> "1h 1m"
 */
export function formatDuration(seconds: number, locale: 'en' | 'es'): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}${locale === 'en' ? 'h' : 'h'}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}${locale === 'en' ? 'm' : 'm'}`);
  }
  if (secs > 0 && hours === 0) {
    parts.push(`${secs}${locale === 'en' ? 's' : 's'}`);
  }

  return parts.join(' ') || '0s';
}
