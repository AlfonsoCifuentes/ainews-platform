import { ImageResponse } from 'next/og'

const LOGO_URL = new URL('../public/logos/thotnet-core-white-only.svg', import.meta.url)
let cachedLogoDataUri: string | null = null

async function getLogoDataUri() {
  if (cachedLogoDataUri) {
    return cachedLogoDataUri
  }
  const logoSvg = await fetch(LOGO_URL).then((res) => res.text())
  cachedLogoDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(logoSvg)}`
  return cachedLogoDataUri
}

export const runtime = 'edge'

export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

export default async function AppleIcon() {
  const logoDataUri = await getLogoDataUri()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 30% 30%, #1f2937, #020617)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 32,
          padding: 16,
          boxShadow: 'inset 0 0 20px rgba(15,23,42,0.6)',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url('${logoDataUri}')`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            filter: 'drop-shadow(0 0 16px rgba(59,130,246,0.55))',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
