/**
 * Runner's pain map data: the spots on the body a runner can tap, and for
 * each spot the running injuries that most often cause pain there.
 *
 * What is literature here:
 * - Which injuries are listed, and the "share of injuries" figures: Kakouris,
 *   Yener & Fong 2021, "A systematic review of running-related musculoskeletal
 *   injuries in runners" (J Sport Health Sci 10:513). Highest share of new
 *   injuries (incidence): Achilles tendinopathy 10.3%, medial tibial stress
 *   syndrome 9.4%, patellofemoral pain 6.3%, plantar fasciitis 6.1%, ankle
 *   sprain 5.8%. Highest share of injuries in surveys (prevalence):
 *   patellofemoral pain 16.7%, then MTSS, plantar fasciitis and iliotibial
 *   band syndrome. Cross-checked against Lopes et al. 2012 (Sports Med
 *   42:891) and the 2023 overview of systematic reviews in Current Emergency
 *   and Hospital Medicine Reports: knee, then ankle–foot and lower leg.
 * - What each injury feels like, why it happens and what helps, per injury:
 *   patellofemoral pain — Crossley et al. 2016 consensus (BJSM 50:839, 844);
 *   cadence — Heiderscheit et al. 2011 (MSSE 43:296), +5–10% step rate cuts
 *   knee load; patellar tendinopathy — Malliaras et al. 2015 (JOSPT 45:887);
 *   ITB syndrome — Fredericson & Wolf 2005 (Sports Med 35:451); MTSS —
 *   Winters et al. 2018 (BJSM 52:1267) for the ≥5 cm diffuse-tenderness
 *   criterion, Newman et al. 2013 (OAJSM 4:229) for risk factors; CECS —
 *   StatPearls "Exertional compartment syndrome", Diebal et al. 2012 (AJSM
 *   40:1060) for forefoot running; Achilles — Martin et al. 2018 CPG (JOSPT
 *   48:A1), Silbernagel et al. 2007 pain-monitoring model (AJSM 35:897);
 *   plantar heel pain — Koc et al. 2023 CPG (JOSPT 53:CPG1); gluteal
 *   tendinopathy — Mellor et al. 2018 LEAP trial (BMJ 361:k1662); proximal
 *   hamstring tendinopathy — Goom et al. 2016 (JOSPT 46:483); hamstring
 *   strain — van Dyk et al. 2019 (BJSM 53:1362), Nordic exercise halves the
 *   rate; calf strain — Green & Pizzari 2017 (BJSM 51:1189); groin — Doha
 *   agreement, Weir et al. 2015 (BJSM 49:768); degenerative meniscus — Kise
 *   et al. 2016 (BMJ 354:i3740); ankle sprain — Ottawa ankle rules (Stiell
 *   1992) and exercise-based rehabilitation reducing re-sprain (PLoS One
 *   2022 meta-analysis); tibialis posterior and peroneal tendinopathy —
 *   "Tendinopathies of the foot and ankle", AFP 2022; Morton's neuroma —
 *   EFORT Open Reviews 2019 instructional review; side stitch — Morton &
 *   Callister 2015 (Sports Med 45:23), ~70% of runners a year; cramp —
 *   Schwellnus 2009 (BJSM 43:401), neuromuscular fatigue rather than
 *   dehydration; DOMS — Cheung, Hume & Maxwell 2003 (Sports Med 33:145);
 *   chafing and blisters — Mailler & Adams 2004 (BJSM 38:498); DVT in
 *   marathon runners — JOSPT 2011 case report and later series; low back
 *   pain — Maselli et al. 2020 (BMC Musculoskelet Disord 21:343), Belavý et
 *   al. 2017 (Sci Rep 7:45975, runners' discs are better hydrated); cardiac
 *   arrest in races — Kim et al. 2012 (NEJM 366:130), 0.54 per 100,000.
 * - Bone stress injuries: high-risk sites (femoral neck, anterior tibia,
 *   navicular, 5th metatarsal) from McInnis & Ramey 2016 (PM&R 8:S113);
 *   under-fuelling as a cause from the 2023 IOC REDs consensus (Mountjoy et
 *   al., BJSM 57:1073).
 *
 * What is layout (ours): the spots and their boundaries, which injuries are
 * listed under which spot and in what order (most common first, then the
 * rarer ones worth ruling out), and the plain-language wording. This is a
 * guide to what a pain *could* be, not a diagnosis.
 *
 * The wording lives in the message catalog (messages/{locale}.json): keys
 * `pain_cause_<cause id>_<field>` and `pain_spot_<spot id>_<field>`, with the
 * English file the source every translation follows. This module keeps the
 * structure — which fields a cause has, likelihood, care, cross-references.
 */

