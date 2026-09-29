/**
 * Race fuel planner engine.
 *
 * Pure arithmetic over body mass and the calendar: given the race, the runner's
 * weight and a loading approach, it returns a carbohydrate target for each of
 * the last three days, an example day of eating that hits each target, the
 * race-morning timeline (breakfast, fluid, caffeine, a last top-up) and advice
 * flags.
 *
 * Model and sources. Every target is grams of carbohydrate per kilogram of body
 * mass, the unit the literature uses:
 * - Carbohydrate loading: 10–12 g/kg per 24 h for the 36–48 h before events
 *   longer than 90 min; 7–12 g/kg per 24 h ("general fuelling up") before
 *   shorter ones; 5–7 g/kg on moderate training days. Thomas DT, Erdman KA,
 *   Burke LM, "Nutrition and Athletic Performance", joint position statement of
 *   the ACSM, Academy of Nutrition and Dietetics and Dietitians of Canada, Med
 *   Sci Sports Exerc 2016;48(3):543-68, after Burke LM et al., "Carbohydrates
 *   for training and competition", J Sports Sci 2011;29(S1):S17-27. The loading
 *   targets here sit at the bottom of the 10–12 band: hitting even 10 g/kg is
 *   hard in practice (below).
 * - Why a load helps: raised starting glycogen postpones fatigue by about 20%
 *   and improves performance by 2–3% in events longer than 90 min, with no
 *   benefit for moderate-intensity running of 60–90 min. Hawley JA et al.,
 *   "Carbohydrate-loading and exercise performance: an update", Sports Med
 *   1997;24(2):73-81. That is where the 90-minute line below comes from.
 * - The one-day load: 10 g/kg/day of high-glycaemic carbohydrate with physical
 *   inactivity raised muscle glycogen from 95 to 180 mmol/kg wet mass in 24 h,
 *   and two more days added nothing. Bussau VA et al., Eur J Appl Physiol
 *   2002;87(3):290-5.
 * - The three-day load: Sherman's "modified" regimen — three days of a mixed
 *   diet, then three days at 70% of energy from carbohydrate while tapering —
 *   reached the same glycogen (203 vs 207 mmol/kg) as the classic
 *   deplete-then-load week of Bergström 1967, without the depletion. Sherman WM
 *   et al., Int J Sports Med 1981;2(2):114-8. The 8 g/kg a day here is that
 *   diet for a typical runner, and the gentler three-day load the running
 *   community tends to recommend.
 * - What runners actually do: in 257 London Marathon finishers, carbohydrate
 *   eaten the day before independently predicted running speed, and those who
 *   ate more than 7 g/kg ran faster. Atkinson G et al., Int J Sports Med
 *   2011;32(8):611-7. Yet surveys of endurance athletes put the day-before
 *   average at roughly 5.6–7.2 g/kg with only about one in ten reaching
 *   10–12 g/kg (as summarised by Lanpir et al., Eur J Sport Sci 2025), and only
 *   28% could name the loading guideline (Sampson G, Morton JP, Areta JL,
 *   J Nutr Sci 2023).
 * - Race morning: 1–4 g/kg of carbohydrate eaten 1–4 h before the start
 *   (Thomas 2016; Burke 2011), here 1, 2, 2.5 or 3 g/kg at 1, 2, 3 or 4 h. A meal of
 *   about 2.5 g/kg 3 h before lengthened treadmill running to exhaustion from
 *   103 to 112 min (Chryssanthopoulos C et al., Int J Sport Nutr Exerc Metab
 *   2002;12(2):157-71). Carbohydrate in the last hour rarely harms performance;
 *   the "rebound hypoglycaemia" warning is mostly unfounded (Jeukendrup AE,
 *   Killer SC, Ann Nutr Metab 2010;57(S2):18-25), hence the optional top-up.
 * - Fluid: drink about 5–7 ml/kg slowly at least 4 h before, and 3–5 ml/kg
 *   more about 2 h before if no urine is produced or it is dark. Sawka MN et
 *   al., ACSM position stand "Exercise and fluid replacement", Med Sci Sports
 *   Exerc 2007;39(2):377-90.
 * - Caffeine: 3–6 mg/kg, most commonly 60 min before, with aerobic endurance
 *   the most consistent beneficiary. Guest NS et al., ISSN position stand, J Int
 *   Soc Sports Nutr 2021;18(1):1. The dose here is the low end, 3 mg/kg; EFSA
 *   (EFSA J 2015;13(5):4102) finds single doses up to 200 mg raise no safety
 *   concerns in healthy adults, so a larger dose is flagged.
 * - Fibre: under 10 g of fibre a day for 4 days cut body mass by about 0.7%
 *   (Foo WL et al., Int J Sport Nutr Exerc Metab 2022), and a
 *   6-day low-FODMAP diet lowered daily gut symptoms in 9 of 11 runners with
 *   exercise-related gut trouble (Lis DM et al., Med Sci Sports Exerc
 *   2018;50(1):116-23). How many days to go low-fibre is convention: two for a
 *   load, three for a sensitive stomach.
 * - Body mass: each gram of glycogen is stored with about 3–4 g of water; a
 *   full load added about 2.2 L of body water in Olsson KE, Saltin B, Acta
 *   Physiol Scand 1970;80(1):11-8 — hence the heads-up about the scale.
 *
 * Layout, not literature: the six eating occasions and their shares, and the
 * example foods. Carbohydrate per portion is rounded from USDA FoodData Central
 * values for plain versions of each food; packaged foods vary, so the menu is
 * an example of how the target adds up, not a prescription.
 *
 * Stateless by design: pure functions, constants and types. Food names,
 * labels and flag wording come from the message catalog
 * (messages/{locale}.json) in the current language; no number depends on it.
 */

