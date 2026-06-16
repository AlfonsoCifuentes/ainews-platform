import { Radio } from 'lucide-react';

type CorroborationBadgeProps = {
  count: number;
  locale: string;
  className?: string;
  variant?: 'solid' | 'outline';
};

/**
 * Shows how many independent outlets are covering the same story.
 * Renders nothing for singletons (count <= 1) so it only highlights
 * genuinely corroborated, widely-reported news.
 */
export function CorroborationBadge({
  count,
  locale,
  className = '',
  variant = 'solid',
}: CorroborationBadgeProps) {
  if (!count || count <= 1) return null;

  const label =
    locale === 'es' ? `${count} medios lo cubren` : `Covered by ${count} outlets`;

  const styles =
    variant === 'solid'
      ? 'bg-[#6366f1] text-white'
      : 'border border-[#6366f1]/50 bg-[#6366f1]/10 text-[#a5b4fc]';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${styles} ${className}`}
      title={label}
    >
      <Radio className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
