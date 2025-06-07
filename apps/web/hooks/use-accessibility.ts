import React, { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Announce route changes to screen readers
export function useRouteAnnouncer() {
  const router = useRouter();
  
  useEffect(() => {
    const announcer = document.getElementById('route-announcer');
    if (!announcer) {
      const div = document.createElement('div');
      div.id = 'route-announcer';
      div.setAttribute('aria-live', 'assertive');
      div.setAttribute('aria-atomic', 'true');
      div.className = 'sr-only';
      document.body.appendChild(div);
    }
    
    const handleRouteChange = (url: string) => {
      const announcer = document.getElementById('route-announcer');
      if (announcer) {
        const pageName = getPageName(url);
        announcer.textContent = `Navigated to ${pageName}`;
      }
    };
    
    // Listen to route changes
    window.addEventListener('popstate', () => handleRouteChange(window.location.pathname));
    
    return () => {
      window.removeEventListener('popstate', () => handleRouteChange(window.location.pathname));
    };
  }, [router]);
}

// Focus management for modals and overlays
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    // Store current focus
    previousFocusRef.current = document.activeElement as HTMLElement;
    
    // Get focusable elements
    const focusableElements = containerRef.current.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    // Focus first element
    firstFocusable?.focus();
    
    // Handle tab navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };
    
    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        previousFocusRef.current?.focus();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleEscape);
      
      // Restore focus
      previousFocusRef.current?.focus();
    };
  }, [isActive]);
  
  return containerRef;
}

// Keyboard navigation for lists and grids
export function useArrowNavigation(itemCount: number, onSelect?: (index: number) => void) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(itemCount - 1, prev + 1));
        break;
      case 'Home':
        e.preventDefault();
        setSelectedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setSelectedIndex(itemCount - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect?.(selectedIndex);
        break;
    }
  }, [itemCount, selectedIndex, onSelect]);
  
  return {
    selectedIndex,
    handleKeyDown,
    setSelectedIndex,
  };
}

// Live region announcements
export function useAnnouncer() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.getElementById(`announcer-${priority}`);
    if (announcer) {
      announcer.textContent = message;
      // Clear after announcement
      setTimeout(() => {
        announcer.textContent = '';
      }, 1000);
    }
  }, []);
  
  useEffect(() => {
    // Create announcers if they don't exist
    ['polite', 'assertive'].forEach(priority => {
      if (!document.getElementById(`announcer-${priority}`)) {
        const div = document.createElement('div');
        div.id = `announcer-${priority}`;
        div.setAttribute('aria-live', priority);
        div.setAttribute('aria-atomic', 'true');
        div.className = 'sr-only';
        document.body.appendChild(div);
      }
    });
  }, []);
  
  return announce;
}

// Skip navigation link
export function useSkipNavigation() {
  useEffect(() => {
    const skipLink = document.getElementById('skip-navigation');
    if (!skipLink) {
      const link = document.createElement('a');
      link.id = 'skip-navigation';
      link.href = '#main-content';
      link.className = 'skip-link';
      link.textContent = 'Skip to main content';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const main = document.getElementById('main-content');
        main?.focus();
        main?.scrollIntoView();
      });
      document.body.insertBefore(link, document.body.firstChild);
    }
  }, []);
}

// Reduced motion preference
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return prefersReducedMotion;
}

// Helper functions
function getPageName(url: string): string {
  const path = url.split('?')[0];
  const segments = path.split('/').filter(Boolean);
  
  if (segments.length === 0) return 'Home page';
  
  const pageName = segments[segments.length - 1]
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
  
  return `${pageName} page`;
}

// Keyboard shortcuts
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = `${e.metaKey || e.ctrlKey ? 'cmd+' : ''}${e.shiftKey ? 'shift+' : ''}${e.key.toLowerCase()}`;
      
      if (shortcuts[key]) {
        e.preventDefault();
        shortcuts[key]();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Screen reader only text component
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}