import type { Flag } from './flags'
import type { Message } from './i18n.svelte'
import { formatClock } from './format'
import { m } from '../paraglide/messages.js'

const KG_PER_LB = 0.45359237
const MINUTES_PER_DAY = 1440

/** Hawley 1997: glycogen loading pays off above 90 min, not at 60–90 min. */
const LOADING_MIN_MINUTES = 90
/**
 * Race-morning breakfast, g/kg by hours before the start: inside the 1–4 g/kg in
 * 1–4 h guideline, growing with the time there is to digest it — 2.5 g/kg at 3 h
 * is the meal Chryssanthopoulos 2002 tested — and capped at 3 g/kg, because a
 * 4 g/kg breakfast is more than most runners can finish before dawn.
 */
const BREAKFAST_G_PER_KG: Record<BreakfastHours, number> = { 1: 1, 2: 2, 3: 2.5, 4: 3 }
/** Prehydration, ACSM 2007: 5–7 ml/kg ≥ 4 h out, 3–5 ml/kg more 2 h out if needed. */
const FLUID_ML_PER_KG: [number, number] = [5, 7]
const FLUID_TOP_UP_ML_PER_KG: [number, number] = [3, 5]
/** Caffeine: the low end of the ISSN 3–6 mg/kg range, 60 min out. */
const CAFFEINE_MG_PER_KG = 3
const CAFFEINE_OFFSET_MIN = -60
/** EFSA 2015: single doses up to 200 mg raise no safety concerns in healthy adults. */
const CAFFEINE_SINGLE_DOSE_MG = 200
/** A mug of filter coffee, for scale only: real coffee varies several-fold. */
const CAFFEINE_MG_PER_MUG = 100
/** The optional last top-up: about one gel's worth, in the last 15 minutes. */
const TOP_UP_G = 25
const TOP_UP_OFFSET_MIN = -15
/** A day this big is a lot of food; the flag suggests drinking some of it. */
const BIG_DAY_G = 600
/** An alarm earlier than this for breakfast earns a gentler alternative. */
const EARLY_BREAKFAST_MINUTES = 5 * 60
/** Round daily targets to this many grams. */
const DAY_ROUND_G = 5

export type RaceId = '5k' | '10k' | '10mi' | 'hm' | 'marathon' | 'ultra'
export type ApproachId = 'twoDay' | 'oneDay' | 'threeDay' | 'topUp'
export type FoodStyle = 'wheat' | 'glutenFree'
export type Stomach = 'normal' | 'sensitive'
export type WeightUnit = 'kg' | 'lb'
export type BreakfastHours = 1 | 2 | 3 | 4
export type DayKind = 'normal' | 'load' | 'topUp'
export type SlotId = 'breakfast' | 'snackAm' | 'lunch' | 'snackPm' | 'dinner' | 'evening'
export type Verdict = 'supported' | 'mixed' | 'against'
export type FoodId =
  | 'bagel'
  | 'whiteBread'
  | 'jam'
  | 'pasta'
  | 'rice'
  | 'riceNoodles'
  | 'potatoes'
  | 'ricePorridge'
  | 'riceCakes'
  | 'pretzels'
  | 'banana'
  | 'orangeJuice'
  | 'sportsDrink'
  | 'gummies'

