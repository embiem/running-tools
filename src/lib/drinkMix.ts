/**
 * Drink mix calculator engine.
 *
 * Pure arithmetic: given a session preset, how long you run, how much fluid you
 * can carry, your fluid rate and which salts you own, it returns the recipe
 * (grams of each salt and of sugar for the whole batch), what that batch
 * delivers, how far it covers the session plan, and a drinking schedule.
 *
 * Model and sources. Every preset figure is derived from the literature below —
 * no product formulation is used as an anchor:
 * - Sodium: the ACSM position stand on exercise and fluid replacement gives
 *   0.5–0.7 g (500–700 mg) sodium per litre for sessions over an hour. Sweat
 *   sodium averages 42.9 ± 18.7 mmol/L in marathoners (JISSN 2016) and spans
 *   17–92 mmol/L across athletes (JISSN 2017), which is why typical drinks at
 *   10–25 mmol/L leave salty sweaters short; above ~50 mmol/L palatability
 *   falls, and 50 mmol/L (1150 mg/L) is the cap here.
 * - Carbohydrate: 30–60 g/h as a 4–8% solution (ACSM), raised to 30–90 g/h for
 *   sessions beyond ~2.5 h by the 2016 joint position stand (ACSM / Dietitians
 *   of Canada / Academy of Nutrition and Dietetics) with multiple transportable
 *   carbohydrates. The cap is the top of the ACSM band: 80 g/L (8%).
 * - Fluid: 600–1200 ml/h during exercise over an hour (ACSM), with 0.4–0.8 L/h
 *   the range estimated for marathon runners.
 * - Potassium: sweat potassium is 6.0 ± 0.9 mmol/L in marathoners (JISSN 2016),
 *   a K:Na mass ratio of ~0.24 — the preset ratios replace sweat loss rather
 *   than supplementing potassium for its own sake.
 * - Absorption: glucose is limited to ~60 g/h (SGLT1) and fructose to ~30 g/h
 *   (GLUT5); sucrose hydrolyses into equal masses of both, so a sucrose drink
 *   is inherently a multiple-transportable-carbohydrate one.
 * - Salts: table salt is ~393 mg sodium per gram (NaCl, ~99% pure), potassium
 *   chloride ~524 mg potassium per gram. A "reduced sodium" blend that is 33%
 *   KCl therefore provides ~263 mg sodium and ~173 mg potassium per gram.
 * - Osmolality assumes full dissociation and sucrose as the only carbohydrate:
 *   1 g table salt in 500 ml is ~68 mOsm/L, and reduced-osmolality WHO oral
 *   rehydration salts sit at 245 mOsm/L; the 270–330 mOsm/L isotonic band is
 *   the EFSA definition. Sucrose is one osmole per molecule in the bottle.
 *
 * Stateless by design — unlike the metronome engine there is nothing to keep
 * alive between renders, so this module is pure functions, constants and types.
 */

// Nutrient content of the salts (mg of the element per gram of salt)
const MG_SODIUM_PER_G_TABLE_SALT = 393 // NaCl, ~99% pure
const MG_POTASSIUM_PER_G_KCL = 524 // KCl
// Household fallbacks (approximate, for people without a 0.1 g scale)
const TSP_GRAMS_TABLE_SALT = 6.0
const TSP_GRAMS_SUGAR = 4.13
// Molar masses / atomic masses, for the osmolality model
const MOLAR_MASS_SUCROSE = 342.3
const ATOMIC_MASS_NA = 22.99
const ATOMIC_MASS_K = 39.1
// Sucrose hydrolyses to equal masses of glucose and fructose: 180.16/342.3
const SUCROSE_TO_MONOSACCHARIDE = 0.526
const KCAL_PER_G_CARB = 4
// Drinkability caps (the concentration is clamped to these and the shortfall reported)
const MAX_SODIUM_MG_PER_L = 1150 // 50 mmol/L Na, above which palatability falls (JISSN 2017)
const MAX_CARBS_G_PER_L = 80 // 8% solution, top of the ACSM 4–8% band
const MIN_CARBS_G_PER_L_INFO = 20
const MIN_SODIUM_MG_PER_L_INFO = 200
// Absorption / tonicity thresholds
const GLUCOSE_G_PER_H_LIMIT = 60 // SGLT1
const FRUCTOSE_G_PER_H_LIMIT = 30 // GLUT5
const ISOTONIC_LOW_MOSM_PER_L = 270
const ISOTONIC_HIGH_MOSM_PER_L = 330

