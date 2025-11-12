import { ImageResponse } from 'next/og'
 
// Route segment config
export const runtime = 'edge'
 
// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'
 
// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: '#0a0e27',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#3b82f6',
          fontWeight: 'bold',
          borderRadius: '6px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          lineHeight: '1'
        }}>
          <span style={{ fontSize: '14px', fontWeight: '900' }}>AI</span>
          <span style={{ fontSize: '8px', marginTop: '-2px', color: '#60a5fa' }}>News</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