export interface FuelInput {
  raceDate: string // YYYY-MM-DD, local calendar date
  startTime: string // HH:MM, 24 h
  distance: RaceId
  finishTime: string // h:mm, the time the runner expects to be out there
  weight: number // in `unit`
  unit: WeightUnit
  approach: ApproachId
  foodStyle: FoodStyle
  stomach: Stomach
  breakfastHours: BreakfastHours
  caffeine: boolean
}

export interface Approach {
  label: Message
  tagline: Message
  /** Carbohydrate targets, g/kg, for three days, two days and one day out. */
  gPerKg: [number, number, number]
}

export interface Food {
  name: Message
  unit: 'count' | 'g' | 'ml'
  /** Grams of carbohydrate per unit (per item, per gram, per millilitre). */
  carbsPerUnit: number
  /** Smallest amount the menu moves in: half a bagel, 25 g of dry pasta. */
  step: number
}

export interface MenuItem {
  food: FoodId
  amount: number // in the food's unit
  carbsG: number
}

export interface Meal {
  slot: SlotId
  targetG: number
  carbsG: number
  items: MenuItem[]
}

export interface FuelDay {
  daysToRace: number // 3, 2 or 1
  date: string
  kind: DayKind
  gPerKg: number
  carbsG: number
  lowFibre: boolean
  lowFodmap: boolean
  meals: Meal[]
  menuCarbsG: number
}

export type TimelineKind = 'breakfast' | 'fluid' | 'caffeine' | 'topUp' | 'start'

export interface TimelineEvent {
  kind: TimelineKind
  offsetMin: number // minutes relative to the start, negative before it
  clockMin: number // minutes after midnight
}

export interface RaceMorning {
  hours: BreakfastHours
  gPerKg: number
  breakfastG: number
  breakfast: Meal
  fluidMl: [number, number]
  fluidTopUpMl: [number, number]
  caffeineMg: number | null
  caffeineMugs: number | null
  topUpG: number
  timeline: TimelineEvent[]
}

export interface FuelPlan {
  weightKg: number
  finishMinutes: number
  recommended: ApproachId
  planStartDate: string
  peakG: number
  peakGPerKg: number
  peakDate: string
  days: FuelDay[]
  morning: RaceMorning
  flags: Flag[]
}

export interface PopularApproach {
  id: string
  name: Message
  verdict: Verdict
  /** May contain <em> for journal names: rendered as trusted HTML. */
  text: Message
}

export const RACES: Record<RaceId, { label: Message; finishTime: string }> = {
  '5k': { label: m.distance_5k, finishTime: '0:30' },
  '10k': { label: m.distance_10k, finishTime: '1:00' },
  '10mi': { label: m.distance_10mi, finishTime: '1:35' },
  hm: { label: m.distance_hm, finishTime: '2:00' },
  marathon: { label: m.distance_marathon, finishTime: '4:15' },
  ultra: { label: m.fuel_distance_ultra, finishTime: '6:30' },
}

export const APPROACHES: Record<ApproachId, Approach> = {
  twoDay: {
    label: m.fuel_approach_two_day_label,
    tagline: m.fuel_approach_two_day_tagline,
    gPerKg: [6, 10, 10],
  },
  oneDay: {
    label: m.fuel_approach_one_day_label,
    tagline: m.fuel_approach_one_day_tagline,
    gPerKg: [6, 6, 10],
  },
  threeDay: {
    label: m.fuel_approach_three_day_label,
    tagline: m.fuel_approach_three_day_tagline,
    gPerKg: [8, 8, 8],
  },
  topUp: {
    label: m.fuel_approach_top_up_label,
    tagline: m.fuel_approach_top_up_tagline,
    gPerKg: [6, 6, 7],
  },
}

