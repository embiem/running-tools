/**
 * Numbers and dates in the app's language.
 *
 * Plain TS on top of Paraglide's `getLocale()` (a rune while the app runs, see
 * i18n.svelte.ts), so the pure tool engines can format their advice flags with
 * it too. Numbers keep `toFixed` semantics — same rounding, no thousands
 * separators — and only swap the decimal mark, so English reads exactly as it
 * did before the app was translated: 2.5 (en), 2,5 (de, es).
 */

import { getLocale } from '../paraglide/runtime.js'

const decimalMarks = new Map<string, string>()
const percentSuffixes = new Map<string, string>()

function decimalMark(locale: string): string {
  let mark = decimalMarks.get(locale)
  if (mark === undefined) {
    const parts = new Intl.NumberFormat(locale).formatToParts(1.5)
    mark = parts.find((part) => part.type === 'decimal')?.value ?? '.'
    decimalMarks.set(locale, mark)
  }
  return mark
}

/** What follows the number in a percentage: "%" in English, a no-break space and "%" in German and Spanish. */
function percentSuffix(locale: string): string {
  let suffix = percentSuffixes.get(locale)
  if (suffix === undefined) {
    const parts = new Intl.NumberFormat(locale, { style: 'percent' }).formatToParts(0.5)
    const types = parts.map((part) => part.type)
    const sign = types.indexOf('percentSign')
    const number = types.lastIndexOf('integer')
    suffix = sign > number ? parts.slice(number + 1, sign + 1).map((part) => part.value).join('') : '%'
    percentSuffixes.set(locale, suffix)
  }
  return suffix
}

/** `value.toFixed(digits)` with the locale's decimal mark. */
export function formatFixed(value: number, digits: number): string {
  return value.toFixed(digits).replace('.', decimalMark(getLocale()))
}

/** `String(value)` with the locale's decimal mark, for figures shown unrounded. */
export function formatDecimal(value: number): string {
  return String(value).replace('.', decimalMark(getLocale()))
}

/** A percentage, `digits` decimals: "12%" (en), "12 %" (de, es). */
export function formatPercent(value: number, digits = 0): string {
  return `${formatFixed(value, digits)}${percentSuffix(getLocale())}`
}

/**
 * The locale to format dates in: the browser's own regional variant when it
 * speaks the app's language (en-GB keeps day-before-month, de-AT its month
 * names), else the app's language itself.
 */
export function dateLocale(): string {
  const locale = getLocale()
  const regional = navigator.languages?.find((tag) => tag.split('-')[0].toLowerCase() === locale)
  return regional ?? locale
}
