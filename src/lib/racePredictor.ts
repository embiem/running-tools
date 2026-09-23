/**
 * Race predictor + pace planner engine.
 *
 * One recent race result in; equivalent performances, a pace plan for the goal
 * race and the training paces that follow from the same fitness score out.
 *
 * Two models run side by side because they answer the same question from
 * different evidence, and where they disagree the spread *is* the answer:
 *
 *   Riegel (1981), "Athletic records and human endurance", American Scientist
 *   69:285–290 — first published as a heuristic in Runner's World (1977):
 *
 *     T₂ = T₁ × (D₂ / D₁)^1.06
 *
 *   The fatigue exponent is a population average: Riegel's own fits to running
 *   records give 1.05–1.08, and later piecewise fits to world records argue no
 *   single power law covers every distance. It stays a module constant, not a
 *   UI knob — a knob invites nonsense, and the model spread carries the doubt.
 *
 *   Daniels & Gilbert's "Oxygen Power" regressions, as reproduced in Daniels'
 *   Running Formula (Human Kinetics):
 *
 *     VO₂(v)     = −4.60 + 0.182258·v + 0.000104·v²      v in m/min, VO₂ in mL·kg⁻¹·min⁻¹
 *     %VO₂max(t) = 0.8 + 0.1894393·e^(−0.012778·t) + 0.2989558·e^(−0.1932605·t)
 *     VDOT       = VO₂(v) / %VO₂max(t)                    t in min
 *
 *   VDOT is the fitness score: the VO₂max that would explain the result. The
 *   pace at a target intensity inverts the VO₂ quadratic in closed form; the
 *   race time at a target VDOT does not, because %VO₂max depends on the very
 *   duration being solved for, so it is bisected on t.
 *
 * Training-pace bands are Daniels' published intensity ranges (Easy 59–74%,
 * Marathon 75–84%, Threshold 83–88%, Interval 97–100%, Repetition 105–110% of
 * VDOT). The printed pace tables in the book land at the hard end of each band
 * for M/T/I/R and print a narrower easy range (65–74%); the bands here are the
 * stated intensity ranges, and the paces are computed at their edges.
 *
 * The split plan is run at the models' predicted pace unless the runner sets a
 * pace of their own: `goalPaceSecPerKm` then carries it, and the goal time and
 * every split follow from it. Training paces ignore that override — they say
 * what the race result makes the runner fit for, not what they intend to run.
 *
 * Everything below is metres and seconds; paces are per kilometre and the UI
 * converts to the runner's unit for display.
 */

import type { Flag } from './flags'

const METERS_PER_MILE = 1609.344
const SECONDS_PER_HOUR = 3600

/** Riegel's fatigue exponent (1981) — see the module header. */
export const RIEGEL_EXPONENT = 1.06

// Daniels & Gilbert's regressions, term by term (see the module header).
const VO2_INTERCEPT = -4.6
const VO2_LINEAR = 0.182258
const VO2_QUADRATIC = 0.000104
const PCT_VO2MAX_BASE = 0.8
const PCT_VO2MAX_FAST = 0.1894393
const PCT_VO2MAX_FAST_DECAY = 0.012778
const PCT_VO2MAX_SLOW = 0.2989558
const PCT_VO2MAX_SLOW_DECAY = 0.1932605

/** Bisection bracket for a predicted race time: 1 minute to 10 hours. */
const TIME_SEARCH_MIN = 60
const TIME_SEARCH_MAX = 36_000
const TIME_SEARCH_STEPS = 60

/**
 * How much faster the second half of a negative-split plan runs than the first.
 * The pace ramps linearly across the whole race rather than stepping at halfway,
 * so the plan is runnable instead of theoretical.
 */
export const NEGATIVE_SPLIT_SHARE = 0.015

