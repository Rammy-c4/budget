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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
