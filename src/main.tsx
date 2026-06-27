/// <reference types="vite-plugin-pwa/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

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
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