/** A result older than this is stale — fitness has moved since (8 weeks). */
const STALE_RACE_DAYS = 56
/** Past this goal/input distance ratio, extrapolation dominates the answer. */
const EXTRAPOLATION_RATIO = 4
/** Below this, an exponent fitted to longer races is not really the story. */
const SHORT_RACE_METERS = 1500
/** Above this the aerobic model stops being the limiter: fuelling and terrain do. */
const ULTRA_METERS = 50_000
/** Outside this VDOT band the input time is more likely a typo than a result. */
const PLAUSIBLE_VDOT_MIN = 20
const PLAUSIBLE_VDOT_MAX = 85
/** Model spread at the goal distance worth mentioning, in percent. */
const MODEL_SPREAD_PCT = 5
/** A plan pace this far from the prediction is worth explaining, in percent. */
const PLAN_PACE_DIVERGENCE_PCT = 5

export type DistanceId = '5k' | '10k' | '10mi' | 'hm' | 'marathon' | 'custom'
export type Unit = 'km' | 'mi'
export type SplitStrategy = 'even' | 'negative'
export type TrainingPaceId = 'easy' | 'marathon' | 'threshold' | 'interval' | 'rep'

export interface RaceInput {
  raceDate: string // YYYY-MM-DD, local calendar date the input race was run
  distance: DistanceId
  customMeters: number // used when distance === 'custom'
  time: string // "1:32:00" or "20:00" — parsed by parseDuration
  goalDistance: DistanceId
  goalCustomMeters: number // used when goalDistance === 'custom'
  /**
   * The pace the plan is run at, seconds per km — null follows the models'
   * prediction for the goal distance. Set it to plan an effort of your own.
   */
  goalPaceSecPerKm: number | null
  split: SplitStrategy
  unit: Unit // display unit for paces and split distances
}

export interface RacePrediction {
  seconds: number
  paceSecPerKm: number
}

export interface RaceEquivalent {
  id: DistanceId
  label: string
  meters: number
  riegel: RacePrediction
  daniels: RacePrediction
  /** Absolute spread between the two models, in percent of the Riegel time. */
  deltaPct: number
}

export interface TrainingPace {
  id: TrainingPaceId
  label: string
  /** Pace at the easy end of the band (lower intensity), seconds per km. */
  slowSecPerKm: number
  /** Pace at the hard end of the band (higher intensity), seconds per km. */
  fastSecPerKm: number
  pctBand: string
  note: string
}

export interface RaceSplit {
  index: number // 1-based
  meters: number // this split's length; the last one absorbs the remainder
  cumulativeMeters: number
  splitSec: number
  cumulativeSec: number
}