import type { Message } from './i18n.svelte'
import { m } from '../paraglide/messages.js'

/** The three drawings of the body map. */
export type BodyView = 'front' | 'back' | 'sole'

/** How often runners get it — within the spot's list, commonest first. */
export type Likelihood = 'common' | 'occasional' | 'rare'

/**
 * Who should look at it first: `self` — start with load management and see a
 * physio if it isn't settling; `doctor` — don't run on it, get it assessed;
 * `urgent` — same-day or emergency care.
 */
export type Care = 'self' | 'doctor' | 'urgent'

export interface Cause {
  name: Message
  /** The name runners are more likely to know it by. */
  aka?: Message
  likelihood: Likelihood
  care: Care
  /** A literature figure on how common it is, when there is one. */
  stat?: Message
  /** What it feels like — the part that tells it apart from its neighbours. */
  feels: Message
  /** Why it happens. */
  why: Message
  /** What the evidence supports doing about it. */
  helps: Message
  /** When to get help. */
  check: Message
  /** Another tool in this app that helps (hash route). */
  tool?: { route: string; label: Message }
}

const METRONOME = { route: '/metronome', label: m.pain_tool_metronome }

const CAUSE_DATA = {
  // ---------- Knee ----------
  pfp: {
    name: m.pain_cause_pfp_name,
    aka: m.pain_cause_pfp_aka,
    likelihood: 'common',
    care: 'self',
    stat: m.pain_cause_pfp_stat,
    feels: m.pain_cause_pfp_feels,
    why: m.pain_cause_pfp_why,
    helps: m.pain_cause_pfp_helps,
    check: m.pain_cause_pfp_check,
    tool: METRONOME,
  },
  patellarTendinopathy: {
    name: m.pain_cause_patellarTendinopathy_name,
    aka: m.pain_cause_patellarTendinopathy_aka,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_patellarTendinopathy_feels,
    why: m.pain_cause_patellarTendinopathy_why,
    helps: m.pain_cause_patellarTendinopathy_helps,
    check: m.pain_cause_patellarTendinopathy_check,
  },
  itbs: {
    name: m.pain_cause_itbs_name,
    aka: m.pain_cause_itbs_aka,
    likelihood: 'common',
    care: 'self',
    stat: m.pain_cause_itbs_stat,
    feels: m.pain_cause_itbs_feels,
    why: m.pain_cause_itbs_why,
    helps: m.pain_cause_itbs_helps,
    check: m.pain_cause_itbs_check,
    tool: METRONOME,
  },
  pesAnserine: {
    name: m.pain_cause_pesAnserine_name,
    aka: m.pain_cause_pesAnserine_aka,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_pesAnserine_feels,
    why: m.pain_cause_pesAnserine_why,
    helps: m.pain_cause_pesAnserine_helps,
    check: m.pain_cause_pesAnserine_check,
  },
  meniscus: {
    name: m.pain_cause_meniscus_name,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_meniscus_feels,
    why: m.pain_cause_meniscus_why,
    helps: m.pain_cause_meniscus_helps,
    check: m.pain_cause_meniscus_check,
  },

  // ---------- Shin and calf ----------
  mtss: {
    name: m.pain_cause_mtss_name,
    aka: m.pain_cause_mtss_aka,
    likelihood: 'common',
    care: 'self',
    stat: m.pain_cause_mtss_stat,
    feels: m.pain_cause_mtss_feels,
    why: m.pain_cause_mtss_why,
    helps: m.pain_cause_mtss_helps,
    check: m.pain_cause_mtss_check,
  },
  tibialStressFracture: {
    name: m.pain_cause_tibialStressFracture_name,
    aka: m.pain_cause_tibialStressFracture_aka,
    likelihood: 'occasional',
    care: 'doctor',
    feels: m.pain_cause_tibialStressFracture_feels,
    why: m.pain_cause_tibialStressFracture_why,
    helps: m.pain_cause_tibialStressFracture_helps,
    check: m.pain_cause_tibialStressFracture_check,
  },
  anteriorTibialStressFracture: {
    name: m.pain_cause_anteriorTibialStressFracture_name,
    aka: m.pain_cause_anteriorTibialStressFracture_aka,
    likelihood: 'rare',
    care: 'doctor',
    feels: m.pain_cause_anteriorTibialStressFracture_feels,
    why: m.pain_cause_anteriorTibialStressFracture_why,
    helps: m.pain_cause_anteriorTibialStressFracture_helps,
    check: m.pain_cause_anteriorTibialStressFracture_check,
  },
  cecs: {
    name: m.pain_cause_cecs_name,
    aka: m.pain_cause_cecs_aka,
    likelihood: 'rare',
    care: 'self',
    feels: m.pain_cause_cecs_feels,
    why: m.pain_cause_cecs_why,
    helps: m.pain_cause_cecs_helps,
    check: m.pain_cause_cecs_check,
  },
  calfStrain: {
    name: m.pain_cause_calfStrain_name,
    aka: m.pain_cause_calfStrain_aka,
    likelihood: 'common',
    care: 'self',
    feels: m.pain_cause_calfStrain_feels,
    why: m.pain_cause_calfStrain_why,
    helps: m.pain_cause_calfStrain_helps,
    check: m.pain_cause_calfStrain_check,
  },
  cramp: {
    name: m.pain_cause_cramp_name,
    aka: m.pain_cause_cramp_aka,
    likelihood: 'common',
    care: 'self',
    feels: m.pain_cause_cramp_feels,
    why: m.pain_cause_cramp_why,
    helps: m.pain_cause_cramp_helps,
    check: m.pain_cause_cramp_check,
  },
  dvt: {
    name: m.pain_cause_dvt_name,
    aka: m.pain_cause_dvt_aka,
    likelihood: 'rare',
    care: 'urgent',
    feels: m.pain_cause_dvt_feels,
    why: m.pain_cause_dvt_why,
    helps: m.pain_cause_dvt_helps,
    check: m.pain_cause_dvt_check,
  },
  doms: {
    name: m.pain_cause_doms_name,
    aka: m.pain_cause_doms_aka,
    likelihood: 'common',
    care: 'self',
    feels: m.pain_cause_doms_feels,
    why: m.pain_cause_doms_why,
    helps: m.pain_cause_doms_helps,
    check: m.pain_cause_doms_check,
  },

  // ---------- Hip, groin and thigh ----------
  hipFlexor: {
    name: m.pain_cause_hipFlexor_name,
    aka: m.pain_cause_hipFlexor_aka,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_hipFlexor_feels,
    why: m.pain_cause_hipFlexor_why,
    helps: m.pain_cause_hipFlexor_helps,
    check: m.pain_cause_hipFlexor_check,
  },
  hipJoint: {
    name: m.pain_cause_hipJoint_name,
    aka: m.pain_cause_hipJoint_aka,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_hipJoint_feels,
    why: m.pain_cause_hipJoint_why,
    helps: m.pain_cause_hipJoint_helps,
    check: m.pain_cause_hipJoint_check,
  },
  adductor: {
    name: m.pain_cause_adductor_name,
    aka: m.pain_cause_adductor_aka,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_adductor_feels,
    why: m.pain_cause_adductor_why,
    helps: m.pain_cause_adductor_helps,
    check: m.pain_cause_adductor_check,
  },
  femoralNeckStressFracture: {
    name: m.pain_cause_femoralNeckStressFracture_name,
    aka: m.pain_cause_femoralNeckStressFracture_aka,
    likelihood: 'rare',
    care: 'doctor',
    feels: m.pain_cause_femoralNeckStressFracture_feels,
    why: m.pain_cause_femoralNeckStressFracture_why,
    helps: m.pain_cause_femoralNeckStressFracture_helps,
    check: m.pain_cause_femoralNeckStressFracture_check,
  },
  glutealTendinopathy: {
    name: m.pain_cause_glutealTendinopathy_name,
    aka: m.pain_cause_glutealTendinopathy_aka,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_glutealTendinopathy_feels,
    why: m.pain_cause_glutealTendinopathy_why,
    helps: m.pain_cause_glutealTendinopathy_helps,
    check: m.pain_cause_glutealTendinopathy_check,
  },
  quadStrain: {
    name: m.pain_cause_quadStrain_name,
    aka: m.pain_cause_quadStrain_aka,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_quadStrain_feels,
    why: m.pain_cause_quadStrain_why,
    helps: m.pain_cause_quadStrain_helps,
    check: m.pain_cause_quadStrain_check,
  },
  hamstringStrain: {
    name: m.pain_cause_hamstringStrain_name,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_hamstringStrain_feels,
    why: m.pain_cause_hamstringStrain_why,
    helps: m.pain_cause_hamstringStrain_helps,
    check: m.pain_cause_hamstringStrain_check,
  },
  proximalHamstring: {
    name: m.pain_cause_proximalHamstring_name,
    aka: m.pain_cause_proximalHamstring_aka,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_proximalHamstring_feels,
    why: m.pain_cause_proximalHamstring_why,
    helps: m.pain_cause_proximalHamstring_helps,
    check: m.pain_cause_proximalHamstring_check,
  },
  deepGluteal: {
    name: m.pain_cause_deepGluteal_name,
    aka: m.pain_cause_deepGluteal_aka,
    likelihood: 'rare',
    care: 'self',
    feels: m.pain_cause_deepGluteal_feels,
    why: m.pain_cause_deepGluteal_why,
    helps: m.pain_cause_deepGluteal_helps,
    check: m.pain_cause_deepGluteal_check,
  },

  // ---------- Back and trunk ----------
  lowBackPain: {
    name: m.pain_cause_lowBackPain_name,
    likelihood: 'common',
    care: 'self',
    feels: m.pain_cause_lowBackPain_feels,
    why: m.pain_cause_lowBackPain_why,
    helps: m.pain_cause_lowBackPain_helps,
    check: m.pain_cause_lowBackPain_check,
  },
  sciatica: {
    name: m.pain_cause_sciatica_name,
    aka: m.pain_cause_sciatica_aka,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_sciatica_feels,
    why: m.pain_cause_sciatica_why,
    helps: m.pain_cause_sciatica_helps,
    check: m.pain_cause_sciatica_check,
  },
  stitch: {
    name: m.pain_cause_stitch_name,
    aka: m.pain_cause_stitch_aka,
    likelihood: 'common',
    care: 'self',
    stat: m.pain_cause_stitch_stat,
    feels: m.pain_cause_stitch_feels,
    why: m.pain_cause_stitch_why,
    helps: m.pain_cause_stitch_helps,
    check: m.pain_cause_stitch_check,
  },
  nippleChafing: {
    name: m.pain_cause_nippleChafing_name,
    aka: m.pain_cause_nippleChafing_aka,
    likelihood: 'common',
    care: 'self',
    feels: m.pain_cause_nippleChafing_feels,
    why: m.pain_cause_nippleChafing_why,
    helps: m.pain_cause_nippleChafing_helps,
    check: m.pain_cause_nippleChafing_check,
  },
  cardiac: {
    name: m.pain_cause_cardiac_name,
    aka: m.pain_cause_cardiac_aka,
    likelihood: 'rare',
    care: 'urgent',
    feels: m.pain_cause_cardiac_feels,
    why: m.pain_cause_cardiac_why,
    helps: m.pain_cause_cardiac_helps,
    check: m.pain_cause_cardiac_check,
  },

  // ---------- Ankle and Achilles ----------
  achilles: {
    name: m.pain_cause_achilles_name,
    aka: m.pain_cause_achilles_aka,
    likelihood: 'common',
    care: 'self',
    stat: m.pain_cause_achilles_stat,
    feels: m.pain_cause_achilles_feels,
    why: m.pain_cause_achilles_why,
    helps: m.pain_cause_achilles_helps,
    check: m.pain_cause_achilles_check,
  },
  insertionalAchilles: {
    name: m.pain_cause_insertionalAchilles_name,
    aka: m.pain_cause_insertionalAchilles_aka,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_insertionalAchilles_feels,
    why: m.pain_cause_insertionalAchilles_why,
    helps: m.pain_cause_insertionalAchilles_helps,
    check: m.pain_cause_insertionalAchilles_check,
  },
  ankleSprain: {
    name: m.pain_cause_ankleSprain_name,
    aka: m.pain_cause_ankleSprain_aka,
    likelihood: 'common',
    care: 'self',
    stat: m.pain_cause_ankleSprain_stat,
    feels: m.pain_cause_ankleSprain_feels,
    why: m.pain_cause_ankleSprain_why,
    helps: m.pain_cause_ankleSprain_helps,
    check: m.pain_cause_ankleSprain_check,
  },
  peroneal: {
    name: m.pain_cause_peroneal_name,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_peroneal_feels,
    why: m.pain_cause_peroneal_why,
    helps: m.pain_cause_peroneal_helps,
    check: m.pain_cause_peroneal_check,
  },
  tibialisPosterior: {
    name: m.pain_cause_tibialisPosterior_name,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_tibialisPosterior_feels,
    why: m.pain_cause_tibialisPosterior_why,
    helps: m.pain_cause_tibialisPosterior_helps,
    check: m.pain_cause_tibialisPosterior_check,
  },

  // ---------- Foot ----------
  plantarHeel: {
    name: m.pain_cause_plantarHeel_name,
    aka: m.pain_cause_plantarHeel_aka,
    likelihood: 'common',
    care: 'self',
    stat: m.pain_cause_plantarHeel_stat,
    feels: m.pain_cause_plantarHeel_feels,
    why: m.pain_cause_plantarHeel_why,
    helps: m.pain_cause_plantarHeel_helps,
    check: m.pain_cause_plantarHeel_check,
  },
  heelStressFracture: {
    name: m.pain_cause_heelStressFracture_name,
    aka: m.pain_cause_heelStressFracture_aka,
    likelihood: 'rare',
    care: 'doctor',
    feels: m.pain_cause_heelStressFracture_feels,
    why: m.pain_cause_heelStressFracture_why,
    helps: m.pain_cause_heelStressFracture_helps,
    check: m.pain_cause_heelStressFracture_check,
  },
  fatPad: {
    name: m.pain_cause_fatPad_name,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_fatPad_feels,
    why: m.pain_cause_fatPad_why,
    helps: m.pain_cause_fatPad_helps,
    check: m.pain_cause_fatPad_check,
  },
  navicularStressFracture: {
    name: m.pain_cause_navicularStressFracture_name,
    likelihood: 'rare',
    care: 'doctor',
    feels: m.pain_cause_navicularStressFracture_feels,
    why: m.pain_cause_navicularStressFracture_why,
    helps: m.pain_cause_navicularStressFracture_helps,
    check: m.pain_cause_navicularStressFracture_check,
  },
  metatarsalStressFracture: {
    name: m.pain_cause_metatarsalStressFracture_name,
    aka: m.pain_cause_metatarsalStressFracture_aka,
    likelihood: 'occasional',
    care: 'doctor',
    feels: m.pain_cause_metatarsalStressFracture_feels,
    why: m.pain_cause_metatarsalStressFracture_why,
    helps: m.pain_cause_metatarsalStressFracture_helps,
    check: m.pain_cause_metatarsalStressFracture_check,
  },
  extensorTendinopathy: {
    name: m.pain_cause_extensorTendinopathy_name,
    aka: m.pain_cause_extensorTendinopathy_aka,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_extensorTendinopathy_feels,
    why: m.pain_cause_extensorTendinopathy_why,
    helps: m.pain_cause_extensorTendinopathy_helps,
    check: m.pain_cause_extensorTendinopathy_check,
  },
  metatarsalgia: {
    name: m.pain_cause_metatarsalgia_name,
    aka: m.pain_cause_metatarsalgia_aka,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_metatarsalgia_feels,
    why: m.pain_cause_metatarsalgia_why,
    helps: m.pain_cause_metatarsalgia_helps,
    check: m.pain_cause_metatarsalgia_check,
  },
  morton: {
    name: m.pain_cause_morton_name,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_morton_feels,
    why: m.pain_cause_morton_why,
    helps: m.pain_cause_morton_helps,
    check: m.pain_cause_morton_check,
  },
  sesamoiditis: {
    name: m.pain_cause_sesamoiditis_name,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_sesamoiditis_feels,
    why: m.pain_cause_sesamoiditis_why,
    helps: m.pain_cause_sesamoiditis_helps,
    check: m.pain_cause_sesamoiditis_check,
  },
  bigToeArthritis: {
    name: m.pain_cause_bigToeArthritis_name,
    aka: m.pain_cause_bigToeArthritis_aka,
    likelihood: 'occasional',
    care: 'self',
    feels: m.pain_cause_bigToeArthritis_feels,
    why: m.pain_cause_bigToeArthritis_why,
    helps: m.pain_cause_bigToeArthritis_helps,
    check: m.pain_cause_bigToeArthritis_check,
  },
  blackToenail: {
    name: m.pain_cause_blackToenail_name,
    aka: m.pain_cause_blackToenail_aka,
    likelihood: 'common',
    care: 'self',
    feels: m.pain_cause_blackToenail_feels,
    why: m.pain_cause_blackToenail_why,
    helps: m.pain_cause_blackToenail_helps,
    check: m.pain_cause_blackToenail_check,
  },
  blisters: {
    name: m.pain_cause_blisters_name,
    likelihood: 'common',
    care: 'self',
    feels: m.pain_cause_blisters_feels,
    why: m.pain_cause_blisters_why,
    helps: m.pain_cause_blisters_helps,
    check: m.pain_cause_blisters_check,
  },
} satisfies Record<string, Cause>