export const DAY_KIND_LABELS: Record<DayKind, Message> = {
  normal: m.fuel_day_normal,
  load: m.fuel_day_load,
  topUp: m.fuel_day_top_up,
}

export const SLOT_LABELS: Record<SlotId, Message> = {
  breakfast: m.fuel_slot_breakfast,
  snackAm: m.fuel_slot_snack_am,
  lunch: m.fuel_slot_lunch,
  snackPm: m.fuel_slot_snack_pm,
  dinner: m.fuel_slot_dinner,
  evening: m.fuel_slot_evening,
}

export const FOODS: Record<FoodId, Food> = {
  bagel: { name: m.fuel_food_bagel, unit: 'count', carbsPerUnit: 50, step: 0.5 },
  whiteBread: { name: m.fuel_food_white_bread, unit: 'count', carbsPerUnit: 15, step: 1 },
  jam: { name: m.fuel_food_jam, unit: 'count', carbsPerUnit: 13, step: 1 },
  pasta: { name: m.fuel_food_pasta, unit: 'g', carbsPerUnit: 0.72, step: 25 },
  rice: { name: m.fuel_food_rice, unit: 'g', carbsPerUnit: 0.78, step: 25 },
  riceNoodles: { name: m.fuel_food_rice_noodles, unit: 'g', carbsPerUnit: 0.8, step: 25 },
  potatoes: { name: m.fuel_food_potatoes, unit: 'g', carbsPerUnit: 0.17, step: 50 },
  ricePorridge: { name: m.fuel_food_rice_porridge, unit: 'g', carbsPerUnit: 0.78, step: 25 },
  riceCakes: { name: m.fuel_food_rice_cakes, unit: 'count', carbsPerUnit: 8, step: 1 },
  pretzels: { name: m.fuel_food_pretzels, unit: 'g', carbsPerUnit: 0.8, step: 25 },
  banana: { name: m.fuel_food_banana, unit: 'count', carbsPerUnit: 27, step: 0.5 },
  orangeJuice: { name: m.fuel_food_orange_juice, unit: 'ml', carbsPerUnit: 0.104, step: 125 },
  sportsDrink: { name: m.fuel_food_sports_drink, unit: 'ml', carbsPerUnit: 0.06, step: 250 },
  gummies: { name: m.fuel_food_gummies, unit: 'g', carbsPerUnit: 0.78, step: 25 },
}

/** Share of the day's carbohydrate per eating occasion; lunch is the big meal. */
const SLOT_SHARES: [SlotId, number][] = [
  ['breakfast', 0.22],
  ['snackAm', 0.12],
  ['lunch', 0.24],
  ['snackPm', 0.12],
  ['dinner', 0.2],
  ['evening', 0.1],
]

type Template = [FoodId, number][]

/**
 * Starting portions per eating occasion. Everything is white, low-fibre and
 * low-fat, which is what makes 10 g/kg fit into a stomach.
 */
const TEMPLATES: Record<FoodStyle, Record<SlotId, Template>> = {
  wheat: {
    breakfast: [['bagel', 1], ['jam', 2], ['orangeJuice', 250]],
    snackAm: [['banana', 1], ['sportsDrink', 500]],
    lunch: [['rice', 100], ['whiteBread', 1]],
    snackPm: [['pretzels', 50], ['orangeJuice', 250]],
    dinner: [['pasta', 100], ['whiteBread', 1]],
    evening: [['whiteBread', 2], ['jam', 2]],
  },
  glutenFree: {
    breakfast: [['ricePorridge', 50], ['jam', 2], ['orangeJuice', 250]],
    snackAm: [['banana', 1], ['sportsDrink', 500]],
    lunch: [['rice', 100], ['riceCakes', 2]],
    snackPm: [['riceCakes', 3], ['jam', 2], ['orangeJuice', 250]],
    dinner: [['potatoes', 300], ['riceNoodles', 50]],
    evening: [['gummies', 50], ['banana', 1]],
  },
}

const RACE_BREAKFAST: Record<FoodStyle, Template> = {
  wheat: [['bagel', 1], ['jam', 2], ['banana', 1]],
  glutenFree: [['ricePorridge', 50], ['jam', 2], ['banana', 1]],
}

