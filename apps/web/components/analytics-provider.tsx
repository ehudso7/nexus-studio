'use client';

import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface AnalyticsProviderProps {
  children?: React.ReactNode;
  debug?: boolean;
}

export function AnalyticsProvider({ children, debug = false }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Custom page view tracking
    if (debug) {
      console.log('[Analytics] Page view:', {
        path: pathname,
        query: Object.fromEntries(searchParams.entries()),
        timestamp: new Date().toISOString(),
      });
    }
  }, [pathname, searchParams, debug]);

  return (
    <>
      {children}
      <Analytics
        mode={process.env.NODE_ENV === 'production' ? 'production' : 'development'}
        debug={debug || process.env.VERCEL_ANALYTICS_DEBUG === 'true'}
      />
      <SpeedInsights
        debug={debug || process.env.VERCEL_ANALYTICS_DEBUG === 'true'}
        sampleRate={process.env.NODE_ENV === 'production' ? 1 : 0.1}
      />
    </>
  );
}

// Custom event tracking hooks
export function useAnalytics() {
  return {
    // Track custom events
    track: (eventName: string, properties?: Record<string, any>) => {
      if (typeof window !== 'undefined' && window.vercel?.analytics) {
        window.vercel.analytics.track(eventName, properties);
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[Analytics] Event:', eventName, properties);
      }
    },
    
    // Track user actions
    trackAction: (action: string, category: string, label?: string, value?: number) => {
      if (typeof window !== 'undefined' && window.vercel?.analytics) {
        window.vercel.analytics.track('user_action', {
          action,
          category,
          label,
          value,
        });
      }
    },
    
    // Track errors
    trackError: (error: Error, context?: Record<string, any>) => {
      if (typeof window !== 'undefined' && window.vercel?.analytics) {
        window.vercel.analytics.track('error', {
          message: error.message,
          stack: error.stack,
          ...context,
        });
      }
    },
    
    // Track conversions
    trackConversion: (type: string, value?: number, metadata?: Record<string, any>) => {
      if (typeof window !== 'undefined' && window.vercel?.analytics) {
        window.vercel.analytics.track('conversion', {
          type,
          value,
          ...metadata,
        });
      }
    },
  };
}

// Declare window.vercel types
declare global {
  interface Window {
    vercel?: {
      analytics?: {
        track: (event: string, properties?: Record<string, any>) => void;
      };
    };
  }
}