export type CauseId = keyof typeof CAUSE_DATA

export const CAUSES: Record<CauseId, Cause> = CAUSE_DATA

interface SpotData {
  id: string
  /** Spot name as a heading: "Outside of the knee". */
  name: Message
  /** Short name for the map tooltip and chips. */
  short: Message
  /** One line pinning down where exactly the spot is. */
  where: Message
  /** The drawings the spot can be tapped on; the first is its home view. */
  views: readonly BodyView[]
  /** Commonest first, then the rarer ones worth ruling out. */
  causes: readonly CauseId[]
  /** Spots next to this one, offered when the tap was not quite right. */
  nearby: readonly string[]
}

// Declaration order is top-to-bottom within each view, which is also the
// keyboard order of the hotspots on the map.
export const SPOTS = [
  {
    id: 'chest',
    name: m.pain_spot_chest_name,
    short: m.pain_spot_chest_short,
    where: m.pain_spot_chest_where,
    views: ['front'],
    causes: ['nippleChafing', 'cardiac'],
    nearby: ['side-stitch'],
  },
  {
    id: 'side-stitch',
    name: m.pain_spot_side_stitch_name,
    short: m.pain_spot_side_stitch_short,
    where: m.pain_spot_side_stitch_where,
    views: ['front'],
    causes: ['stitch'],
    nearby: ['chest', 'groin'],
  },
  {
    id: 'lower-back',
    name: m.pain_spot_lower_back_name,
    short: m.pain_spot_lower_back_short,
    where: m.pain_spot_lower_back_where,
    views: ['back'],
    causes: ['lowBackPain', 'sciatica'],
    nearby: ['buttock', 'outer-hip'],
  },
  {
    id: 'groin',
    name: m.pain_spot_groin_name,
    short: m.pain_spot_groin_short,
    where: m.pain_spot_groin_where,
    views: ['front'],
    causes: ['hipFlexor', 'hipJoint', 'adductor', 'femoralNeckStressFracture'],
    nearby: ['outer-hip', 'front-thigh', 'side-stitch'],
  },
  {
    id: 'outer-hip',
    name: m.pain_spot_outer_hip_name,
    short: m.pain_spot_outer_hip_short,
    where: m.pain_spot_outer_hip_where,
    views: ['front', 'back'],
    causes: ['glutealTendinopathy', 'sciatica'],
    nearby: ['buttock', 'groin', 'lower-back'],
  },
  {
    id: 'buttock',
    name: m.pain_spot_buttock_name,
    short: m.pain_spot_buttock_short,
    where: m.pain_spot_buttock_where,
    views: ['back'],
    causes: ['sciatica', 'deepGluteal', 'proximalHamstring'],
    nearby: ['sit-bone', 'lower-back', 'outer-hip'],
  },
  {
    id: 'sit-bone',
    name: m.pain_spot_sit_bone_name,
    short: m.pain_spot_sit_bone_short,
    where: m.pain_spot_sit_bone_where,
    views: ['back'],
    causes: ['proximalHamstring', 'hamstringStrain', 'sciatica'],
    nearby: ['buttock', 'back-thigh'],
  },
  {
    id: 'front-thigh',
    name: m.pain_spot_front_thigh_name,
    short: m.pain_spot_front_thigh_short,
    where: m.pain_spot_front_thigh_where,
    views: ['front'],
    causes: ['doms', 'quadStrain', 'hipFlexor'],
    nearby: ['groin', 'front-knee'],
  },
  {
    id: 'back-thigh',
    name: m.pain_spot_back_thigh_name,
    short: m.pain_spot_back_thigh_short,
    where: m.pain_spot_back_thigh_where,
    views: ['back'],
    causes: ['hamstringStrain', 'doms', 'cramp', 'sciatica'],
    nearby: ['sit-bone', 'calf'],
  },
  {
    id: 'front-knee',
    name: m.pain_spot_front_knee_name,
    short: m.pain_spot_front_knee_short,
    where: m.pain_spot_front_knee_where,
    views: ['front'],
    causes: ['pfp', 'patellarTendinopathy'],
    nearby: ['outer-knee', 'inner-knee', 'front-thigh'],
  },
  {
    id: 'outer-knee',
    name: m.pain_spot_outer_knee_name,
    short: m.pain_spot_outer_knee_short,
    where: m.pain_spot_outer_knee_where,
    views: ['front'],
    causes: ['itbs', 'meniscus'],
    nearby: ['front-knee', 'inner-knee', 'outer-shin'],
  },
  {
    id: 'inner-knee',
    name: m.pain_spot_inner_knee_name,
    short: m.pain_spot_inner_knee_short,
    where: m.pain_spot_inner_knee_where,
    views: ['front'],
    causes: ['pfp', 'pesAnserine', 'meniscus'],
    nearby: ['front-knee', 'outer-knee', 'inner-shin'],
  },
  {
    id: 'inner-shin',
    name: m.pain_spot_inner_shin_name,
    short: m.pain_spot_inner_shin_short,
    where: m.pain_spot_inner_shin_where,
    views: ['front'],
    causes: ['mtss', 'tibialStressFracture', 'tibialisPosterior'],
    nearby: ['outer-shin', 'calf', 'inner-ankle'],
  },
  {
    id: 'outer-shin',
    name: m.pain_spot_outer_shin_name,
    short: m.pain_spot_outer_shin_short,
    where: m.pain_spot_outer_shin_where,
    views: ['front'],
    causes: ['cecs', 'anteriorTibialStressFracture'],
    nearby: ['inner-shin', 'outer-ankle', 'outer-knee'],
  },
  {
    id: 'calf',
    name: m.pain_spot_calf_name,
    short: m.pain_spot_calf_short,
    where: m.pain_spot_calf_where,
    views: ['back'],
    causes: ['calfStrain', 'cramp', 'doms', 'cecs', 'dvt'],
    nearby: ['achilles', 'back-thigh', 'inner-shin'],
  },
  {
    id: 'achilles',
    name: m.pain_spot_achilles_name,
    short: m.pain_spot_achilles_short,
    where: m.pain_spot_achilles_where,
    views: ['back'],
    causes: ['achilles', 'calfStrain', 'insertionalAchilles'],
    nearby: ['back-heel', 'calf'],
  },
  {
    id: 'back-heel',
    name: m.pain_spot_back_heel_name,
    short: m.pain_spot_back_heel_short,
    where: m.pain_spot_back_heel_where,
    views: ['back'],
    causes: ['insertionalAchilles', 'heelStressFracture'],
    nearby: ['achilles', 'heel'],
  },
  {
    id: 'outer-ankle',
    name: m.pain_spot_outer_ankle_name,
    short: m.pain_spot_outer_ankle_short,
    where: m.pain_spot_outer_ankle_where,
    views: ['front'],
    causes: ['ankleSprain', 'peroneal'],
    nearby: ['inner-ankle', 'top-of-foot', 'outer-shin'],
  },
  {
    id: 'inner-ankle',
    name: m.pain_spot_inner_ankle_name,
    short: m.pain_spot_inner_ankle_short,
    where: m.pain_spot_inner_ankle_where,
    views: ['front'],
    causes: ['tibialisPosterior', 'navicularStressFracture'],
    nearby: ['outer-ankle', 'arch', 'inner-shin'],
  },
  {
    id: 'top-of-foot',
    name: m.pain_spot_top_of_foot_name,
    short: m.pain_spot_top_of_foot_short,
    where: m.pain_spot_top_of_foot_where,
    views: ['front'],
    causes: ['extensorTendinopathy', 'metatarsalStressFracture', 'navicularStressFracture'],
    nearby: ['outer-ankle', 'inner-ankle', 'ball-of-foot'],
  },
  {
    id: 'toes',
    name: m.pain_spot_toes_name,
    short: m.pain_spot_toes_short,
    where: m.pain_spot_toes_where,
    views: ['sole'],
    causes: ['blisters', 'blackToenail', 'morton'],
    nearby: ['ball-of-foot', 'big-toe-joint'],
  },
  {
    id: 'big-toe-joint',
    name: m.pain_spot_big_toe_joint_name,
    short: m.pain_spot_big_toe_joint_short,
    where: m.pain_spot_big_toe_joint_where,
    views: ['sole'],
    causes: ['sesamoiditis', 'bigToeArthritis', 'blisters'],
    nearby: ['ball-of-foot', 'toes', 'arch'],
  },
  {
    id: 'ball-of-foot',
    name: m.pain_spot_ball_of_foot_name,
    short: m.pain_spot_ball_of_foot_short,
    where: m.pain_spot_ball_of_foot_where,
    views: ['sole'],
    causes: ['metatarsalgia', 'morton', 'metatarsalStressFracture', 'blisters'],
    nearby: ['big-toe-joint', 'toes', 'top-of-foot'],
  },
  {
    id: 'arch',
    name: m.pain_spot_arch_name,
    short: m.pain_spot_arch_short,
    where: m.pain_spot_arch_where,
    views: ['sole'],
    causes: ['plantarHeel', 'tibialisPosterior', 'navicularStressFracture'],
    nearby: ['heel', 'inner-ankle', 'big-toe-joint'],
  },
  {
    id: 'heel',
    name: m.pain_spot_heel_name,
    short: m.pain_spot_heel_short,
    where: m.pain_spot_heel_where,
    views: ['sole'],
    causes: ['plantarHeel', 'fatPad', 'heelStressFracture'],
    nearby: ['arch', 'back-heel'],
  },
] as const satisfies readonly SpotData[]