/** An hour out there is no time for a meal: a banana and a bite of something white. */
const LIGHT_BREAKFAST: Record<FoodStyle, Template> = {
  wheat: [['banana', 1], ['whiteBread', 1], ['jam', 1]],
  glutenFree: [['banana', 1], ['riceCakes', 2], ['jam', 1]],
}

export const POPULAR: PopularApproach[] = [
  { id: 'pastaParty', name: m.fuel_pop_pasta_party_name, verdict: 'mixed', text: m.fuel_pop_pasta_party_text },
  { id: 'depletion', name: m.fuel_pop_depletion_name, verdict: 'against', text: m.fuel_pop_depletion_text },
  { id: 'lowCarb', name: m.fuel_pop_low_carb_name, verdict: 'against', text: m.fuel_pop_low_carb_text },
  { id: 'lowFibre', name: m.fuel_pop_low_fibre_name, verdict: 'supported', text: m.fuel_pop_low_fibre_text },
  { id: 'lowFodmap', name: m.fuel_pop_low_fodmap_name, verdict: 'mixed', text: m.fuel_pop_low_fodmap_text },
  { id: 'caffeine', name: m.fuel_pop_caffeine_name, verdict: 'supported', text: m.fuel_pop_caffeine_text },
  { id: 'beetroot', name: m.fuel_pop_beetroot_name, verdict: 'mixed', text: m.fuel_pop_beetroot_text },
  { id: 'fasted', name: m.fuel_pop_fasted_name, verdict: 'against', text: m.fuel_pop_fasted_text },
  { id: 'overdrinking', name: m.fuel_pop_overdrinking_name, verdict: 'against', text: m.fuel_pop_overdrinking_text },
  { id: 'nothingNew', name: m.fuel_pop_nothing_new_name, verdict: 'supported', text: m.fuel_pop_nothing_new_text },
]

export const VERDICT_LABELS: Record<Verdict, Message> = {
  supported: m.fuel_verdict_supported,
  mixed: m.fuel_verdict_mixed,
  against: m.fuel_verdict_against,
}

export const BREAKFAST_HOURS: BreakfastHours[] = [1, 2, 3, 4]

export const LIMITS = {
  weightKg: { min: 30, max: 200, step: 0.5, fallback: 70 },
  weightLb: { min: 66, max: 440, step: 1, fallback: 155 },
  finishMinutes: { min: 10, max: 48 * 60 },
} as const

// ---------- Dates and times ----------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/

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

/** The next Sunday at least `days` out — the default race date. */
function nextSundayAtLeast(fromISO: string, days: number): string {
  const date = parseDate(addDays(fromISO, days))
  const weekday = date ? date.getDay() : 0
  return addDays(fromISO, days + ((7 - weekday) % 7))
}

/** "09:00" → 540, or null. */
export function parseClock(value: string): number | null {
  const match = CLOCK.exec(value)
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

/**
 * Expected finish time: "4:15" (h:mm), "0:45" or plain minutes ("45"). Returns
 * minutes, or null when the text is not a time or is out of range.
 */
export function parseFinishTime(value: string): number | null {
  const text = value.trim()
  const hm = /^(\d{1,2}):([0-5]\d)$/.exec(text)
  const minutes = hm ? Number(hm[1]) * 60 + Number(hm[2]) : /^\d{1,4}$/.test(text) ? Number(text) : NaN
  return Number.isFinite(minutes) &&
    minutes >= LIMITS.finishMinutes.min &&
    minutes <= LIMITS.finishMinutes.max
    ? minutes
    : null
}

/** 255 → "4:15". */
export function formatFinishTime(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
}

// ---------- Input ----------

function isRaceId(value: unknown): value is RaceId {
  return typeof value === 'string' && value in RACES
}

function isApproachId(value: unknown): value is ApproachId {
  return typeof value === 'string' && value in APPROACHES
}

function isFoodStyle(value: unknown): value is FoodStyle {
  return value === 'wheat' || value === 'glutenFree'
}

function isStomach(value: unknown): value is Stomach {
  return value === 'normal' || value === 'sensitive'
}

function isWeightUnit(value: unknown): value is WeightUnit {
  return value === 'kg' || value === 'lb'
}

function isBreakfastHours(value: unknown): value is BreakfastHours {
  return value === 1 || value === 2 || value === 3 || value === 4
}

/**
 * Clamp a numeric field. An absent value — `undefined` from an emptied form
 * field, `null`, `''` — is *missing*, not zero, so it falls back to the default
 * rather than collapsing to the minimum.
 */
function clampNumber(value: unknown, bounds: { min: number; max: number; fallback: number }): number {
  if (value === undefined || value === null || value === '') return bounds.fallback
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(bounds.max, Math.max(bounds.min, n)) : bounds.fallback
}

/** The approach the literature points to for this much time on your feet. */
export function recommendedApproach(finishMinutes: number): ApproachId {
  return finishMinutes >= LOADING_MIN_MINUTES ? 'twoDay' : 'topUp'
}

/** Convert a body mass between the two units — a no-op when they already match. */
export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value
  return to === 'kg' ? value * KG_PER_LB : value / KG_PER_LB
}

