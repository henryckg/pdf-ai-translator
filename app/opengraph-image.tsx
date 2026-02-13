import { ImageResponse } from 'next/og'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '70px',
          background: '#05060d',
          color: '#f8fafc',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            color: '#a5f3fc',
            fontSize: 28,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: '#0ea5e9',
              boxShadow: '0 0 30px #0ea5e9',
            }}
          />
          PDF · AI · Translator
        </div>

        <div style={{ display: 'flex', gap: 32 }}>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontSize: 86,
                lineHeight: 1.05,
                margin: 0,
                fontWeight: 700,
              }}
            >
              Traduce PDFs completos con IA en segundos
            </h1>
            <p
              style={{
                marginTop: 28,
                fontSize: 32,
                color: '#cbd5f5',
              }}
            >
              Arrastra tu documento, detecta el idioma automáticamente y obtén una versión lista para compartir.
            </p>
          </div>

          <div
            style={{
              width: 320,
              borderRadius: 32,
              padding: 28,
              background: 'linear-gradient(180deg, rgba(14,165,233,0.25), rgba(14,165,233,0.05))',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              boxShadow: '0 20px 60px rgba(5,6,13,0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            {[
              'Carga tu PDF',
              'Detectamos su idioma',
              'Traducción instantánea',
              'Descarga con un clic',
            ].map((step, index) => (
              <div key={step} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    color: '#38bdf8',
                  }}
                >
                  {index + 1}
                </div>
                <span style={{ fontSize: 24, color: '#e2e8f0' }}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 26,
            color: '#94a3b8',
          }}
        >
          <span>pdf-ai-translator.vercel.app</span>
          <span>Powered by GPT-4o mini</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
