/**
 * Taper planner engine.
 *
 * Pure date arithmetic and proportional volume maths: given a race date, the
 * race distance, your normal training week and how many days a week you run, it
 * counts the taper back from race day and returns a week-by-week volume target
 * plus a day-by-day schedule.
 *
 * Model and sources.
 * - A taper is a progressive, nonlinear reduction of the training load: keep
 *   training intensity, cut training volume (up to 60–90%), reduce training
 *   frequency only slightly (no more than 20%). Optimal duration ranges from
 *   4 to more than 28 days, nonlinear tapers beat step tapers, and performance
 *   usually improves by about 3% (range 0.5–6.0%). Mujika I, Padilla S,
 *   "Scientific bases for precompetition tapering strategies", Med Sci Sports
 *   Exerc 2003;35(7):1182-7 (PMID 12840640).
 * - The volume target comes from the meta-analysis that puts the optimum at a
 *   2-week taper in which training volume is *exponentially* decreased by
 *   41–60%, with no modification of either intensity or frequency. Bosquet L,
 *   Montpetit J, Arvisais D, Mujika I, "Effects of tapering on performance: a
 *   meta-analysis", Med Sci Sports Exerc 2007;39(8):1358-65 (PMID 17762369).
 *   Its 27 studies pooled 439 competitive athletes of whom only 110 were
 *   runners (249 swimmers, 80 cyclists), so the band is used here as a target
 *   for running, not as a running measurement.
 * - The largest data set from runners themselves agrees with the shape and the
 *   length: of 158,117 recreational marathoners, those whose weekly volume fell
 *   in every taper week out-performed those whose did not, longer tapers beat
 *   shorter ones up to 3 weeks, and a strict 3-week taper was worth a median
 *   5 min 32 s (2.6%) against a minimal one. Those runners averaged 39.3 km
 *   (women) and 43.2 km (men) a week over 3.6 runs, and their tapers were
 *   gentler than the meta-analysis band: roughly 30–40% off the normal week,
 *   with race week at 35–50% of it. Smyth B, Lawlor A, "Longer disciplined
 *   tapers improve marathon performance for recreational runners", Front Sports
 *   Act Living 2021;3:735220. The default normal week, run count and the volume
 *   thresholds below come from that table.
 * - So the weekly training volume here decays geometrically, with the decay
 *   calibrated so that the volume over the whole taper window lands 50% below
 *   the same number of normal weeks — the middle of that 41–60% band. The race
 *   is not part of the training volume: race week is a short training week plus
 *   the race. The reduction actually scheduled is reported back, so the day
 *   layout can be checked against the band rather than assumed.
 * - Session types are convention, not measurement: frequency is unchanged (the
 *   same number of runs, each shorter), one long run per week up to race week
 *   (about 40% of the week's distance in the marathoner data above), one short
 *   race-pace sharpener per week, everything scaled down with the week. That is
 *   "maintain intensity, cut volume" from both papers expressed as a calendar;
 *   keeping the intensity is the part the intervention studies actually test
 *   (Shepley 1992; Mujika 2000), the calendar around it is running practice.
 *
 * Stateless by design: pure functions, constants and types.
 */

import type { Flag } from './flags'

const METERS_PER_MILE = 1609.344
const DAYS_PER_WEEK = 7
const MS_PER_DAY = 86_400_000

/**
 * Total training-volume reduction over the taper window, as a fraction. The
 * meta-analysis optimum is 41–60%; the model aims at the middle of that band.
 */
const TAPER_VOLUME_REDUCTION = 0.5

/** Session weights inside a week: the long run is the week's biggest day. */
const WEIGHT_LONG = 2.5
const WEIGHT_QUALITY = 1.2
const WEIGHT_EASY = 1
const WEIGHT_STRIDES = 0.8

/**
 * The day-before shakeout never grows into a real run, whatever the weights
 * say: a short jog with a few strides is priming, and the evidence for it is
 * small and variable (Hedges' g ≈ 0.23, prediction interval spanning zero, in
 * the 2025 delayed-priming meta-analysis), so it stays a habit to keep light
 * rather than a session to bank.
 */
const STRIDES_CAP_METERS = 6000

