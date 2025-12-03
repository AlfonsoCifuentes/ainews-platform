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
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default async function Icon() {
  const logoDataUri = await getLogoDataUri()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#020617',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          padding: 2,
        }}
      >
        <div
          style={{
            width: '90%',
            height: '90%',
            backgroundImage: `url('${logoDataUri}')`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            filter: 'drop-shadow(0 0 6px rgba(59,130,246,0.6))',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