/** Minutes between sips while running — the schedule quotes this interval. */
export const SIP_INTERVAL_MIN = 15

export type PresetId = 'easy' | 'progression' | 'marathon'
export type SaltSetup = 'table' | 'table-potassium'
export type Tonicity = 'hypotonic' | 'isotonic' | 'hypertonic'

export interface MixInput {
  preset: PresetId
  durationMin: number
  bottleMl: number
  bottles: number
  fluidMlPerHour: number
  saltSetup: SaltSetup
  potassiumPct: number // % KCl in the potassium-rich salt (0–100)
}

export interface MixFlag {
  level: 'warn' | 'info'
  message: string
}

export interface Preset {
  label: string
  tagline: string // one line, shown under the preset buttons
  durationMin: number // default session length for this preset
  fluidMlPerHour: number // default fluid rate for this preset
  carbsGPerH: number
  sodiumMgPerH: number
  potassiumRatio: number // mg K per mg Na in the finished drink
}

export interface MixResult {
  preset: Preset
  hours: number
  carryMl: number
  bottleMl: number // normalized bottle size behind carryMl
  bottles: number // normalized bottle count behind carryMl
  // session needs
  needSodiumMg: number
  needCarbsG: number
  needFluidMl: number
  // concentration actually used (per litre of the carried volume)
  sodiumMgPerL: number
  potassiumMgPerL: number
  carbsGPerL: number
  concentrationCapped: boolean
  // batch ingredients (grams, for the whole carried volume)
  potassiumSaltG: number
  tableSaltG: number
  sugarG: number
  potassiumSaltTsp: number
  tableSaltTsp: number
  sugarTsp: number
  // what the batch delivers
  sodiumMg: number
  potassiumMg: number
  carbsG: number
  kcal: number
  sodiumPotassiumRatio: number | null // null when potassium is 0
  osmolarityMOsmPerL: number
  tonicity: Tonicity
  // coverage of the session plan: whole-number percentages. Sodium and carbs
  // cannot exceed 100 (they are capped above), fluid can — carrying more than
  // the session needs is real information, so it is not clamped.
  sodiumCoveragePct: number
  carbsCoveragePct: number
  fluidCoveragePct: number
  shortfallSodiumMg: number
  shortfallCarbsG: number
  shortfallFluidMl: number
  // schedule
  minutesPerBottle: number
  sipMl: number // ml per SIP_INTERVAL_MIN while running
  stationMlPerHour: number // extra fluid to pick up at drink stations (0 when covered)
  stationSipMl: number // = stationMlPerHour / 4
  // advice
  gelCount: number // Math.ceil(shortfallCarbsG / 25)
  flags: MixFlag[]
}

export const PRESETS: Record<PresetId, Preset> = {
  easy: {
    label: 'Easy run',
    tagline: 'Up to ~60 min, relaxed pace',
    durationMin: 45,
    fluidMlPerHour: 500,
    carbsGPerH: 30,
    sodiumMgPerH: 300, // 600 mg/L (mid ACSM 500–700 mg/L band) × 0.5 L/h
    potassiumRatio: 0.15, // low-intensity sweat K:Na
  },
  progression: {
    label: 'Progression run',
    tagline: '60–100 min, building effort',
    durationMin: 75,
    fluidMlPerHour: 650,
    carbsGPerH: 60,
    sodiumMgPerH: 455, // 700 mg/L (top of the ACSM band) × 0.65 L/h
    potassiumRatio: 0.25, // sweat K:Na ≈ 0.24 by mass in marathoners (JISSN 2016)
  },
  marathon: {
    label: 'Marathon',
    tagline: '2 h+, race effort, maximum intake',
    durationMin: 180,
    fluidMlPerHour: 600,
    carbsGPerH: 80,
    sodiumMgPerH: 690, // 1150 mg/L (50 mmol/L cap, salty-sweater replacement) × 0.6 L/h
    potassiumRatio: 0.25, // sweat K:Na ≈ 0.24 by mass in marathoners (JISSN 2016)
  },
}

export const LIMITS = {
  durationMin: { min: 10, max: 600, step: 5, fallback: 75 },
  bottleMl: { min: 100, max: 2000, step: 50, fallback: 500 },
  bottles: { min: 1, max: 12, step: 1, fallback: 2 },
  fluidMlPerHour: { min: 100, max: 2000, step: 50, fallback: 650 },
  potassiumPct: { min: 0, max: 100, step: 1, fallback: 33 },
} as const

