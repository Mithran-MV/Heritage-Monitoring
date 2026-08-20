import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import { Providers } from './providers';
import './globals.css';

const inter = Inter({ variable: '--font-sans', subsets: ['latin'] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Heritage Monitoring — IoT telemetry for protected monuments',
    template: '%s · Heritage Monitoring',
  },
  description:
    'Live environmental and structural telemetry for heritage sites: authenticated sensor ingest, streaming dashboards, threshold alerting and exportable history.',
  applicationName: 'Heritage Monitoring',
  authors: [{ name: 'Mithran MV', url: 'https://github.com/Mithran-MV' }],
  keywords: ['IoT', 'heritage conservation', 'sensor monitoring', 'ESP32', 'Next.js'],
  openGraph: {
    type: 'website',
    siteName: 'Heritage Monitoring',
    title: 'Heritage Monitoring',
    description: 'Live IoT telemetry and alerting for protected monuments.',
    url: siteUrl,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1020' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable}>
        {/* Applies the stored colour scheme before first paint, avoiding a flash. */}
        <InitColorSchemeScript attribute="class" defaultMode="system" />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
