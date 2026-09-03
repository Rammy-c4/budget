import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LocalStorageManager } from './lib/storage';

// Synchronously ensure theme is applied to DOM prior to React rendering
const initialTheme = LocalStorageManager.getSavedTheme();
LocalStorageManager.applyThemeToDOM(initialTheme);

// Register Service Worker for offline PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
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