export const DEFAULT_INPUT: MixInput = {
  preset: 'progression',
  durationMin: 75,
  bottleMl: 500,
  bottles: 2,
  fluidMlPerHour: 650,
  saltSetup: 'table-potassium',
  potassiumPct: 33,
}

interface Bounds {
  min: number
  max: number
  fallback: number
}

/**
 * Clamp a numeric field. An absent value — `undefined` from an emptied form
 * field, `null`, `''` — is *missing*, not zero, so it falls back to the default
 * rather than collapsing to the minimum (which is what `Number(null)` would do).
 */
function clampNumber(value: unknown, bounds: Bounds): number {
  if (value === undefined || value === null || value === '') return bounds.fallback
  const n = Number(value)
  return Number.isFinite(n) ? Math.min(bounds.max, Math.max(bounds.min, n)) : bounds.fallback
}

function isPresetId(value: unknown): value is PresetId {
  return value === 'easy' || value === 'progression' || value === 'marathon'
}

function isSaltSetup(value: unknown): value is SaltSetup {
  return value === 'table' || value === 'table-potassium'
}

/**
 * Validate anything that claims to be a MixInput (stored preferences, a form
 * bound to a half-empty number field) into a fresh, fully populated MixInput.
 * An unrecognised or missing field falls back to DEFAULT_INPUT — the choice the
 * radio group cannot produce and the reset button restores. Never throws.
 */
export function normalizeMixInput(raw: unknown): MixInput {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  return {
    preset: isPresetId(r.preset) ? r.preset : DEFAULT_INPUT.preset,
    durationMin: Math.round(clampNumber(r.durationMin, LIMITS.durationMin)),
    bottleMl: Math.round(clampNumber(r.bottleMl, LIMITS.bottleMl)),
    bottles: Math.round(clampNumber(r.bottles, LIMITS.bottles)),
    fluidMlPerHour: Math.round(clampNumber(r.fluidMlPerHour, LIMITS.fluidMlPerHour)),
    saltSetup: isSaltSetup(r.saltSetup) ? r.saltSetup : DEFAULT_INPUT.saltSetup,
    potassiumPct: Math.round(clampNumber(r.potassiumPct, LIMITS.potassiumPct)),
  }
}

/**
 * True only when every field is present and numeric. An emptied number field
 * binds as `undefined`, which makes this false — the UI uses it to skip
 * persisting mid-edit, so the stored preference keeps the last complete value
 * instead of the fallback `normalizeMixInput` would substitute for it.
 */
export function isCompleteMixInput(raw: unknown): boolean {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const numbers = [r.durationMin, r.bottleMl, r.bottles, r.fluidMlPerHour, r.potassiumPct]
  return (
    numbers.every((value) => typeof value === 'number' && Number.isFinite(value)) &&
    isPresetId(r.preset) &&
    isSaltSetup(r.saltSetup)
  )
}

/** mOsm contributed per gram of a salt, given its elemental content (mg per gram). */
function saltOsmolarityPerGram(mgNaPerG: number, mgKPerG: number): number {
  return 2 * (mgNaPerG / ATOMIC_MASS_NA + mgKPerG / ATOMIC_MASS_K)
}

/** Percentage for display, rounded to whole numbers; capped at 100 (sodium and carbs are capped anyway). */
function coveragePct(delivered: number, needed: number): number {
  return Math.min(100, Math.round((delivered / needed) * 100))
}

/**
 * Recipe + analysis for one set of inputs. Normalizes its argument first, so a
 * transient `undefined` from an emptied form field can never propagate.
 */
