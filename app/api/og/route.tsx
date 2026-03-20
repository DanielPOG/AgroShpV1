import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f0fdf4',
          position: 'relative',
        }}
      >
        {/* Top green bar */}
        <div style={{ width: '100%', height: 8, backgroundColor: '#16a34a' }} />
        
        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, padding: '60px 80px', alignItems: 'center' }}>
          {/* Leaf icon */}
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: '50%',
              backgroundColor: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 60,
              fontSize: 80,
            }}
          >
            🌱
          </div>
          
          {/* Text */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 72, fontWeight: 700, color: '#15803d', lineHeight: 1.1 }}>
              AgroShop
            </div>
            <div style={{ fontSize: 32, color: '#166534', marginTop: 8 }}>
              SENA - Centro Agropecuario
            </div>
            <div
              style={{
                width: 120,
                height: 4,
                backgroundColor: '#16a34a',
                borderRadius: 2,
                marginTop: 24,
                marginBottom: 24,
              }}
            />
            <div style={{ fontSize: 26, color: '#374151', lineHeight: 1.4 }}>
              Sistema de gestión de ventas, inventario y producción
            </div>
          </div>
        </div>
        
        {/* Bottom green bar */}
        <div
          style={{
            width: '100%',
            height: 70,
            backgroundColor: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 22,
          }}
        >
          🌱 Productos agropecuarios frescos y de calidad
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
