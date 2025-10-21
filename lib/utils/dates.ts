import type { Locale } from '@/i18n';

const relativeTimeUnits: Array<{
  unit: Intl.RelativeTimeFormatUnit;
  ms: number;
}> = [
  { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
  { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
  { unit: 'week', ms: 1000 * 60 * 60 * 24 * 7 },
  { unit: 'day', ms: 1000 * 60 * 60 * 24 },
  { unit: 'hour', ms: 1000 * 60 * 60 },
  { unit: 'minute', ms: 1000 * 60 },
];

export function formatRelativeTimeFromNow(
  isoDate: string,
  locale: Locale,
): string {
  const date = new Date(isoDate);
  const now = new Date();

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diff = date.getTime() - now.getTime();
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  for (const { unit, ms } of relativeTimeUnits) {
    const value = diff / ms;
    if (Math.abs(value) >= 1) {
      return formatter.format(Math.round(value), unit);
    }
  }

  return formatter.format(Math.round(diff / 1000), 'second');
}