/**
 * Defaults used when a field is missing: a marathon on the next Sunday at least
 * a week out, a 70 kg runner, the two-day load. Depends on today's date, which
 * is why it is a function rather than a constant.
 */
export function defaultFuelInput(today: string = todayISO()): FuelInput {
  return {
    raceDate: nextSundayAtLeast(today, 7),
    startTime: '09:00',
    distance: 'marathon',
    finishTime: RACES.marathon.finishTime,
    weight: LIMITS.weightKg.fallback,
    unit: 'kg',
    approach: 'twoDay',
    foodStyle: 'wheat',
    stomach: 'normal',
    breakfastHours: 3,
    caffeine: false,
  }
}

/**
 * Validate anything that claims to be a FuelInput (stored preferences, a form
 * bound to a half-empty field) into a fresh, fully populated FuelInput. An
 * unrecognised or missing field falls back to `defaultFuelInput`. Never throws.
 */
export function normalizeFuelInput(raw: unknown, today: string = todayISO()): FuelInput {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const fallback = defaultFuelInput(today)
  const distance = isRaceId(r.distance) ? r.distance : fallback.distance
  const unit = isWeightUnit(r.unit) ? r.unit : fallback.unit
  const finish = typeof r.finishTime === 'string' ? parseFinishTime(r.finishTime) : null
  return {
    raceDate:
      typeof r.raceDate === 'string' && parseDate(r.raceDate) ? r.raceDate : fallback.raceDate,
    startTime:
      typeof r.startTime === 'string' && parseClock(r.startTime) !== null
        ? r.startTime
        : fallback.startTime,
    distance,
    finishTime: finish === null ? RACES[distance].finishTime : formatFinishTime(finish),
    weight: clampNumber(r.weight, unit === 'kg' ? LIMITS.weightKg : LIMITS.weightLb),
    unit,
    approach: isApproachId(r.approach) ? r.approach : fallback.approach,
    foodStyle: isFoodStyle(r.foodStyle) ? r.foodStyle : fallback.foodStyle,
    stomach: isStomach(r.stomach) ? r.stomach : fallback.stomach,
    breakfastHours: isBreakfastHours(r.breakfastHours) ? r.breakfastHours : fallback.breakfastHours,
    caffeine: typeof r.caffeine === 'boolean' ? r.caffeine : fallback.caffeine,
  }
}

/**
 * True only when every field is present and usable. An emptied number field
 * binds as `undefined` and a half-typed time does not parse, which makes this
 * false — the UI uses it to skip persisting mid-edit.
 */
export function isCompleteFuelInput(raw: unknown): boolean {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  return (
    typeof r.raceDate === 'string' &&
    parseDate(r.raceDate) !== null &&
    typeof r.startTime === 'string' &&
    parseClock(r.startTime) !== null &&
    isRaceId(r.distance) &&
    typeof r.finishTime === 'string' &&
    parseFinishTime(r.finishTime) !== null &&
    typeof r.weight === 'number' &&
    Number.isFinite(r.weight) &&
    isWeightUnit(r.unit) &&
    isApproachId(r.approach) &&
    isFoodStyle(r.foodStyle) &&
    isStomach(r.stomach) &&
    isBreakfastHours(r.breakfastHours) &&
    typeof r.caffeine === 'boolean'
  )
}

// ---------- Menus ----------

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

function carbsOf(food: FoodId, amount: number): number {
  return FOODS[food].carbsPerUnit * amount
}