export type SpotId = (typeof SPOTS)[number]['id']

/** A spot with its cross-references typed as spot ids. */
export type PainSpot = Omit<SpotData, 'id' | 'nearby'> & { id: SpotId; nearby: readonly SpotId[] }

// Compile-time check: every `nearby` entry names a real spot (a typo makes
// this `never`, and assigning `true` to it fails the typecheck).
type NearbyId = (typeof SPOTS)[number]['nearby'][number]
const nearbyAreSpots: NearbyId extends SpotId ? true : never = true
void nearbyAreSpots

export const VIEWS: { id: BodyView; label: Message; caption: Message; mapLabel: Message }[] = [
  { id: 'front', label: m.pain_view_front, caption: m.pain_view_front_caption, mapLabel: m.pain_view_front_map },
  { id: 'back', label: m.pain_view_back, caption: m.pain_view_back_caption, mapLabel: m.pain_view_back_map },
  { id: 'sole', label: m.pain_view_sole, caption: m.pain_view_sole_caption, mapLabel: m.pain_view_sole_map },
]

/** The five commonest new running injuries (Kakouris 2021, incidence share) and where they hurt. */
export const TOP_INJURIES: { cause: CauseId; spot: SpotId; percent: number }[] = [
  { cause: 'achilles', spot: 'achilles', percent: 10.3 },
  { cause: 'mtss', spot: 'inner-shin', percent: 9.4 },
  { cause: 'pfp', spot: 'front-knee', percent: 6.3 },
  { cause: 'plantarHeel', spot: 'heel', percent: 6.1 },
  { cause: 'ankleSprain', spot: 'outer-ankle', percent: 5.8 },
]