/**
 * A sharpener sits three days into its week, but never closer than this to the
 * race. Keeping the intensity is the part the evidence requires; a hard session
 * also needs days to be absorbed, so the last one stays at least five days out
 * (running practice, not a published protocol).
 */
const MIN_SHARPENER_DAYS = 5

/**
 * Volumes below these make a taper close to meaningless. The lower one is half
 * the average recreational marathoner's week; the upper one is that average
 * itself (39.3 km women / 43.2 km men, Smyth & Lawlor 2021), under which three
 * weeks is more than the meta-analysis optimum calls for.
 */
const LOW_VOLUME_METERS = 20_000
const LONG_TAPER_VOLUME_METERS = 40_000

export type DistanceId = '5k' | '10k' | '10mi' | 'hm' | 'marathon' | 'custom'
export type Unit = 'km' | 'mi'
export type TaperWeeks = 2 | 3
export type SessionKind = 'race' | 'long' | 'quality' | 'strides' | 'easy' | 'rest'

export interface TaperInput {
  raceDate: string // YYYY-MM-DD, local calendar date
  distance: DistanceId
  customMeters: number // used when distance === 'custom'
  weeklyDistance: number // your normal training week, in `unit`
  unit: Unit
  taperWeeks: TaperWeeks
  runsPerWeek: number
}

export interface TaperDay {
  date: string // YYYY-MM-DD
  daysToRace: number
  kind: SessionKind
  meters: number // 0 on rest days
}

export interface TaperWeek {
  index: number // 1-based; the last week is race week
  label: string
  startDate: string
  endDate: string
  trainingMeters: number // race day excluded
  pctOfNormal: number
  raceMeters: number // race day distance, 0 outside race week
  days: TaperDay[] // chronological
}

export interface TaperResult {
  raceDate: string
  raceMeters: number
  normalWeeklyMeters: number
  taperStartDate: string
  taperDays: number
  totalReductionPct: number
  weeks: TaperWeek[]
  flags: Flag[]
}

export const DISTANCES: Record<DistanceId, { label: string; meters: number | null }> = {
  '5k': { label: '5 km', meters: 5000 },
  '10k': { label: '10 km', meters: 10_000 },
  '10mi': { label: '10 miles', meters: 16_093.44 },
  hm: { label: 'Half marathon', meters: 21_097.5 },
  marathon: { label: 'Marathon', meters: 42_195 },
  custom: { label: 'Custom distance', meters: null },
}

/** Taper length defaults: the longer races get the longer taper. */
export const DEFAULT_TAPER_WEEKS: Record<DistanceId, TaperWeeks> = {
  '5k': 2,
  '10k': 2,
  '10mi': 2,
  hm: 3,
  marathon: 3,
  custom: 2,
}

export const TAPER_WEEKS_OPTIONS: TaperWeeks[] = [2, 3]

export const SESSION_LABELS: Record<SessionKind, string> = {
  race: 'Race',
  long: 'Long run',
  quality: 'Race-pace sharpener',
  strides: 'Easy + strides',
  easy: 'Easy',
  rest: 'Rest',
}

/**
 * Numeric limits and defaults. The two distance defaults are the average weekly
 * distance of the 158,117 recreational marathoners in Smyth & Lawlor 2021
 * (39.3 km / 43.2 km) and their 3.6 runs a week, rounded to something a form
 * can start from.
 */
export const LIMITS = {
  customMeters: { min: 800, max: 200_000, step: 100, fallback: 10_000 },
  weeklyDistanceKm: { min: 10, max: 400, step: 1, fallback: 40 },
  weeklyDistanceMi: { min: 5, max: 250, step: 1, fallback: 25 },
  runsPerWeek: { min: 2, max: 7, step: 1, fallback: 4 },
} as const

interface Bounds {
  min: number
  max: number
  fallback: number
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Parse a YYYY-MM-DD string into a local Date at noon, so day maths is DST-proof. */
function parseDate(iso: string): Date | null {
  if (!ISO_DATE.test(iso)) return null
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null
}

function toISODate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Today's local calendar date, as YYYY-MM-DD. */
export function todayISO(): string {
  return toISODate(new Date())
}

function addDays(iso: string, days: number): string {
  const date = parseDate(iso) ?? new Date()
  return toISODate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12))
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = parseDate(fromISO)
  const to = parseDate(toISO)
  return from && to ? Math.round((to.getTime() - from.getTime()) / MS_PER_DAY) : 0
}

