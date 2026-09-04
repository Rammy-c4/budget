/**
 * Centralized Haptic Feedback Utility for Web / PWA
 * 
 * Strict Scope: Haptic feedback is exclusively restricted to three premium experiences:
 * 1. NAME LETTER-CARD STACKING (outer-to-inner card landings, deck complete, logo absorption)
 * 2. BUDGET PARAMETERS BEING SAVED + ABSORBED INTO THE LOGO (subtle absorption + strong completion)
 * 3. EMOJI/MASCOT CHANGING REACTION (synchronized pulse only when reaction/mood state changes)
 * 
 * All ordinary interactions (taps, navigation, toggles, saves, validations, dialogs)
 * have zero haptic vibration.
 * 
 * - Web / PWA only (navigator.vibrate).
 * - Fails silently if vibration is unsupported or disabled.
 * - Respects prefers-reduced-motion media query.
 * - No audio feedback, sounds, or fake haptics.
 */

function isVibrationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.vibrate === 'function'
  );
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function safeVibrate(pattern: number | number[]): void {
  try {
    if (!isVibrationSupported()) return;
    navigator.vibrate(pattern);
  } catch {
    // Fail silently - never throw or block execution
  }
}

export type CardLandStage = 'outer' | 'middle' | 'final';

export const haptics = {
  /**
   * 1. CARD LANDING / CONVERGENCE (Outer-to-inner sequence)
   * Short, noticeable pulses synchronized with physical card impacts on the stack:
   * - Outer cards = light pulse (22ms)
   * - Middle cards = slightly stronger pulse (29ms)
   * - Final deck formation = stronger short confirmation pulse (38ms)
   */
  cardLand(stage: CardLandStage | number = 'middle', totalStages?: number): void {
    if (prefersReducedMotion()) {
      safeVibrate(13);
      return;
    }

    let resolvedStage: CardLandStage = 'middle';
    if (typeof stage === 'string') {
      resolvedStage = stage;
    } else if (typeof stage === 'number' && typeof totalStages === 'number' && totalStages > 0) {
      if (stage === 0) resolvedStage = 'outer';
      else if (stage === totalStages - 1) resolvedStage = 'final';
      else resolvedStage = 'middle';
    }

    switch (resolvedStage) {
      case 'outer':
        safeVibrate(22);
        break;
      case 'middle':
        safeVibrate(29);
        break;
      case 'final':
        safeVibrate(38);
        break;
      default:
        safeVibrate(27);
        break;
    }
  },

  /**
   * 2. DECK COMPLETION
   * ONE distinct short haptic confirmation when the full playing card deck
   * finishes landing and settles into a unified stack.
   */
  deckComplete(): void {
    if (prefersReducedMotion()) {
      safeVibrate(16);
      return;
    }
    safeVibrate([29, 36, 38]);
  },

  /**
   * 3. LOGO ABSORPTION / COMPLETION
   * Stronger short absorption/confirmation haptic pulse when elements
   * (card deck or budget parameters) complete absorption into the logo.
   */
  logoAbsorb(): void {
    if (prefersReducedMotion()) {
      safeVibrate(22);
      return;
    }
    safeVibrate([50, 36, 63]);
  },

  /**
   * 4. BUDGET PARAMETERS ABSORBING (Subtle absorption pulse)
   * A subtle pulse triggered at the meaningful visual moment when the saved
   * budget parameter chips meet the logo aperture and are swallowed.
   */
  budgetParamAbsorb(): void {
    if (prefersReducedMotion()) {
      safeVibrate(11);
      return;
    }
    safeVibrate(24);
  },

  /**
   * 5. EMOJI / MASCOT REACTION CHANGE
   * Triggers ONE short haptic synchronized with the new emoji entering/reacting.
   * Only fired when the displayed expense mascot/emoji actually changes to a different state.
   * Stronger reactions (e.g. over budget / alarmed) use a slightly stronger pulse.
   */
  emojiChange(moodType?: string, _emoji?: string): void {
    if (prefersReducedMotion()) {
      safeVibrate(12);
      return;
    }

    switch (moodType) {
      case 'OVER_BUDGET':
        // Sad / shocked / over-budget: slightly stronger pulse
        safeVibrate(38);
        break;
      case 'GETTING_CLOSE':
        // Worried / caution: medium pulse
        safeVibrate(30);
        break;
      case 'AHEAD_OF_GOAL':
      case 'EXCELLENT':
        // Happy / ahead / celebratory: crisp upbeat pulse
        safeVibrate(25);
        break;
      case 'ON_TRACK':
        // Normal / on track: gentle crisp pulse
        safeVibrate(20);
        break;
      default:
        safeVibrate(22);
        break;
    }
  },

  /**
   * Direct check whether vibration haptics are supported in the current environment
   */
  isSupported(): boolean {
    return isVibrationSupported();
  },
};

export default haptics;

