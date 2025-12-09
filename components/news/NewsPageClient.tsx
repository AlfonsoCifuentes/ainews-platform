"use client";

interface NewsPageClientProps {
  children: React.ReactNode;
  locale: string;
}

export function NewsPageClient({ children }: NewsPageClientProps) {
  return <>{children}</>;
}
