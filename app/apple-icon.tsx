import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
 
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'
 
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 100,
          background: '#0a0e27',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#3b82f6',
          fontWeight: 'bold',
          borderRadius: '20px',
        }}
      >
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          lineHeight: '1',
          gap: '8px'
        }}>
          <span style={{ fontSize: '80px', fontWeight: '900' }}>AI</span>
          <span style={{ fontSize: '36px', marginTop: '-12px', color: '#60a5fa' }}>News</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