/**
 * Scale a template to a carbohydrate target: every portion grows by the same
 * factor and snaps to its food's step (never below one step), then single steps
 * up or down — whichever food's step closes the gap most — until no step brings
 * the meal closer to the target.
 */
export function buildMeal(slot: SlotId, targetG: number, template: Template): Meal {
  const baseG = template.reduce((sum, [food, amount]) => sum + carbsOf(food, amount), 0)
  const factor = baseG > 0 ? targetG / baseG : 0
  const amounts = template.map(([food, amount]) => {
    const step = FOODS[food].step
    return Math.max(step, roundTo(amount * factor, step))
  })

  const totalOf = () => amounts.reduce((sum, amount, k) => sum + carbsOf(template[k][0], amount), 0)
  // Each pass takes the one step that most reduces the gap; a step only counts
  // if it strictly improves, so the loop ends (at most a few passes per meal).
  for (let pass = 0; pass < 20; pass++) {
    const gap = Math.abs(targetG - totalOf())
    let best: { k: number; delta: number; gap: number } | null = null
    template.forEach(([food], k) => {
      const step = FOODS[food].step
      for (const delta of [step, -step]) {
        if (amounts[k] + delta < step) continue
        const next = Math.abs(targetG - totalOf() - carbsOf(food, delta))
        if (next < gap - 0.5 && (best === null || next < best.gap)) best = { k, delta, gap: next }
      }
    })
    if (best === null) break
    const { k, delta } = best
    amounts[k] += delta
  }

  const items = template.map(([food], k) => ({
    food,
    amount: amounts[k],
    carbsG: Math.round(carbsOf(food, amounts[k])),
  }))
  return {
    slot,
    targetG: Math.round(targetG),
    carbsG: items.reduce((sum, item) => sum + item.carbsG, 0),
    items,
  }
}

function buildDayMenu(carbsG: number, style: FoodStyle): Meal[] {
  return SLOT_SHARES.map(([slot, share]) => buildMeal(slot, carbsG * share, TEMPLATES[style][slot]))
}

// ---------- The plan ----------

function kindOf(approach: ApproachId, gPerKg: number): DayKind {
  if (gPerKg >= 8) return 'load'
  return approach === 'topUp' && gPerKg > 6 ? 'topUp' : 'normal'
}

/** How many days before the race the low-fibre days start (convention, see header). */
function lowFibreDays(approach: ApproachId, stomach: Stomach): number {
  if (stomach === 'sensitive') return 3
  return approach === 'topUp' ? 1 : 2
}

function wrapClock(minutes: number): number {
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
}

function roundMl(ml: number): number {
  return Math.round(ml / 10) * 10
}

/**
 * The fuel plan. Normalizes its argument first, so a half-typed field can never
 * propagate into the maths, and takes today's date as an optional argument so
 * the flags stay deterministic when called from a script.
 */