export function computeMix(input: MixInput): MixResult {
  const i = normalizeMixInput(input)

  const preset = PRESETS[i.preset]
  const hours = i.durationMin / 60
  const carryMl = i.bottleMl * i.bottles
  const carryL = carryMl / 1000

  // Session needs
  const needCarbsG = preset.carbsGPerH * hours
  const needSodiumMg = preset.sodiumMgPerH * hours
  const needFluidMl = i.fluidMlPerHour * hours

  // Concentration, capped so the drink stays drinkable
  const idealSodiumMgPerL = needSodiumMg / carryL
  const idealCarbsGPerL = needCarbsG / carryL
  const sodiumMgPerL = Math.min(idealSodiumMgPerL, MAX_SODIUM_MG_PER_L)
  const carbsGPerL = Math.min(idealCarbsGPerL, MAX_CARBS_G_PER_L)
  const concentrationCapped = sodiumMgPerL < idealSodiumMgPerL || carbsGPerL < idealCarbsGPerL

  // Salt properties of the user's potassium-rich salt
  const kClFraction = i.saltSetup === 'table-potassium' ? i.potassiumPct / 100 : 0
  const potassiumSaltNaPerG = (1 - kClFraction) * MG_SODIUM_PER_G_TABLE_SALT
  const potassiumSaltKPerG = kClFraction * MG_POTASSIUM_PER_G_KCL

  // Potassium-rich salt: hit the potassium target, but never past the point
  // where it already supplies all the sodium the mix calls for.
  const potassiumSaltTargetG = (sodiumMgPerL * preset.potassiumRatio * carryL) / (potassiumSaltKPerG || Infinity)
  const maxPotassiumSaltG = potassiumSaltNaPerG > 0 ? (sodiumMgPerL * carryL) / potassiumSaltNaPerG : 0
  const potassiumSaltG = Math.min(potassiumSaltTargetG, maxPotassiumSaltG)
  const potassiumSaltClamped = potassiumSaltG < potassiumSaltTargetG

  // Table salt fills whatever sodium is left
  const tableSaltG = Math.max(
    0,
    (sodiumMgPerL * carryL - potassiumSaltG * potassiumSaltNaPerG) / MG_SODIUM_PER_G_TABLE_SALT,
  )

  // What the batch actually delivers
  const sodiumMg = tableSaltG * MG_SODIUM_PER_G_TABLE_SALT + potassiumSaltG * potassiumSaltNaPerG
  const potassiumMg = potassiumSaltG * potassiumSaltKPerG
  const deliveredSodiumMgPerL = sodiumMg / carryL
  const potassiumMgPerL = potassiumMg / carryL
  const sugarG = carbsGPerL * carryL
  const carbsG = sugarG
  const kcal = carbsG * KCAL_PER_G_CARB
  const sodiumPotassiumRatio = potassiumMg > 0 ? sodiumMg / potassiumMg : null

  // Osmolality → tonicity
  const osmolarityMOsmPerL =
    carbsGPerL * (1000 / MOLAR_MASS_SUCROSE) +
    (tableSaltG / carryL) * saltOsmolarityPerGram(MG_SODIUM_PER_G_TABLE_SALT, 0) +
    (potassiumSaltG / carryL) * saltOsmolarityPerGram(potassiumSaltNaPerG, potassiumSaltKPerG)
  const tonicity: Tonicity =
    osmolarityMOsmPerL < ISOTONIC_LOW_MOSM_PER_L
      ? 'hypotonic'
      : osmolarityMOsmPerL > ISOTONIC_HIGH_MOSM_PER_L
        ? 'hypertonic'
        : 'isotonic'

  // Coverage of the session plan
  const shortfallSodiumMg = Math.round(Math.max(0, needSodiumMg - sodiumMg))
  const shortfallCarbsG = Math.round(Math.max(0, needCarbsG - carbsG))
  const shortfallFluidMl = Math.round(Math.max(0, needFluidMl - carryMl))

  // Schedule
  const minutesPerBottle = i.durationMin / i.bottles
  const sipMl = Math.round(i.fluidMlPerHour / 4) // 4 × 15 min = the hour
  const stationMlPerHour = shortfallFluidMl / hours
  const stationSipMl = Math.round(stationMlPerHour / 4)
  const gelCount = Math.ceil(shortfallCarbsG / 25)

  // Sucrose hydrolyses into equal masses of glucose and fructose, so a single
  // figure covers both absorbable fractions per hour.
  const monosaccharideGPerH = Math.round(preset.carbsGPerH * SUCROSE_TO_MONOSACCHARIDE)

  const flags: MixFlag[] = []
  if (concentrationCapped && carbsGPerL < idealCarbsGPerL) {
    flags.push({
      level: 'warn',
      message: `Carbs capped at 80 g/L (8% solution) so the drink stays drinkable. Your bottles cover ${coveragePct(carbsG, needCarbsG)}% of the ${Math.round(needCarbsG)} g plan — add about ${gelCount} gel(s) (25 g each) or a third bottle.`,
    })
  }
  if (concentrationCapped && sodiumMgPerL < idealSodiumMgPerL) {
    flags.push({
      level: 'warn',
      message: `Sodium capped at 1150 mg/L (50 mmol/L — above that, drinks get unpalatable). Your bottles cover ${coveragePct(sodiumMg, needSodiumMg)}% of the ${Math.round(needSodiumMg)} mg plan — take the rest at drink stations or from a stronger mix.`,
    })
  }
  if (shortfallFluidMl > 0) {
    flags.push({
      level: 'info',
      message: `Your ${hours} h plan needs ~${Math.round(needFluidMl)} ml of fluid but you carry ${carryMl} ml. Take about ${stationSipMl} ml every 15 min from drink stations, or carry an extra bottle.`,
    })
  }
  if (tonicity === 'hypertonic') {
    flags.push({
      level: 'warn',
      message: `This mix is hypertonic at ${Math.round(osmolarityMOsmPerL)} mOsm/L — it leaves the stomach slowly. Chase each bottle with plain water.`,
    })
  }
  if (carbsGPerL < MIN_CARBS_G_PER_L_INFO) {
    flags.push({
      level: 'info',
      message: `Very dilute (${Math.round(carbsGPerL)} g carbs/L). Fine as a hydration drink, but a long session will need gels or food for carbohydrate.`,
    })
  }
  if (deliveredSodiumMgPerL < MIN_SODIUM_MG_PER_L_INFO) {
    flags.push({
      level: 'info',
      message: `Only ${Math.round(deliveredSodiumMgPerL)} mg sodium/L. That is weaker than the 500–700 mg/L usually recommended for sessions over an hour.`,
    })
  }
  if (monosaccharideGPerH >= FRUCTOSE_G_PER_H_LIMIT) {
    flags.push({
      level: 'info',
      message: `Sucrose at ${preset.carbsGPerH} g/h delivers ~${monosaccharideGPerH} g/h fructose, at the ~30 g/h fructose absorption ceiling. Normal for most runners, but the upper limit if you get gut trouble.`,
    })
  }
  if (monosaccharideGPerH > GLUCOSE_G_PER_H_LIMIT) {
    flags.push({
      level: 'warn',
      message: `${preset.carbsGPerH} g/h sucrose means ~${monosaccharideGPerH} g/h glucose — above the ~60 g/h absorption ceiling. Gut training required.`,
    })
  }
  if (i.fluidMlPerHour > 1000) {
    flags.push({
      level: 'info',
      message: `Drinking over 1 L/h can dilute your blood sodium. Do not exceed your measured sweat rate.`,
    })
  }
  if (i.fluidMlPerHour < 300) {
    flags.push({
      level: 'info',
      message: `Under 300 ml/h is unlikely to keep up with sweat losses — check your sweat rate by weighing yourself before and after a run.`,
    })
  }
  if (potassiumSaltClamped && potassiumSaltKPerG > 0) {
    flags.push({
      level: 'warn',
      message: `Your potassium-rich salt is ${i.potassiumPct}% KCl — hitting the sodium target with it already overshoots the potassium target, so no plain table salt is added.`,
    })
  }
  if (i.saltSetup === 'table-potassium' && i.potassiumPct < 5) {
    flags.push({
      level: 'info',
      message: `Your potassium salt is only ${i.potassiumPct}% KCl, so it adds almost no potassium. Check the label.`,
    })
  }

  return {
    preset,
    hours,
    carryMl,
    bottleMl: i.bottleMl,
    bottles: i.bottles,
    needSodiumMg,
    needCarbsG,
    needFluidMl,
    sodiumMgPerL: deliveredSodiumMgPerL,
    potassiumMgPerL,
    carbsGPerL,
    concentrationCapped,
    potassiumSaltG,
    tableSaltG,
    sugarG,
    potassiumSaltTsp: potassiumSaltG / TSP_GRAMS_TABLE_SALT,
    tableSaltTsp: tableSaltG / TSP_GRAMS_TABLE_SALT,
    sugarTsp: sugarG / TSP_GRAMS_SUGAR,
    sodiumMg,
    potassiumMg,
    carbsG,
    kcal,
    sodiumPotassiumRatio,
    osmolarityMOsmPerL,
    tonicity,
    sodiumCoveragePct: coveragePct(sodiumMg, needSodiumMg),
    carbsCoveragePct: coveragePct(carbsG, needCarbsG),
    fluidCoveragePct: Math.round((carryMl / needFluidMl) * 100),
    shortfallSodiumMg,
    shortfallCarbsG,
    shortfallFluidMl,
    minutesPerBottle,
    sipMl,
    stationMlPerHour,
    stationSipMl,
    gelCount,
    flags,
  }
}
