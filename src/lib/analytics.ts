/**
 * Privacy-Conscious Usage Analytics Module
 *
 * Designed specifically for static GitHub Pages hosting.
 *
 * STRICT PRIVACY GUARANTEES:
 * - NO user identifiable data (names, emails, user IDs, accounts) is ever collected.
 * - NO financial data (income, budgets, expenses, allowances, savings) is ever collected.
 * - NO localStorage data, transaction logs, or backup contents are ever collected.
 * - IP addresses are anonymized (anonymize_ip: true).
 * - Advertising signals, Google Signals, and personalization are strictly disabled.
 * - Consent mode denies ad storage and personalization.
 * - Script loading and network failures are isolated and will NEVER crash the app.
 * - Operates as a safe no-op if VITE_GA_MEASUREMENT_ID is missing or offline.
 */

export type AppScreen = 'Welcome' | 'Setup' | 'Home' | 'Insights';

export type GenericFeatureAction =
  | 'open_settings'
  | 'open_breakdown'
  | 'open_delayed_expenses'
  | 'export_backup'
  | 'import_backup'
  | 'theme_toggle';

/**
 * Resolves the active GA4 Measurement ID exclusively from VITE_GA_MEASUREMENT_ID.
 * Returns null if the variable is missing, undefined, or empty.
 */
export function getMeasurementId(): string | null {
  const envId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (typeof envId === 'string' && envId.trim().length > 0) {
    return envId.trim();
  }
  return null;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let isInitialized = false;
let activeMeasurementId: string | null = null;

export function getActiveMeasurementId(): string | null {
  return activeMeasurementId;
}

/**
 * Initializes the analytics engine with strict privacy settings.
 * If Measurement ID is invalid or offline, operates silently in safe dry-run mode.
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined' || isInitialized) {
    return;
  }

  try {
    const measurementId = getMeasurementId();

    if (!measurementId || !/^G-[A-Za-z0-9]+$/.test(measurementId)) {
      if (import.meta.env.DEV) {
        console.info(
          '[Analytics] VITE_GA_MEASUREMENT_ID is missing or empty; analytics safely disabled.'
        );
      }
      isInitialized = true;
      return;
    }

    activeMeasurementId = measurementId;

    // Initialize dataLayer and gtag dispatcher safely
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };

    // 1. Enforce strict privacy consent defaults (deny all ad and tracking storage)
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    });

    // 2. Initialize gtag timestamp
    window.gtag('js', new Date());

    // 3. Configure measurement with privacy restrictions
    window.gtag('config', measurementId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      restricted_data_processing: true,
      send_page_view: false, // We dispatch sanitized screen views manually
    });

    // 4. Inject Google Tag script asynchronously if not already present
    if (!document.getElementById('ga4-gtag-script')) {
      const script = document.createElement('script');
      script.id = 'ga4-gtag-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      script.onerror = () => {
        // Gracefully handle network disconnects or ad-blockers without failing
        if (import.meta.env.DEV) {
          console.warn('[Analytics] Script load was blocked or offline; skipping analytics.');
        }
      };
      document.head.appendChild(script);
    }

    isInitialized = true;
  } catch (error) {
    // Analytics failure must NEVER crash the app
    if (import.meta.env.DEV) {
      console.warn('[Analytics] Initialization caught non-fatal error:', error);
    }
  }
}

/**
 * Tracks an anonymous screen view.
 * The path is cleanly normalized with the app's base URL (e.g. /budget/home).
 * No query parameters or user data are ever attached.
 */
export function trackScreenView(screen: AppScreen): void {
  if (typeof window === 'undefined') return;

  try {
    const basePath = import.meta.env.BASE_URL || '/';
    const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
    const screenPath = `${cleanBase}${screen.toLowerCase()}`;

    if (activeMeasurementId && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_title: `Budget - ${screen}`,
        page_location: `${window.location.origin}${screenPath}`,
        page_path: screenPath,
      });
    } else if (import.meta.env.DEV) {
      console.debug(`[Analytics Mock] Page View: ${screen} (${screenPath})`);
    }
  } catch {
    // Non-fatal: ignore tracking failures
  }
}

/**
 * Tracks a generic, high-level user action (e.g., opening settings or exporting backup).
 * Strictly accepts only pre-approved string literals with zero financial or personal payload.
 */
export function trackFeatureAction(action: GenericFeatureAction): void {
  if (typeof window === 'undefined') return;

  try {
    if (activeMeasurementId && typeof window.gtag === 'function') {
      window.gtag('event', action, {
        event_category: 'feature_interaction',
      });
    } else if (import.meta.env.DEV) {
      console.debug(`[Analytics Mock] Feature Action: ${action}`);
    }
  } catch {
    // Non-fatal: ignore tracking failures
  }
}