/** The next Sunday at least `days` out — the default race date. */
function nextSundayAtLeast(fromISO: string, days: number): string {
  const date = parseDate(addDays(fromISO, days))
  const weekday = date ? date.getDay() : 0
  return addDays(fromISO, days + ((DAYS_PER_WEEK - weekday) % DAYS_PER_WEEK))
}

/** Distance in the runner's unit, e.g. "42.2 km", "13.1 mi". */
export function formatDistance(meters: number, unit: Unit): string {
  const value = unit === 'km' ? meters / 1000 : meters / METERS_PER_MILE
  return `${value.toFixed(1).replace(/\.0$/, '')} ${unit}`
}

/** Convert a distance between the two units — a no-op when they already match. */
export function convertDistance(value: number, from: Unit, to: Unit): number {
  return from === to ? value : toMeters(value, from) / (to === 'km' ? 1000 : METERS_PER_MILE)
}

function isDistanceId(value: unknown): value is DistanceId {
  return typeof value === 'string' && value in DISTANCES
}

function isUnit(value: unknown): value is Unit {
  return value === 'km' || value === 'mi'
}

function isTaperWeeks(value: unknown): value is TaperWeeks {
  return value === 2 || value === 3
}

function toMeters(distance: number, unit: Unit): number {
  return distance * (unit === 'km' ? 1000 : METERS_PER_MILE)
}

/**
 * Clamp a numeric field. An absent value — `undefined` from an emptied form
 * field, `null`, `''` — is *missing*, not zero, so it falls back to the default
 * rather than collapsing to the minimum.
 */
function clampNumber(value: unknown, bounds: Bounds): number {
  if (value === undefined || value === null || value === '') return bounds.fallback
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(bounds.max, Math.max(bounds.min, n)) : bounds.fallback
}

/**
 * Defaults used when a field is missing: a half marathon on the next Sunday at
 * least three weeks out, so a fresh visit shows a real schedule. Unlike the
 * drink mix defaults this depends on today's date, which is why it is a
 * function rather than a constant.
 */
export function defaultTaperInput(today: string = todayISO()): TaperInput {
  return {
    raceDate: nextSundayAtLeast(today, 21),
    distance: 'hm',
    customMeters: LIMITS.customMeters.fallback,
    weeklyDistance: LIMITS.weeklyDistanceKm.fallback,
    unit: 'km',
    taperWeeks: DEFAULT_TAPER_WEEKS.hm,
    runsPerWeek: LIMITS.runsPerWeek.fallback,
  }
}

/**
 * Validate anything that claims to be a TaperInput (stored preferences, a form
 * bound to a half-empty field) into a fresh, fully populated TaperInput. An
 * unrecognised or missing field falls back to `defaultTaperInput`. Never throws.
 */
export function normalizeTaperInput(raw: unknown, today: string = todayISO()): TaperInput {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const fallback = defaultTaperInput(today)
  const distance = isDistanceId(r.distance) ? r.distance : fallback.distance
  const unit = isUnit(r.unit) ? r.unit : fallback.unit
  const weeklyBounds = unit === 'km' ? LIMITS.weeklyDistanceKm : LIMITS.weeklyDistanceMi
  return {
    raceDate:
      typeof r.raceDate === 'string' && parseDate(r.raceDate) ? r.raceDate : fallback.raceDate,
    distance,
    customMeters: Math.round(clampNumber(r.customMeters, LIMITS.customMeters)),
    weeklyDistance: clampNumber(r.weeklyDistance, weeklyBounds),
    unit,
    taperWeeks: isTaperWeeks(r.taperWeeks) ? r.taperWeeks : DEFAULT_TAPER_WEEKS[distance],
    runsPerWeek: Math.round(clampNumber(r.runsPerWeek, LIMITS.runsPerWeek)),
  }
}

