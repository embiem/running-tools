/**
 * The app's language: English, German or Spanish.
 *
 * Copy lives in messages/{locale}.json. English is the source; German and
 * Spanish carry exactly the same keys and placeholders (`npm run check`
 * enforces it, scripts/check-messages.mjs). Paraglide JS compiles the three
 * files into one typed function per message in src/paraglide — generated,
 * gitignored — so a component writes `m.home_lede()` and a missing key or a
 * missing parameter is a type error.
 *
 * Every message function asks Paraglide's `getLocale()` which language to
 * speak. This module answers from a rune, so switching language re-renders
 * every message in place: no page reload, so a running metronome or workout
 * keeps going (Paraglide's own `setLocale()` reloads the page).
 *
 * The first visit follows the browser: the first of `navigator.languages` the
 * app speaks, by full tag and then by base tag (de-AT → de, es-MX → es), else
 * English. A language picked in the top bar is saved and wins from then on.
 */

import {
  baseLocale,
  extractLocaleFromNavigator,
  isLocale,
  localStorageKey,
  overwriteGetLocale,
} from '../paraglide/runtime.js'
import type { Locale } from '../paraglide/runtime.js'

export type { Locale }

/**
 * A message with no parameters, as data holds it: `name: m.tool_metronome_name`,
 * called when rendered so it always reads in the current language.
 */
export type Message = (inputs?: Record<string, never>, options?: { locale?: Locale }) => string

/** Each language by its own name, for the picker. */
export const LANGUAGES: { id: Locale; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'de', name: 'Deutsch' },
  { id: 'es', name: 'Español' },
]

function savedLocale(): Locale | undefined {
  try {
    const saved = localStorage.getItem(localStorageKey)
    return isLocale(saved) ? saved : undefined
  } catch {
    return undefined
  }
}

// Resolved here rather than by Paraglide's getLocale(), which saves whatever it
// detects on first use — that would pin the browser's language as if it had
// been picked, and a later change of browser language would be ignored.
let current = $state<Locale>(savedLocale() ?? extractLocaleFromNavigator() ?? baseLocale)

overwriteGetLocale(() => current)
document.documentElement.lang = current

export function getLanguage(): Locale {
  return current
}

/** Switch language everywhere at once and remember the choice. */
export function setLanguage(locale: Locale): void {
  current = locale
  document.documentElement.lang = locale
  try {
    localStorage.setItem(localStorageKey, locale)
  } catch {
    /* storage unavailable — the choice holds for this session */
  }
}
