import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter, Space_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'

import './globals.css'

const _inter = Inter({ subsets: ['latin'] })
const _spaceMono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'] })

const baseTitle = 'PDF Translator - Traduce documentos PDF al instante'
const baseDescription = 'Arrastra tu PDF, selecciona el idioma de destino y descarga tu documento traducido con inteligencia artificial.'

export const metadata: Metadata = {
  metadataBase: new URL('https://pdf-ai-translator.vercel.app'),
  title: baseTitle,
  description: baseDescription,
  keywords: [
    'PDF',
    'traductor',
    'inteligencia artificial',
    'documentos',
    'traducción instantánea',
  ],
  openGraph: {
    title: baseTitle,
    description: baseDescription,
    url: 'https://pdf-ai-translator.vercel.app',
    siteName: 'PDF Translator',
    locale: 'es_ES',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'PDF Translator - Traduce documentos PDF al instante',
      },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0d14',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