export interface RaceResult {
  raceMeters: number
  raceSeconds: number
  racePaceSecPerKm: number
  vdot: number
  goalMeters: number
  /** Prediction at the goal distance, by each model. */
  riegel: RacePrediction
  daniels: RacePrediction
  /** The pace the plan uses: the runner's own when set, else the prediction. */
  goalPaceSecPerKm: number
  goalSeconds: number
  goalPaceIsCustom: boolean
  equivalents: RaceEquivalent[]
  trainingPaces: TrainingPace[]
  splits: RaceSplit[]
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

interface Zone {
  id: TrainingPaceId
  label: string
  slowPct: number
  fastPct: number
  note: string
}

/** Daniels' training intensities, easiest first (see the module header). */
const ZONES: Zone[] = [
  {
    id: 'easy',
    label: 'Easy / long',
    slowPct: 0.59,
    fastPct: 0.74,
    note: 'Conversational — the bulk of your week.',
  },
  {
    id: 'marathon',
    label: 'Marathon',
    slowPct: 0.75,
    fastPct: 0.84,
    note: 'Goal marathon pace; comfortably hard for hours.',
  },
  {
    id: 'threshold',
    label: 'Threshold',
    slowPct: 0.83,
    fastPct: 0.88,
    note: 'Comfortably hard, roughly a one-hour effort.',
  },
  {
    id: 'interval',
    label: 'Interval',
    slowPct: 0.97,
    fastPct: 1,
    note: '3–5 minute reps at VO₂max; hard but repeatable.',
  },
  {
    id: 'rep',
    label: 'Repetition',
    slowPct: 1.05,
    fastPct: 1.1,
    note: 'Short fast reps for speed and economy; full recovery.',
  },
]

export const LIMITS = {
  customMeters: { min: 800, max: 200_000, step: 100, fallback: 5000 },
  goalCustomMeters: { min: 800, max: 200_000, step: 100, fallback: 21_097.5 },
  raceSeconds: { min: 60, max: 36_000, fallback: 1200 },
  /** A goal pace outside 2:00–20:00 /km is a typo, not a plan. */
  goalPaceSecPerKm: { min: 120, max: 1200 },
} as const

interface Bounds {
  min: number
  max: number
  fallback: number
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
/** One colon-separated part of a time: digits, optionally with a fraction. */
const TIME_PART = /^\d+(\.\d+)?$/

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

function daysBetween(fromISO: string, toISO: string): number {
  const from = parseDate(fromISO)
  const to = parseDate(toISO)
  return from && to ? Math.round((to.getTime() - from.getTime()) / 86_400_000) : 0
}

/**
 * Parse a race time the way runners write one: `mm:ss` or `h:mm:ss`. A bare
 * number is ambiguous (`20` — minutes or seconds?), so it is rejected and the
 * caller falls back. Returns null for anything else.
 */
export function parseDuration(text: string): number | null {
  const parts = text.trim().split(':')
  if (parts.length < 2 || parts.length > 3) return null
  const numbers = parts.map((part) => (TIME_PART.test(part.trim()) ? Number(part.trim()) : NaN))
  if (numbers.some((value) => !Number.isFinite(value))) return null
  const [hours, minutes, seconds] = parts.length === 3 ? numbers : [0, numbers[0], numbers[1]]
  if (minutes >= 60 || seconds >= 60) return null
  return hours * SECONDS_PER_HOUR + minutes * 60 + seconds
}

/** Seconds as runners write them: `1:32:00`, or `20:00` under an hour. */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  const hours = Math.floor(total / SECONDS_PER_HOUR)
  const minutes = Math.floor((total % SECONDS_PER_HOUR) / 60)
  const rest = total % 60
  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, '0')
  return hours > 0 ? `${hours}:${mm}:${String(rest).padStart(2, '0')}` : `${mm}:${String(rest).padStart(2, '0')}`
}

