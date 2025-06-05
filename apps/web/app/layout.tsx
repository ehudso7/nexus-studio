import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { AnalyticsProvider } from '@/components/analytics-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NexStudio - Visual App Builder',
  description: 'Build production-ready web, mobile, and desktop applications visually',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://nexstudio.dev'),
  openGraph: {
    title: 'NexStudio - Visual App Builder',
    description: 'Build production-ready web, mobile, and desktop applications visually',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NexStudio - Visual App Builder',
    description: 'Build production-ready web, mobile, and desktop applications visually',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            <AnalyticsProvider debug={process.env.NODE_ENV === 'development'}>
              {children}
              <Toaster position="top-right" />
            </AnalyticsProvider>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}