/**
 * True only when every field is present and usable. An emptied number field
 * binds as `undefined`, which makes this false — the UI uses it to skip
 * persisting mid-edit, so the stored preference keeps the last complete value
 * instead of the fallback `normalizeTaperInput` would substitute for it.
 */
export function isCompleteTaperInput(raw: unknown): boolean {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const numbers = [r.customMeters, r.weeklyDistance, r.runsPerWeek]
  return (
    typeof r.raceDate === 'string' &&
    parseDate(r.raceDate) !== null &&
    isDistanceId(r.distance) &&
    isUnit(r.unit) &&
    isTaperWeeks(r.taperWeeks) &&
    numbers.every((value) => typeof value === 'number' && Number.isFinite(value))
  )
}

function raceMetersOf(input: TaperInput): number {
  return DISTANCES[input.distance].meters ?? input.customMeters
}

function geometricSum(x: number, terms: number): number {
  let sum = 0
  let power = 1
  for (let k = 0; k < terms; k++) {
    power *= x
    sum += power
  }
  return sum
}

/**
 * The geometric weekly decay whose sum over the taper equals the target
 * reduction: solve Σ x^i = weeks × (1 − TAPER_VOLUME_REDUCTION) for x in (0,1)
 * by bisection. Two weeks gives x ≈ 0.618 (weeks at 62% and 38% of normal);
 * three weeks decays more gently (69%, 48%, 33%), since the same total
 * reduction is spread over one more week. The runnable-distance grid moves a
 * week's realized share by a point or so either way; `totalReductionPct` on the
 * result reports what the days actually add up to.
 */