/** A pace as a clock face in the runner's unit, e.g. "5:27" per km or per mile. */
export function formatPaceClock(secPerKm: number, unit: Unit): string {
  const seconds = Math.round(unit === 'km' ? secPerKm : (secPerKm * METERS_PER_MILE) / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * Parse a pace typed in the runner's unit, e.g. "4:21" per km — the same
 * `mm:ss` syntax as a duration, read as minutes and seconds per unit. Returns
 * seconds per km, or null for anything else.
 */
export function parsePace(text: string, unit: Unit): number | null {
  const perUnit = parseDuration(text)
  if (perUnit === null) return null
  return (perUnit * 1000) / (unit === 'km' ? 1000 : METERS_PER_MILE)
}

/** A pace in the runner's unit, e.g. "5:27 /km". */
export function formatPace(secPerKm: number, unit: Unit): string {
  return `${formatPaceClock(secPerKm, unit)} /${unit}`
}

/** A pace range, slowest end first, e.g. "5:53–4:54 /km". */
export function formatPaceRange(slowSecPerKm: number, fastSecPerKm: number, unit: Unit): string {
  return `${formatPaceClock(slowSecPerKm, unit)}–${formatPaceClock(fastSecPerKm, unit)} /${unit}`
}

/** Distance in the runner's unit, e.g. "21.1 km", "13.1 mi". */
export function formatDistance(meters: number, unit: Unit): string {
  const value = unit === 'km' ? meters / 1000 : meters / METERS_PER_MILE
  return `${value.toFixed(1).replace(/\.0$/, '')} ${unit}`
}

function isDistanceId(value: unknown): value is DistanceId {
  return typeof value === 'string' && value in DISTANCES
}

function isUnit(value: unknown): value is Unit {
  return value === 'km' || value === 'mi'
}

function isSplitStrategy(value: unknown): value is SplitStrategy {
  return value === 'even' || value === 'negative'
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
 * Clamp a goal pace, keeping an absent one absent: null means "follow the
 * prediction", which is a different thing from a slow pace.
 */
function clampGoalPace(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.min(
    LIMITS.goalPaceSecPerKm.max,
    Math.max(LIMITS.goalPaceSecPerKm.min, value),
  )
}

/** Defaults for a fresh visit: a 5 km in 20:00 aiming at 10 km, in kilometres. */
export function defaultRaceInput(today: string = todayISO()): RaceInput {
  return {
    raceDate: today,
    distance: '5k',
    customMeters: LIMITS.customMeters.fallback,
    time: formatDuration(LIMITS.raceSeconds.fallback),
    goalDistance: '10k',
    goalCustomMeters: LIMITS.goalCustomMeters.fallback,
    goalPaceSecPerKm: null,
    split: 'even',
    unit: 'km',
  }
}

/**
 * Validate anything that claims to be a RaceInput (stored preferences, a form
 * bound to a half-typed field) into a fresh, fully populated RaceInput. An
 * unrecognised or unparseable field falls back to `defaultRaceInput`. Never
 * throws.
 */
export function normalizeRaceInput(raw: unknown, today: string = todayISO()): RaceInput {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const fallback = defaultRaceInput(today)
  const parsed = typeof r.time === 'string' ? parseDuration(r.time) : null
  const seconds = Math.min(
    LIMITS.raceSeconds.max,
    Math.max(LIMITS.raceSeconds.min, parsed ?? LIMITS.raceSeconds.fallback),
  )
  return {
    raceDate:
      typeof r.raceDate === 'string' && parseDate(r.raceDate) ? r.raceDate : fallback.raceDate,
    distance: isDistanceId(r.distance) ? r.distance : fallback.distance,
    customMeters: Math.round(clampNumber(r.customMeters, LIMITS.customMeters)),
    time: formatDuration(seconds),
    goalDistance: isDistanceId(r.goalDistance) ? r.goalDistance : fallback.goalDistance,
    goalCustomMeters: Math.round(clampNumber(r.goalCustomMeters, LIMITS.goalCustomMeters)),
    goalPaceSecPerKm: clampGoalPace(r.goalPaceSecPerKm),
    split: isSplitStrategy(r.split) ? r.split : fallback.split,
    unit: isUnit(r.unit) ? r.unit : fallback.unit,
  }
}

/**
 * True only when every field is present and usable. An emptied or half-typed
 * time field makes this false — the UI uses it to skip persisting mid-edit, so
 * the stored preference keeps the last complete value instead of the fallback
 * `normalizeRaceInput` would substitute for it.
 */
export function isCompleteRaceInput(raw: unknown): boolean {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const numbers = [r.customMeters, r.goalCustomMeters]
  return (
    typeof r.raceDate === 'string' &&
    parseDate(r.raceDate) !== null &&
    isDistanceId(r.distance) &&
    isDistanceId(r.goalDistance) &&
    isUnit(r.unit) &&
    isSplitStrategy(r.split) &&
    typeof r.time === 'string' &&
    parseDuration(r.time) !== null &&
    (r.goalPaceSecPerKm === null ||
      (typeof r.goalPaceSecPerKm === 'number' && Number.isFinite(r.goalPaceSecPerKm))) &&
    numbers.every((value) => typeof value === 'number' && Number.isFinite(value))
  )
}

/** VO₂ at a running speed, mL·kg⁻¹·min⁻¹ for v in m/min. */
function vo2AtSpeed(metersPerMinute: number): number {
  return (
    VO2_INTERCEPT + VO2_LINEAR * metersPerMinute + VO2_QUADRATIC * metersPerMinute * metersPerMinute
  )
}

/** Fraction of VO₂max sustainable for a race lasting `minutes`. */
function pctVo2max(minutes: number): number {
  return (
    PCT_VO2MAX_BASE +
    PCT_VO2MAX_FAST * Math.exp(-PCT_VO2MAX_FAST_DECAY * minutes) +
    PCT_VO2MAX_SLOW * Math.exp(-PCT_VO2MAX_SLOW_DECAY * minutes)
  )
}

/** The fitness score a result implies: VO₂ at race speed over %VO₂max at race duration. */
function vdotOf(meters: number, seconds: number): number {
  const minutes = seconds / 60
  return vo2AtSpeed(meters / minutes) / pctVo2max(minutes)
}

/** Speed in m/min at a given fraction of VDOT — the VO₂ quadratic, positive root. */
function speedAtFraction(vdot: number, fraction: number): number {
  const target = fraction * vdot
  const discriminant =
    VO2_LINEAR * VO2_LINEAR + 4 * VO2_QUADRATIC * (target - VO2_INTERCEPT)
  return (-VO2_LINEAR + Math.sqrt(discriminant)) / (2 * VO2_QUADRATIC)
}

/**
 * Race time at a given VDOT, by bisection on t. `VO₂(D/t) / VDOT − %VO₂max(t)`
 * falls monotonically as t grows (speed drops, sustainable fraction rises), so
 * 60 halvings of a 1 min–10 h bracket land exact to well under a second.
 */
function secondsForDistance(meters: number, vdot: number): number {
  let lo = TIME_SEARCH_MIN
  let hi = TIME_SEARCH_MAX
  for (let step = 0; step < TIME_SEARCH_STEPS; step++) {
    const mid = (lo + hi) / 2
    const residual = vo2AtSpeed(meters / (mid / 60)) / vdot - pctVo2max(mid / 60)
    if (residual > 0) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

function prediction(seconds: number, meters: number): RacePrediction {
  return { seconds, paceSecPerKm: (seconds / meters) * 1000 }
}

/**
 * Split plan for the goal race. Splits are one display unit each, with the last
 * one absorbing the remainder (a half marathon in km is 20 × 1 km + 1.1 km, not
 * 21 rows plus a stray 100 m). The ramped weights are rescaled so the splits sum
 * to the predicted time exactly.
 */
function buildSplits(
  meters: number,
  seconds: number,
  unit: Unit,
  split: SplitStrategy,
): RaceSplit[] {
  const unitMeters: number = unit === 'km' ? 1000 : METERS_PER_MILE
  const count = Math.max(1, Math.round(meters / unitMeters))
  const lengths = Array.from({ length: count }, () => unitMeters)
  lengths[count - 1] = meters - unitMeters * (count - 1)

  // Ramp `1 − k·x` over the race, with k set so the second half averages
  // NEGATIVE_SPLIT_SHARE faster than the first: halves average `1 − k/4` and
  // `1 − 3k/4`, so k = s / (0.5 + 0.75·s).
  const slope = split === 'negative' ? NEGATIVE_SPLIT_SHARE / (0.5 + 0.75 * NEGATIVE_SPLIT_SHARE) : 0
  const weights = lengths.map((length, i) => length * (1 - (slope * (i + 0.5)) / count))
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  const scale = meters / weightSum
  const paceSecPerMeter = seconds / meters

  let cumulativeMeters = 0
  let cumulativeSec = 0
  return lengths.map((length, i) => {
    cumulativeMeters += length
    const splitSec = paceSecPerMeter * weights[i] * scale
    cumulativeSec += splitSec
    return { index: i + 1, meters: length, cumulativeMeters, splitSec, cumulativeSec }
  })
}

function buildEquivalents(
  raceMeters: number,
  raceSeconds: number,
  vdot: number,
): RaceEquivalent[] {
  return (Object.entries(DISTANCES) as [DistanceId, { label: string; meters: number | null }][])
    .filter(([, preset]) => preset.meters !== null)
    .map(([id, preset]) => {
      const meters = preset.meters as number
      const riegel = prediction(
        raceSeconds * (meters / raceMeters) ** RIEGEL_EXPONENT,
        meters,
      )
      const daniels = prediction(secondsForDistance(meters, vdot), meters)
      return {
        id,
        label: preset.label,
        meters,
        riegel,
        daniels,
        deltaPct: Math.round((Math.abs(daniels.seconds - riegel.seconds) / riegel.seconds) * 1000) / 10,
      }
    })
}

function buildTrainingPaces(vdot: number): TrainingPace[] {
  return ZONES.map((zone) => ({
    id: zone.id,
    label: zone.label,
    slowSecPerKm: (1000 / speedAtFraction(vdot, zone.slowPct)) * 60,
    fastSecPerKm: (1000 / speedAtFraction(vdot, zone.fastPct)) * 60,
    pctBand: `${Math.round(zone.slowPct * 100)}–${Math.round(zone.fastPct * 100)}% VDOT`,
    note: zone.note,
  }))
}

interface FlagContext {
  input: RaceInput
  raceMeters: number
  goalMeters: number
  racePaceSecPerKm: number
  vdot: number
  deltaPct: number
  /** The pace the plan is run at, and the pace the models predict for it. */
  goalPaceSecPerKm: number
  predictedGoalPaceSecPerKm: number
  today: string
}

/**
 * Everything worth saying about the input, in the order a runner would want to
 * hear it. These carry the model's uncertainty: the numbers themselves are
 * exact, the confidence is not.
 */
function buildFlags(ctx: FlagContext): Flag[] {
  const {
    input,
    raceMeters,
    goalMeters,
    racePaceSecPerKm,
    vdot,
    deltaPct,
    goalPaceSecPerKm,
    predictedGoalPaceSecPerKm,
    today,
  } = ctx
  const flags: Flag[] = []
  const sinceRace = daysBetween(input.raceDate, today)

  if (sinceRace < 0) {
    flags.push({
      level: 'info',
      message: 'That race date is in the future — a prediction needs a result you have already run.',
    })
  } else if (sinceRace > STALE_RACE_DAYS) {
    flags.push({
      level: 'info',
      message: `That result is ${Math.round(sinceRace / 7)} weeks old. Treat the prediction as an upper bound: fitness decays when training drops, and the models assume you are as fit today as you were then.`,
    })
  }

  const ratio = goalMeters / raceMeters
  if (ratio > EXTRAPOLATION_RATIO || ratio < 1 / EXTRAPOLATION_RATIO) {
    flags.push({
      level: 'info',
      message: `${formatDistance(goalMeters, input.unit)} is more than ${EXTRAPOLATION_RATIO}× away from ${formatDistance(raceMeters, input.unit)}. Predictions degrade that far out — Riegel flatters a long race predicted from a short one, because it ignores the fuelling and durability that decide it.`,
    })
  }

  if (vdot < PLAUSIBLE_VDOT_MIN || vdot > PLAUSIBLE_VDOT_MAX) {
    flags.push({
      level: 'warn',
      message: `A VDOT of ${vdot.toFixed(1)} is outside the plausible ${PLAUSIBLE_VDOT_MIN}–${PLAUSIBLE_VDOT_MAX} band — check the distance and the time you entered.`,
    })
  }

  if (Math.min(raceMeters, goalMeters) < SHORT_RACE_METERS) {
    flags.push({
      level: 'info',
      message: `Under ${formatDistance(SHORT_RACE_METERS, input.unit)} the Riegel exponent is a poor fit — it was derived from longer races, where fatigue rather than raw speed sets the time.`,
    })
  }

  if (Math.max(raceMeters, goalMeters) > ULTRA_METERS) {
    flags.push({
      level: 'info',
      message: `Beyond ${formatDistance(ULTRA_METERS, input.unit)} aerobic fitness stops being the limiter: fuelling, terrain and time on feet decide the result, and neither model knows about them.`,
    })
  }

  if (deltaPct > MODEL_SPREAD_PCT) {
    flags.push({
      level: 'info',
      message: `The two models disagree by ${deltaPct.toFixed(1)}% at that distance. Read the prediction as a range between them rather than a target time.`,
    })
  }

  if (input.goalPaceSecPerKm !== null) {
    if (goalMeters > raceMeters && goalPaceSecPerKm < racePaceSecPerKm) {
      flags.push({
        level: 'warn',
        message: `The goal pace (${formatPace(goalPaceSecPerKm, input.unit)}) is faster than your ${formatDistance(raceMeters, input.unit)} pace (${formatPace(racePaceSecPerKm, input.unit)}) over a longer race — that is a time to re-check, not a target.`,
      })
    }
    const divergencePct = (Math.abs(goalPaceSecPerKm - predictedGoalPaceSecPerKm) / predictedGoalPaceSecPerKm) * 100
    if (divergencePct > PLAN_PACE_DIVERGENCE_PCT) {
      const slower = goalPaceSecPerKm > predictedGoalPaceSecPerKm
      flags.push({
        level: 'info',
        message: `Your goal pace is ${Math.round(divergencePct)}% ${slower ? 'slower' : 'faster'} than the models predict for ${formatDistance(goalMeters, input.unit)} (${formatPace(predictedGoalPaceSecPerKm, input.unit)}). The training paces above still come from your race fitness, not from this pace.`,
      })
    }
  }

  return flags
}

/**
 * The full prediction: equivalents, training paces and the goal split plan.
 * The plan follows the models' predicted pace unless `goalPaceSecPerKm` is set,
 * in which case the goal time and the splits follow the runner's own pace.
 * Normalizes its argument first, so a half-typed field can never propagate into
 * the maths, and takes today's date as an optional argument so the flags stay
 * deterministic when called from a script.
 */
export function predictRace(input: RaceInput, today: string = todayISO()): RaceResult {
  const i = normalizeRaceInput(input, today)
  const raceMeters = DISTANCES[i.distance].meters ?? i.customMeters
  const raceSeconds = parseDuration(i.time) ?? LIMITS.raceSeconds.fallback
  const goalMeters = DISTANCES[i.goalDistance].meters ?? i.goalCustomMeters
  const vdot = vdotOf(raceMeters, raceSeconds)

  const riegel = prediction(raceSeconds * (goalMeters / raceMeters) ** RIEGEL_EXPONENT, goalMeters)
  const daniels = prediction(secondsForDistance(goalMeters, vdot), goalMeters)
  const deltaPct =
    Math.round((Math.abs(daniels.seconds - riegel.seconds) / riegel.seconds) * 1000) / 10

  // The plan is run at the pace the runner set, or at the models' prediction
  // when they have not set one. The training paces above stay tied to the race
  // result either way: they describe fitness, not intent.
  const customPaceSecPerKm = i.goalPaceSecPerKm
  const goalPaceSecPerKm = customPaceSecPerKm ?? daniels.paceSecPerKm
  const goalSeconds = (goalPaceSecPerKm * goalMeters) / 1000

  return {
    raceMeters,
    raceSeconds,
    racePaceSecPerKm: (raceSeconds / raceMeters) * 1000,
    vdot,
    goalMeters,
    riegel,
    daniels,
    goalPaceSecPerKm,
    goalSeconds,
    goalPaceIsCustom: customPaceSecPerKm !== null,
    equivalents: buildEquivalents(raceMeters, raceSeconds, vdot),
    trainingPaces: buildTrainingPaces(vdot),
    splits: buildSplits(goalMeters, goalSeconds, i.unit, i.split),
    flags: buildFlags({
      input: i,
      raceMeters,
      goalMeters,
      racePaceSecPerKm: (raceSeconds / raceMeters) * 1000,
      vdot,
      deltaPct,
      goalPaceSecPerKm,
      predictedGoalPaceSecPerKm: daniels.paceSecPerKm,
      today,
    }),
  }
}
