/// <reference types="vite-plugin-pwa/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

const queryClient = new QueryClient();

// Register Service Worker for PWA offline caching (disabled inside iframe environments like AI Studio)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.self === window.top) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      try {
        registerSW({
          onNeedRefresh() {
            console.log('New content available, please refresh.');
          },
          onOfflineReady() {
            console.log('App ready to work offline.');
          },
        });
      } catch (err) {
        console.warn('Service worker registration bypassed:', err);
      }
    })
    .catch((err) => {
      console.warn('PWA register import failed:', err);
    });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