function taperDecay(weeks: number): number {
  const target = weeks * (1 - TAPER_VOLUME_REDUCTION)
  let lo = 0.05
  let hi = 0.999
  for (let step = 0; step < 60; step++) {
    const mid = (lo + hi) / 2
    if (geometricSum(mid, weeks) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

function weightOf(kind: SessionKind): number {
  if (kind === 'long') return WEIGHT_LONG
  if (kind === 'quality') return WEIGHT_QUALITY
  if (kind === 'strides') return WEIGHT_STRIDES
  return WEIGHT_EASY
}

/** Evenly spread `count` picks over `pool` (pool ordered earliest first). */
function spread(pool: number[], count: number): number[] {
  const picks: number[] = []
  if (count <= 0 || pool.length === 0) return picks
  for (let j = 0; j < count; j++) {
    picks.push(pool[Math.min(pool.length - 1, Math.floor(((j + 0.5) * pool.length) / count))])
  }
  return picks
}

/**
 * Split a week's training volume over its running days by session weight, then
 * round each day to something runnable (half a kilometre, half a mile). The
 * day-before shakeout is capped: whatever the weights say, it stays a shakeout,
 * and any excess it sheds goes to the other days (or is dropped, if it is the
 * week's only run).
 *
 * Rounding takes the largest remainders, so the week's days add up to the week's
 * target instead of drifting above it: the metres each day loses to the grid are
 * handed back to the days that lost the most, and the shakeout never receives a
 * step back.
 */
function distributeVolume(
  volumeMeters: number,
  running: DaySlot[],
  roundStepMeters: number,
): void {
  if (running.length === 0) return

  const weights = running.map((slot) => weightOf(slot.kind))
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const meters = weights.map((weight) => (weight / totalWeight) * volumeMeters)

  const stridesIndex = running.findIndex((slot) => slot.kind === 'strides')
  // The cap is a metric constant; snap it down to the unit's grid so the
  // shakeout stays a round number in miles too (3.5 mi rather than 3.7 mi).
  const stridesCap =
    Math.max(1, Math.floor(STRIDES_CAP_METERS / roundStepMeters)) * roundStepMeters
  if (stridesIndex >= 0 && meters[stridesIndex] > stridesCap) {
    const excess = meters[stridesIndex] - stridesCap
    meters[stridesIndex] = stridesCap
    const otherWeight = weights.reduce((sum, w, k) => (k === stridesIndex ? sum : sum + w), 0)
    if (otherWeight > 0) {
      meters.forEach((value, k) => {
        if (k !== stridesIndex) meters[k] = value + (weights[k] / otherWeight) * excess
      })
    }
  }

  const steps = meters.map((value) => Math.max(1, Math.floor(value / roundStepMeters)))
  const target = Math.max(steps.length, Math.round(volumeMeters / roundStepMeters))
  let leftover = target - steps.reduce((sum, value) => sum + value, 0)
  const byRemainder = meters
    .map((value, k) => ({ k, remainder: value / roundStepMeters - steps[k] }))
    .sort((a, b) => b.remainder - a.remainder)

  for (const { k } of byRemainder) {
    if (leftover <= 0) break
    if (k === stridesIndex) continue
    steps[k]++
    leftover--
  }
  for (let i = byRemainder.length - 1; i >= 0 && leftover < 0; i--) {
    const { k } = byRemainder[i]
    if (steps[k] <= 1) continue
    steps[k]--
    leftover++
  }

  running.forEach((slot, k) => {
    slot.meters = steps[k] * roundStepMeters
  })
}

interface WeekContext {
  raceDate: string
  raceMeters: number
  normalWeeklyMeters: number
  decay: number
  roundStepMeters: number
  runsPerWeek: number
  taperWeeks: number
}

interface DaySlot {
  daysToRace: number
  kind: SessionKind
  meters: number
}

function buildWeek(index: number, ctx: WeekContext): TaperWeek {
  const raceWeek = index === ctx.taperWeeks
  const weekStart = DAYS_PER_WEEK * (ctx.taperWeeks - index + 1) - 1
  const daysToRace = Array.from({ length: DAYS_PER_WEEK }, (_, k) => weekStart - k)
  const targetMeters = ctx.decay ** index * ctx.normalWeeklyMeters

  // Slots are ordered earliest first, so index = weekStart − daysToRace.
  const slots: DaySlot[] = daysToRace.map((d) => ({ daysToRace: d, kind: 'easy', meters: 0 }))
  const assign = (daysToRace: number, kind: SessionKind): void => {
    const slot = slots[weekStart - daysToRace]
    if (slot) slot.kind = kind
  }

  // The race and the day-before shakeout are fixed; the long run opens every
  // week before race week; the sharpener fits if the runner's run count has
  // room for it. The race is not a training run, so it does not use a slot.
  const budget = raceWeek ? Math.max(0, ctx.runsPerWeek - 1) : ctx.runsPerWeek
  let trainingRuns = 0
  if (raceWeek) {
    assign(0, 'race')
    assign(1, 'strides')
    trainingRuns = 1
  } else {
    assign(weekStart, 'long')
    trainingRuns = 1
  }
  if (trainingRuns < budget) {
    assign(Math.max(weekStart - 3, MIN_SHARPENER_DAYS), 'quality')
    trainingRuns++
  }

  // Rest days fill the days that are neither fixed nor needed as running days,
  // spread across the week. Race week always rests two days out when it can.
  const free = slots.filter((slot) => slot.kind === 'easy').map((slot) => slot.daysToRace)
  const restCount = Math.max(
    0,
    Math.min(free.length, free.length - Math.max(0, budget - trainingRuns)),
  )
  const forcedRest = raceWeek && restCount > 0 && free.includes(2) ? 2 : null
  const pool = forcedRest === null ? free : free.filter((d) => d !== forcedRest)
  const restDays = spread(pool, forcedRest === null ? restCount : restCount - 1)
  if (forcedRest !== null) restDays.push(forcedRest)
  restDays.forEach((d) => assign(d, 'rest'))

  distributeVolume(
    targetMeters,
    slots.filter((slot) => slot.kind !== 'race' && slot.kind !== 'rest'),
    ctx.roundStepMeters,
  )

  const days: TaperDay[] = slots.map((slot) => ({
    date: addDays(ctx.raceDate, -slot.daysToRace),
    daysToRace: slot.daysToRace,
    kind: slot.kind,
    meters: slot.kind === 'race' ? ctx.raceMeters : slot.meters,
  }))
  const trainingMeters = days.reduce((sum, day) => sum + (day.kind === 'race' ? 0 : day.meters), 0)

  return {
    index,
    label: raceWeek ? 'Race week' : `${ctx.taperWeeks - index + 1} weeks out`,
    startDate: addDays(ctx.raceDate, -weekStart),
    endDate: addDays(ctx.raceDate, -(weekStart - (DAYS_PER_WEEK - 1))),
    trainingMeters,
    pctOfNormal: Math.round((trainingMeters / ctx.normalWeeklyMeters) * 100),
    raceMeters: raceWeek ? ctx.raceMeters : 0,
    days,
  }
}

/**
 * The taper schedule. Normalizes its argument first, so a half-typed field can
 * never propagate into the maths, and takes today's date as an optional
 * argument so the flags stay deterministic when called from a script.
 */
export function predictTaper(input: TaperInput, today: string = todayISO()): TaperResult {
  const i = normalizeTaperInput(input, today)
  const raceMeters = raceMetersOf(i)
  const normalWeeklyMeters = toMeters(i.weeklyDistance, i.unit)
  const ctx: WeekContext = {
    raceDate: i.raceDate,
    raceMeters,
    normalWeeklyMeters,
    decay: taperDecay(i.taperWeeks),
    roundStepMeters: i.unit === 'km' ? 500 : METERS_PER_MILE / 2,
    runsPerWeek: i.runsPerWeek,
    taperWeeks: i.taperWeeks,
  }

  const weeks: TaperWeek[] = []
  for (let index = 1; index <= i.taperWeeks; index++) weeks.push(buildWeek(index, ctx))

  const taperDays = i.taperWeeks * DAYS_PER_WEEK
  const taperStartDate = addDays(i.raceDate, -(taperDays - 1))
  const scheduledMeters = weeks.reduce((sum, week) => sum + week.trainingMeters, 0)
  const totalReductionPct = Math.round(100 * (1 - scheduledMeters / (taperDays / DAYS_PER_WEEK) / normalWeeklyMeters))

  const flags: Flag[] = []
  if (i.raceDate < today) {
    flags.push({
      level: 'warn',
      message: 'This race date is in the past — pick an upcoming race for a schedule you can run.',
    })
  } else if (taperStartDate < today) {
    flags.push({
      level: 'info',
      message: `The taper is already under way: today is day ${daysBetween(taperStartDate, today) + 1} of ${taperDays}. Earlier days are shown for reference.`,
    })
  }
  if (raceMeters > normalWeeklyMeters) {
    flags.push({
      level: 'warn',
      message: `Your race (${formatDistance(raceMeters, i.unit)}) is longer than your normal training week (${formatDistance(normalWeeklyMeters, i.unit)}). A taper makes you fresh, not fit — the volume has to be there first.`,
    })
  }
  if (normalWeeklyMeters < LOW_VOLUME_METERS) {
    flags.push({
      level: 'info',
      message: `Under ${formatDistance(LOW_VOLUME_METERS, i.unit)} a week there is little volume to shed: keep the taper short and change nothing else.`,
    })
  }
  if (i.taperWeeks === 3 && normalWeeklyMeters < LONG_TAPER_VOLUME_METERS) {
    flags.push({
      level: 'info',
      message: `Three weeks is a long taper at ${formatDistance(normalWeeklyMeters, i.unit)} a week. Two weeks is the meta-analysis optimum; three suits a high-volume marathon block.`,
    })
  }
  if (i.taperWeeks === 3 && (i.distance === '5k' || i.distance === '10k')) {
    flags.push({
      level: 'info',
      message: 'Short races are usually tapered for one to two weeks; three weeks can leave you feeling stale.',
    })
  }
  if (totalReductionPct > 60) {
    flags.push({
      level: 'info',
      message: `The day layout cuts ${totalReductionPct}% of your normal volume, deeper than the 41–60% the literature favours, because ${i.runsPerWeek} runs a week cannot absorb the planned days. Add a run day to hold more.`,
    })
  } else if (totalReductionPct < 41) {
    flags.push({
      level: 'info',
      message: `The schedule cuts ${totalReductionPct}% of your normal volume, less than the 41–60% band. Drop a run or shorten the easy days if you want a deeper taper.`,
    })
  }

  return {
    raceDate: i.raceDate,
    raceMeters,
    normalWeeklyMeters,
    taperStartDate,
    taperDays,
    totalReductionPct,
    weeks,
    flags,
  }
}