/** Stop and get help — whatever the spot. */
export const RED_FLAGS: { urgent: boolean; message: Message }[] = [
  {
    urgent: true,
    message: m.pain_red_flag_chest,
  },
  { urgent: false, message: m.pain_red_flag_weight },
  { urgent: false, message: m.pain_red_flag_bone },
  { urgent: false, message: m.pain_red_flag_rest },
  { urgent: false, message: m.pain_red_flag_swelling },
  { urgent: false, message: m.pain_red_flag_numbness },
  { urgent: false, message: m.pain_red_flag_pop },
]

const SPOT_BY_ID = new Map<string, PainSpot>(SPOTS.map((s) => [s.id, s as PainSpot]))

export function isSpotId(value: unknown): value is SpotId {
  return typeof value === 'string' && SPOT_BY_ID.has(value)
}

export function getSpot(id: SpotId): PainSpot {
  return SPOT_BY_ID.get(id)!
}

export function isBodyView(value: unknown): value is BodyView {
  return VIEWS.some((v) => v.id === value)
}

export interface PainMapSelection {
  view: BodyView
  spot: SpotId | null
}

/**
 * Validate a stored selection. A spot always comes with a view it can be seen
 * in, so a restored page never shows a highlighted spot on the wrong drawing.
 */
export function normalizeSelection(raw: unknown): PainMapSelection {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const spot = isSpotId(r.spot) ? r.spot : null
  let view: BodyView = isBodyView(r.view) ? r.view : 'front'
  if (spot && !getSpot(spot).views.includes(view)) view = getSpot(spot).views[0]
  return { view, spot }
}
