import { useEffect } from 'react';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './providers/AuthProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { AppRouter } from './router';
import { Toaster } from '@/components/ui/use-toast';
import { OfflineBanner } from '@/modules/common/components/OfflineBanner';
import '@/styles/global.css';

/**
 * Block app if loaded in iframe (anti-clickjacking).
 * Backend should also send X-Frame-Options: DENY.
 */
function useAntiClickjack() {
  useEffect(() => {
    try {
      if (window.self !== window.top) {
        document.body.innerHTML = '';
        document.title = 'Access denied';
        throw new Error('Cannot load in frame');
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'Cannot load in frame') throw e;
    }
  }, []);
}

function AppContent() {
  useAntiClickjack();
  return (
    <>
      <OfflineBanner />
      <AppRouter />
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