export function planFuel(input: FuelInput, today: string = todayISO()): FuelPlan {
  const i = normalizeFuelInput(input, today)
  const weightKg = i.unit === 'kg' ? i.weight : i.weight * KG_PER_LB
  const finishMinutes = parseFinishTime(i.finishTime) ?? LIMITS.finishMinutes.min
  const approach = APPROACHES[i.approach]
  const fibreDays = lowFibreDays(i.approach, i.stomach)

  const days: FuelDay[] = approach.gPerKg.map((gPerKg, k) => {
    const daysToRace = 3 - k
    const carbsG = roundTo(gPerKg * weightKg, DAY_ROUND_G)
    const meals = buildDayMenu(carbsG, i.foodStyle)
    const lowFibre = daysToRace <= fibreDays
    return {
      daysToRace,
      date: addDays(i.raceDate, -daysToRace),
      kind: kindOf(i.approach, gPerKg),
      gPerKg,
      carbsG,
      lowFibre,
      lowFodmap: lowFibre && i.stomach === 'sensitive',
      meals,
      menuCarbsG: meals.reduce((sum, meal) => sum + meal.carbsG, 0),
    }
  })

  const peak = days.reduce((best, day) => (day.carbsG > best.carbsG ? day : best), days[0])

  // Race morning, counted back from the start.
  const startMin = parseClock(i.startTime) ?? 9 * 60
  const hours = i.breakfastHours
  const breakfastGPerKg = BREAKFAST_G_PER_KG[hours]
  const breakfastG = roundTo(breakfastGPerKg * weightKg, DAY_ROUND_G)
  const breakfast = buildMeal(
    'breakfast',
    breakfastG,
    (hours <= 1 ? LIGHT_BREAKFAST : RACE_BREAKFAST)[i.foodStyle],
  )
  const caffeineMg = i.caffeine ? roundTo(CAFFEINE_MG_PER_KG * weightKg, 10) : null

  const events: [TimelineKind, number][] = [['breakfast', -60 * hours]]
  if (hours > 2) events.push(['fluid', -120])
  if (caffeineMg !== null) events.push(['caffeine', CAFFEINE_OFFSET_MIN])
  events.push(['topUp', TOP_UP_OFFSET_MIN], ['start', 0])
  const timeline = events
    .sort((a, b) => a[1] - b[1])
    .map(([kind, offsetMin]) => ({ kind, offsetMin, clockMin: wrapClock(startMin + offsetMin) }))

  const morning: RaceMorning = {
    hours,
    gPerKg: breakfastGPerKg,
    breakfastG,
    breakfast,
    fluidMl: [roundMl(FLUID_ML_PER_KG[0] * weightKg), roundMl(FLUID_ML_PER_KG[1] * weightKg)],
    fluidTopUpMl: [
      roundMl(FLUID_TOP_UP_ML_PER_KG[0] * weightKg),
      roundMl(FLUID_TOP_UP_ML_PER_KG[1] * weightKg),
    ],
    caffeineMg,
    caffeineMugs: caffeineMg === null ? null : Math.max(0.5, roundTo(caffeineMg / CAFFEINE_MG_PER_MUG, 0.5)),
    topUpG: TOP_UP_G,
    timeline,
  }

  const planStartDate = days[0].date
  const recommended = recommendedApproach(finishMinutes)
  const loads = days.some((day) => day.kind === 'load')

  const flags: Flag[] = []
  if (i.raceDate < today) {
    flags.push({ level: 'warn', message: m.fuel_flag_past() })
  } else if (planStartDate <= today) {
    flags.push({ level: 'info', message: m.fuel_flag_under_way() })
  }
  if (i.approach === 'topUp' && finishMinutes >= LOADING_MIN_MINUTES) {
    flags.push({
      level: 'warn',
      message: m.fuel_flag_top_up_long({ time: formatFinishTime(finishMinutes) }),
    })
  } else if (loads && finishMinutes < LOADING_MIN_MINUTES) {
    flags.push({
      level: 'info',
      message: m.fuel_flag_load_short({ time: formatFinishTime(finishMinutes) }),
    })
  }
  if (i.approach === 'oneDay') {
    flags.push({ level: 'info', message: m.fuel_flag_one_day() })
  }
  if (peak.carbsG >= BIG_DAY_G) {
    flags.push({ level: 'info', message: m.fuel_flag_big_day({ grams: peak.carbsG }) })
  }
  if (loads) {
    flags.push({
      level: 'info',
      message: m.fuel_flag_scale({ range: i.unit === 'kg' ? '1–2 kg' : '2–4 lb' }),
    })
  }
  if (i.stomach === 'sensitive' && hours <= 2) {
    flags.push({ level: 'info', message: m.fuel_flag_sensitive_breakfast() })
  }
  const breakfastClock = wrapClock(startMin - 60 * hours)
  if (hours >= 3 && breakfastClock < EARLY_BREAKFAST_MINUTES) {
    flags.push({
      level: 'info',
      message: m.fuel_flag_early({ time: formatClock(breakfastClock) }),
    })
  }
  if (caffeineMg !== null && caffeineMg > CAFFEINE_SINGLE_DOSE_MG) {
    flags.push({ level: 'info', message: m.fuel_flag_caffeine_dose({ mg: caffeineMg }) })
  }
  if (i.distance === 'ultra') {
    flags.push({ level: 'info', message: m.fuel_flag_ultra() })
  }

  return {
    weightKg,
    finishMinutes,
    recommended,
    planStartDate,
    peakG: peak.carbsG,
    peakGPerKg: peak.gPerKg,
    peakDate: peak.date,
    days,
    morning,
    flags,
  }
}
