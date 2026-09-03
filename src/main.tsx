import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LocalStorageManager } from './lib/storage';
import { initAnalytics } from './lib/analytics';

// Initialize anonymous privacy-first analytics (safe no-op if no ID configured or offline)
initAnalytics();

// Synchronously ensure theme is applied to DOM prior to React rendering
const initialTheme = LocalStorageManager.getSavedTheme();
LocalStorageManager.applyThemeToDOM(initialTheme);

// Register Service Worker for offline PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker
      .register(swUrl)
      .then((reg) => {
        console.log('Local Budget SW registered:', reg.scope);
      })
      .catch((err) => {
        console.log('Local Budget SW registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
