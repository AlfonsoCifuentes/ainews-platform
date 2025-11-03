import Script from 'next/script';

export function UmamiAnalytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_SITE_ID;
  const src = process.env.NEXT_PUBLIC_UMAMI_URL;

  if (!websiteId || !src) {
    console.warn('Umami analytics not configured');
    return null;
  }

  return (
    <Script
      async
      src={src}
      data-website-id={websiteId}
      strategy="afterInteractive"
    />
  );
}
