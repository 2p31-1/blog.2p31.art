import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Header } from '@/components/Header';
import { Box } from '@radix-ui/themes';
import { config } from '@/lib/config';

export const metadata: Metadata = {
  title: config.blogName,
  description: config.blogDescription,
  metadataBase: new URL(config.siteUrl),
  openGraph: {
    title: config.blogName,
    description: config.blogDescription,
    siteName: config.blogName,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: config.blogName,
    description: config.blogDescription,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="alternate" type="application/rss+xml" title={config.blogName} href="/feed.xml" />
      </head>
      <body>
        <ThemeProvider>
          <Box pb="9" style={{ minHeight: '100vh' }}>
            <Header />
            <main style={{ maxWidth: 'var(--container-3)', margin: '0 auto', padding: 'var(--space-6) var(--space-4) var(--space-9)' }}>
              {children}
            </main>
          </Box>
        </ThemeProvider>
      </body>
    </html>
  );
}
