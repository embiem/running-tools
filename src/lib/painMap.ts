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
 */

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
  name: string
  /** The name runners are more likely to know it by. */
  aka?: string
  likelihood: Likelihood
  care: Care
  /** A literature figure on how common it is, when there is one. */
  stat?: string
  /** What it feels like — the part that tells it apart from its neighbours. */
  feels: string
  /** Why it happens. */
  why: string
  /** What the evidence supports doing about it. */
  helps: string
  /** When to get help. */
  check: string
  /** Another tool in this app that helps (hash route). */
  tool?: { route: string; label: string }
}

const METRONOME = { route: '/metronome', label: 'Raise your cadence with the metronome' }

const CAUSE_DATA = {
  // ---------- Knee ----------
  pfp: {
    name: 'Patellofemoral pain',
    aka: 'runner’s knee',
    likelihood: 'common',
    care: 'self',
    stat: 'The most reported running injury: 16.7% of injuries in surveys',
    feels:
      'A dull ache around or behind the kneecap, often in both knees. Stairs (especially going down), squatting, kneeling, hills and sitting for a long time with bent knees make it worse.',
    why: 'The joint behind the kneecap is taking more load than it is used to — usually after a jump in distance, hills or pace. Weak hip and thigh muscles are linked to it.',
    helps:
      'Cut back to running that keeps the pain mild and settled by the next morning rather than stopping outright. Hip and thigh strengthening is the best-supported treatment; taping or foot orthoses can help in the short term. Raising your cadence by 5–10% lowers the load on the knee.',
    check: 'The knee swells, locks or gives way, or the pain started with a twist or a fall.',
    tool: METRONOME,
  },
  patellarTendinopathy: {
    name: 'Patellar tendinopathy',
    aka: 'jumper’s knee',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'Pain pinpointed on the tendon just below the kneecap. It hurts when the tendon works hard — hills, fast running, hopping — is often stiff at the start, eases as you warm up and is sorer afterwards or the next day.',
    why: 'Tendon overload, usually from adding speed work, hills or jumping faster than the tendon can adapt.',
    helps:
      'Keep the tendon loaded, just less: trim the hills and speed, then rebuild with a progressive programme — holds such as wall sits, then slow heavy squats, then faster, springier work. Rest alone rarely fixes a tendon.',
    check: 'It isn’t improving after 6–8 weeks of sensible loading, or the knee swells.',
  },
  itbs: {
    name: 'Iliotibial band syndrome',
    aka: 'ITB syndrome',
    likelihood: 'common',
    care: 'self',
    stat: '7.9% of running injuries in surveys',
    feels:
      'Sharp or burning pain on the outside of the knee that starts at a predictable point into a run and builds until you have to stop. Downhills and stairs make it worse; walking on the flat is usually fine.',
    why: 'Repeated compression of the band against the outside of the thigh bone at about 30° of knee bend. A quick rise in mileage, downhill running, always running the same way round a track or on a cambered road, and weak hip muscles are all linked to it.',
    helps:
      'Back off the runs that bring it on — long runs and downhills first — and build hip strength. Return with short, flat runs. A slightly higher cadence reduces the strain. Foam rolling may ease it briefly but does not lengthen the band.',
    check: 'It hasn’t improved in 6 weeks, or the knee swells, clicks or locks — that points to the meniscus instead.',
    tool: METRONOME,
  },
  pesAnserine: {
    name: 'Pes anserine pain',
    aka: 'pes anserine bursitis',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'Tenderness on the inner side of the shin bone, a few centimetres below the knee joint. Worse on stairs, getting up from a chair and at night with the knees pressed together.',
    why: 'Overload of the three tendons (and the bursa beneath them) that attach there. More common in women, older runners and knees with arthritis.',
    helps:
      'Ease off the runs and stairs that aggravate it for a while, sleep with a pillow between the knees, and strengthen the thigh and hip muscles.',
    check: 'The knee joint itself swells, or the pain lasts beyond 6 weeks.',
  },
  meniscus: {
    name: 'Meniscus irritation or tear',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'Pain right on the joint line at the side of the knee, often after a twist or a deep squat. Swelling that builds over hours, catching, clicking, or the knee locking and not fully straightening.',
    why: 'A tear in the cartilage pad between thigh and shin bone — from a twist when younger, or gradual wear from about 40 onwards, often with no single event.',
    helps:
      'Worn (degenerative) tears do as well with exercise therapy as with keyhole surgery. Avoid twisting and deep squats for now, keep the knee moving and strengthen the thigh.',
    check: 'The knee locks, won’t straighten fully, gives way or swells quickly.',
  },

  // ---------- Shin and calf ----------
  mtss: {
    name: 'Medial tibial stress syndrome',
    aka: 'shin splints',
    likelihood: 'common',
    care: 'self',
    stat: '9.4% of new running injuries',
    feels:
      'A diffuse ache along the inner edge of the shin bone, usually its lower two-thirds, tender along a strip at least 5 cm long. Often sore at the start of a run, easing as you warm up, then aching afterwards.',
    why: 'The shin bone is loaded faster than it can adapt — typically in new runners or after a jump in volume. Being female, a previous episode, a higher BMI and a flatter, more mobile arch all raise the risk.',
    helps:
      'Cut running to a pain-free level and keep fit with cycling or pool running, then build back gradually. Calf and foot strength work helps the leg absorb load. Most cases settle within weeks of managing the load.',
    check: 'The pain narrows to one fingertip-sized spot, hopping on the leg hurts, or it aches at rest or at night — that points to a stress fracture.',
  },
  tibialStressFracture: {
    name: 'Tibial stress fracture',
    aka: 'bone stress injury',
    likelihood: 'occasional',
    care: 'doctor',
    feels:
      'A pinpoint, fingertip-sized tender spot on the shin bone that gets worse run by run, then hurts when walking and eventually at rest or at night. Hopping on that leg hurts.',
    why: 'Bone breaking down faster than it rebuilds: a rapid increase in training, too little recovery and — above all — not eating enough for the training you do. Missed periods, low vitamin D and a previous stress fracture raise the risk.',
    helps:
      'Stop running and get it assessed; an MRI confirms it. Most heal with several weeks of relative rest (pain-free walking is usually fine) and a gradual return. Fuel your training properly.',
    check: 'See a doctor before you run on it again.',
  },
  anteriorTibialStressFracture: {
    name: 'Stress fracture at the front of the shin',
    aka: 'anterior tibial stress fracture',
    likelihood: 'rare',
    care: 'doctor',
    feels:
      'A sore, tender spot on the sharp front edge of the shin bone, usually mid-shin, that worsens with running and jumping and may ache at night.',
    why: 'The front of the shin is the bone’s tension side: fractures there heal slowly and can progress to a complete break, which makes it a high-risk site.',
    helps:
      'Stop running and see a sports doctor promptly. It usually needs longer protection than other shin stress fractures, and sometimes surgery.',
    check: 'See a doctor before you run on it again.',
  },
  cecs: {
    name: 'Chronic exertional compartment syndrome',
    aka: 'CECS',
    likelihood: 'rare',
    care: 'self',
    feels:
      'A tight, bursting or cramping pressure in the muscle (not the bone) that builds at the same time or distance into every run, sometimes with numbness or tingling in the foot or a slapping foot. It fades within minutes of stopping and often affects both legs.',
    why: 'The muscle swells with exercise inside a sheath of fascia that doesn’t stretch enough, so the pressure rises and squeezes the blood vessels and nerves.',
    helps:
      'Changing technique to land further forward on the foot relieved symptoms in a small trial. Otherwise it needs a sports physician: the diagnosis is made by measuring the pressure in the muscle compartment, and persistent cases are treated with surgery.',
    check: 'It comes back on every run, or you notice numbness or foot weakness.',
  },
  calfStrain: {
    name: 'Calf strain',
    aka: 'torn calf muscle',
    likelihood: 'common',
    care: 'self',
    feels:
      'Upper calf: a sudden sharp pain as if kicked, often during speed work or hills. Lower calf (soleus): a tightness that builds during a longer run until you have to stop. Tender to press; pushing off hurts.',
    why: 'A muscle tear under load. Age over 40, a previous calf strain and quick increases in volume or speed are the main risk factors.',
    helps:
      'Keep walking if it is comfortable and start calf loading early — seated, bent-knee heel raises for the lower calf, straight-knee ones for the upper — then return with graded runs.',
    check: 'The calf swells or feels warm, or the pain doesn’t ease — rule out a blood clot.',
  },
  cramp: {
    name: 'Muscle cramp',
    aka: 'exercise-associated muscle cramp',
    likelihood: 'common',
    care: 'self',
    feels:
      'A sudden, involuntary, rock-hard spasm — usually the calf or hamstring — late in a hard race or long run. It stops within minutes but can leave the muscle sore.',
    why: 'Mostly neuromuscular fatigue: the reflexes controlling a tired muscle misfire. Dehydration and salt loss are weakly linked at best. Having cramped before is the strongest predictor.',
    helps:
      'Stop and gently stretch the cramping muscle. Prevent it by pacing realistically and training at your race intensity and duration.',
    check: 'Cramps come at rest or very often, or with confusion, vomiting or dark urine.',
  },
  dvt: {
    name: 'Blood clot in the leg',
    aka: 'deep vein thrombosis',
    likelihood: 'rare',
    care: 'urgent',
    feels:
      'One calf (and often the ankle) swells and feels warm, tight or tender, and may look red — a cramp-like ache that doesn’t ease with stretching or rest. Often after a long flight or drive, surgery or a leg injury.',
    why: 'A clot in a deep leg vein. Fit athletes get them too and they are easily mistaken for a calf strain. Long travel to and from races, dehydration, hormonal contraception and recent injury raise the risk.',
    helps: 'This is a medical problem, not a training one: it needs a scan and blood-thinning treatment.',
    check:
      'See a doctor the same day. Call emergency services if you also have chest pain or sudden breathlessness — the clot may have reached the lungs.',
  },
  doms: {
    name: 'Delayed-onset muscle soreness',
    aka: 'DOMS',
    likelihood: 'common',
    care: 'self',
    feels:
      'Stiff, tender muscles in both legs that start 12–24 hours after a hard, long or unusual session — a race, a hilly run — and peak at 24–72 hours. Going downstairs is the giveaway. Gone within a week.',
    why: 'Unaccustomed eccentric work — muscles braking while they lengthen, above all running downhill — causes micro-damage. One bout protects you from the next for weeks (the repeated-bout effect).',
    helps:
      'Time. Easy movement feels better and massage helps a little; nothing reliably speeds recovery. It isn’t an injury, but don’t race hard again until it has gone.',
    check: 'The pain is in one spot of one leg, the muscle swells a lot, or your urine turns dark brown — that last one needs a doctor straight away.',
  },

  // ---------- Hip, groin and thigh ----------
  hipFlexor: {
    name: 'Hip flexor strain or tendinopathy',
    aka: 'iliopsoas-related groin pain',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'Pain deep in the front of the hip or groin when lifting the knee — climbing stairs, getting into a car, running uphill or fast. Stretching the front of the hip may pull on it.',
    why: 'Overload of the hip flexors, often after adding hills, speed work or strides.',
    helps:
      'Ease off hills and speed, then strengthen the hip flexors progressively, for example standing knee lifts against a band. Most settle within a few weeks.',
    check: 'The pain is deep, worsens with each run or hurts when you hop — rule out a stress fracture first.',
  },
  hipJoint: {
    name: 'Hip joint pain',
    aka: 'hip impingement or labral tear',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'Deep groin pain, often felt as a grip around the side of the hip, with catching, clicking or locking. Low seats, putting on socks and deep bending hurt.',
    why: 'The shape of the hip bones can pinch the joint rim (the labrum) in deep bending; running adds repetitive load.',
    helps:
      'Avoid deep hip bending for now. Hip and trunk strengthening, guided by a physiotherapist, is the first-line treatment.',
    check: 'Catching or locking persists, or the pain limits your walking.',
  },
  adductor: {
    name: 'Adductor-related groin pain',
    aka: 'groin strain',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'Pain in the inner groin near the pubic bone, tender on the inner-thigh tendon, worse squeezing the knees together, changing direction or sprinting.',
    why: 'Overload of the inner-thigh muscles — commoner in kicking and cutting sports, but also seen after speed work and trail running.',
    helps: 'Progressive adductor strengthening, such as the Copenhagen side plank, both treats and prevents it.',
    check: 'A lump in the groin appears when you cough, or the pain lasts beyond 6 weeks.',
  },
  femoralNeckStressFracture: {
    name: 'Femoral neck stress fracture',
    aka: 'hip stress fracture',
    likelihood: 'rare',
    care: 'doctor',
    feels:
      'A vague, deep ache in the groin or front of the hip that gets worse with running, then with walking. You may limp, and hopping on the leg hurts — but pressing on it usually doesn’t, as the bone is deep.',
    why: 'Bone overload, most often in distance runners who are under-fuelled, have missed periods or have had a stress fracture before.',
    helps:
      'Stop running and see a doctor within days — an X-ray can miss it, so MRI is used. Caught early it heals with rest; missed, it can break completely.',
    check: 'See a doctor promptly — immediately if you can’t bear weight.',
  },
  glutealTendinopathy: {
    name: 'Gluteal tendinopathy',
    aka: 'greater trochanteric pain syndrome',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'Pain on the bony point on the outside of the hip, tender to press. Lying on that side, standing on one leg, stairs, crossing your legs and getting up after sitting all aggravate it.',
    why: 'The gluteal tendons are squeezed and overloaded where they wrap around the hip bone — most common in women over 40 and after mileage increases.',
    helps:
      'Education plus progressive glute strengthening beat a steroid injection in the LEAP trial (77% vs 58% better at 8 weeks). Avoid squeezing the tendons: don’t cross your legs or hang on one hip, and sleep with a pillow between your knees.',
    check: 'The pain spreads into the groin or you start to limp.',
  },
  quadStrain: {
    name: 'Quadriceps strain',
    aka: 'thigh strain',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'A sudden sharp or pulling pain in the front of the thigh during a sprint, strides or a kick, then tenderness at one spot and sometimes bruising.',
    why: 'A muscle tear, usually during fast running when the muscle is tired or not warmed up.',
    helps: 'A few days of relative rest, then progressive strengthening and a graded return to faster running.',
    check: 'You felt a pop, there is a dent in the muscle, or you can’t lift the leg.',
  },
  hamstringStrain: {
    name: 'Hamstring strain',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'A sudden sharp or pulling pain in the back of the thigh during a sprint, strides or a fast finish, sometimes with a pop. Tender at one spot, bruising after a day or two.',
    why: 'The muscle tears while braking the swinging leg at speed. Fatigue, a previous strain and little fast running in training raise the risk.',
    helps:
      'Start gentle loading within days and progress to heavier and faster work. The Nordic hamstring exercise halves the rate of hamstring injuries.',
    check: 'You felt a pop high up near the sit bone, there is a large bruise, or you can’t walk normally — the tendon may have torn off the bone.',
  },
  proximalHamstring: {
    name: 'Proximal hamstring tendinopathy',
    aka: 'high hamstring pain',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'A deep ache at the sit bone, low in the buttock. Sitting on hard chairs, driving, uphill running, speed work and long strides make it worse; it may ease once warm but is sorer afterwards.',
    why: 'The hamstring tendon is overloaded and compressed against the sit bone — typically after adding hills or speed.',
    helps:
      'Cut hills and speed, sit on a cushion and skip hamstring stretches, which compress the tendon. Start with holds and progress to heavier hamstring strengthening.',
    check: 'It started with a sudden pop, or the leg feels numb or weak.',
  },
  deepGluteal: {
    name: 'Deep gluteal syndrome',
    aka: 'piriformis syndrome',
    likelihood: 'rare',
    care: 'self',
    feels:
      'Deep buttock pain, worse after sitting a while, that may spread down the back of the thigh like sciatica, with tingling.',
    why: 'The sciatic nerve is irritated where it passes the deep hip muscles in the buttock. The lower back causes the same pattern far more often, so it is ruled out first.',
    helps: 'Break up long sitting, keep moving, and see a physiotherapist for nerve and hip-muscle work.',
    check: 'Numbness or weakness is getting worse.',
  },

  // ---------- Back and trunk ----------
  lowBackPain: {
    name: 'Non-specific low back pain',
    likelihood: 'common',
    care: 'self',
    feels:
      'An ache or stiffness across the lower back, sometimes one-sided, that changes with position and activity, without pain shooting below the knee.',
    why: 'Usually no single structural cause. Running doesn’t make it more likely: back pain is less common in runners, and runners’ spinal discs are better hydrated than non-runners’.',
    helps:
      'Keep moving — easy running and walking are usually fine and likely help. Add trunk and hip strength work; avoid long bed rest.',
    check:
      'The pain is constant and worse at night, comes with fever or weight loss, or followed a fall — or, in a teenager, gets worse leaning backwards (a spine stress fracture).',
  },
  sciatica: {
    name: 'Pain referred from the lower back',
    aka: 'sciatica',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'Pain that travels from the lower back or buttock down the back of the thigh, sometimes past the knee, with tingling, numbness or weakness. Bending, sitting or coughing can set it off.',
    why: 'An irritated nerve root in the lower spine: the leg hurts, but the source is the back.',
    helps: 'Most cases settle within weeks. Stay active — walk, and run if it is tolerable — and see a physiotherapist.',
    check:
      'Numbness around the groin or buttocks, new bladder or bowel trouble, or weakness in both legs is an emergency — get help straight away.',
  },
  stitch: {
    name: 'Side stitch',
    aka: 'exercise-related transient abdominal pain',
    likelihood: 'common',
    care: 'self',
    stat: 'About 70% of runners get one in a year',
    feels:
      'A sharp, well-localised pain just under the ribs on one side, sometimes with pain at the tip of the shoulder. Worse at speed and downhill; gone within minutes of stopping.',
    why: 'Most likely irritation of the lining of the abdominal wall. Eating or drinking a lot — especially sugary drinks — in the 2–3 hours before a run raises the risk, and it is commoner in younger runners.',
    helps:
      'Avoid big meals and large sugary drinks before running. When it strikes, slow down, breathe deeply, push firmly on the spot and bend forward, or tighten your stomach muscles.',
    check: 'The pain continues after you stop, keeps getting worse, or comes with fever, vomiting or blood — that isn’t a stitch.',
  },
  nippleChafing: {
    name: 'Runner’s nipple',
    aka: 'chafing',
    likelihood: 'common',
    care: 'self',
    feels:
      'Stinging, raw and sometimes bleeding nipples after a long run. Commoner with high mileage and cotton shirts.',
    why: 'Hours of the shirt rubbing over sweaty skin.',
    helps:
      'Cover them with plasters or tape, or use a lubricant, and wear a technical (non-cotton) shirt or a well-fitting sports bra.',
    check: 'There are signs of infection, or a discharge or lump that has nothing to do with running.',
  },
  cardiac: {
    name: 'Heart-related chest pain',
    aka: 'a warning sign, not an injury',
    likelihood: 'rare',
    care: 'urgent',
    feels:
      'Pressure, tightness, squeezing or pain in the chest while running, possibly spreading to the arm, jaw, neck or back, with breathlessness, dizziness, palpitations or fainting.',
    why: 'It can mean the heart muscle isn’t getting enough blood, or an inherited heart condition. Cardiac arrest in races is rare — about 1 in 185,000 half- and full-marathon runners — but chest symptoms must never be run through.',
    helps: 'Stop running. Don’t try to finish the run or the race.',
    check: 'Call emergency services now. If it has already passed, still see a doctor before you run again.',
  },

  // ---------- Ankle and Achilles ----------
  achilles: {
    name: 'Achilles tendinopathy',
    aka: 'mid-portion',
    likelihood: 'common',
    care: 'self',
    stat: 'The most common new running injury: 10.3%',
    feels:
      'Pain and stiffness in the tendon 2–6 cm above the heel. Stiff first steps in the morning and at the start of a run, easing as you warm up, worse later or the next day. The tendon may feel thickened and tender to pinch.',
    why: 'Tendon overload — more mileage, hills or speed than the tendon has adapted to, especially with weaker calves. It gets more common with age.',
    helps:
      'Progressive calf and tendon loading (heel raises, getting heavier) for at least 12 weeks has the strongest evidence. You can usually keep running if the pain stays at or below 5 out of 10 and has settled by the next morning.',
    check: 'You felt a sudden snap, as if kicked in the heel, and can’t rise onto your toes — a possible rupture: see a doctor the same day.',
  },
  insertionalAchilles: {
    name: 'Insertional Achilles tendinopathy',
    aka: 'often with heel bursitis',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'Pain at the back of the heel where the Achilles attaches, often with a bony bump that rubs on the shoe’s heel counter. Uphill running and calf stretches make it worse.',
    why: 'The tendon is squeezed against the heel bone whenever the ankle bends up, on top of the usual tendon overload.',
    helps:
      'Heel lifts and shoes with a soft, low heel counter. Skip calf stretches off a step and don’t drop the heel below floor level; strengthen with heel raises on flat ground.',
    check: 'Sudden pain with a snap, or you can’t rise onto your toes.',
  },
  ankleSprain: {
    name: 'Lateral ankle sprain',
    aka: 'rolled ankle',
    likelihood: 'common',
    care: 'self',
    stat: '5.8% of new running injuries',
    feels:
      'Sudden pain on the outside of the ankle after rolling the foot inwards — on a trail, kerb or pothole — followed by swelling and often bruising.',
    why: 'The outer ankle ligaments are overstretched or torn. A previous sprain is the biggest risk factor for the next one.',
    helps:
      'Protect it for a few days but start moving and walking early, with a brace for the return to running. Balance and strength training roughly halves the chance of spraining it again.',
    check:
      'You can’t take four steps, or the bone is tender at the back edge or tip of either ankle bone or at the base of the little-toe bone (the Ottawa ankle rules) — get an X-ray.',
  },
  peroneal: {
    name: 'Peroneal tendinopathy',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'An ache, sometimes with swelling, behind and below the outer ankle bone along the tendons to the outside of the foot. Worse on cambered roads and uneven trails.',
    why: 'Overload of the tendons that steady the outside of the ankle — common after sprains, in unstable ankles and in high-arched feet.',
    helps:
      'Cut back on camber and trails for a while and strengthen the ankle — turning the foot outwards against a band — plus balance work.',
    check: 'The tendon snaps or clicks over the ankle bone, or the swelling persists.',
  },
  tibialisPosterior: {
    name: 'Tibialis posterior tendinopathy',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'Pain, sometimes with swelling, behind and below the inner ankle bone, running on into the arch. A single-leg heel raise is weak or painful, and over time the arch may flatten.',
    why: 'Overload of the tendon that holds up the arch — linked to rapid training increases and flat, mobile feet.',
    helps:
      'Reduce the running load, use arch support or orthoses for a while, and strengthen the tendon progressively with heel raises and resisted turning-in of the foot.',
    check: 'The arch is visibly collapsing or you can no longer rise onto the toes of that foot.',
  },

  // ---------- Foot ----------
  plantarHeel: {
    name: 'Plantar heel pain',
    aka: 'plantar fasciitis',
    likelihood: 'common',
    care: 'self',
    stat: '6.1% of new running injuries',
    feels:
      'Sharp pain under the inner front of the heel with the first steps in the morning or after sitting. It eases once you get going, then returns after long standing or at the end of the day.',
    why: 'Overload of the thick band along the sole (the plantar fascia) where it attaches to the heel. Linked to sudden mileage increases, tight calves, a higher BMI and long hours on your feet.',
    helps:
      'Calf and plantar-fascia stretches, foot and ankle strengthening, taping and supportive shoes or inserts all have guideline support. It is slow, but most people recover within a year.',
    check: 'The whole heel hurts and squeezing it from both sides is painful (a possible stress fracture), or there is numbness or tingling.',
  },
  heelStressFracture: {
    name: 'Heel bone stress fracture',
    aka: 'calcaneal stress fracture',
    likelihood: 'rare',
    care: 'doctor',
    feels:
      'Heel pain that gets worse as you run rather than easing, and pain when the heel is squeezed from both sides.',
    why: 'Repetitive impact on the heel bone, often after a quick mileage increase or when under-fuelled.',
    helps: 'Stop running and get it assessed. It usually heals with a period of protected walking and a gradual return.',
    check: 'See a doctor before you run on it again.',
  },
  fatPad: {
    name: 'Heel fat pad syndrome',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'A deep, bruise-like ache in the centre of the heel, worse barefoot on hard floors and when landing on the heel — without the first-step pattern of plantar heel pain.',
    why: 'The cushioning fat pad under the heel is bruised or has thinned, which it does with age.',
    helps: 'Cushioned shoes, a heel cup, taping that gathers the pad under the heel, and softer surfaces for a while.',
    check: 'It lasts beyond 6 weeks despite the extra cushioning.',
  },
  navicularStressFracture: {
    name: 'Navicular stress fracture',
    likelihood: 'rare',
    care: 'doctor',
    feels:
      'A vague ache across the top and inner side of the midfoot that worsens with running and is hard to pin down. The bone on top of the midfoot is tender to press.',
    why: 'A high-risk stress fracture: the navicular has a poor blood supply, so it heals slowly and often only shows up on CT or MRI.',
    helps: 'Stop running and see a sports doctor. The usual treatment is about 6 weeks in a non-weight-bearing cast or boot.',
    check: 'See a doctor before you run on it again.',
  },
  metatarsalStressFracture: {
    name: 'Metatarsal stress fracture',
    aka: 'march fracture',
    likelihood: 'occasional',
    care: 'doctor',
    feels:
      'Pain on the top of the forefoot, usually over the 2nd or 3rd toe bone, with swelling and a tender spot on the bone. It builds with each run and can hurt when walking.',
    why: 'Repetitive loading of a long, thin bone, often after a jump in mileage, new shoes, a new surface or under-fuelling.',
    helps:
      'Stop running and get it assessed. Most heal in 4–8 weeks in a stiff shoe or boot. The outer (5th) metatarsal is a high-risk site.',
    check: 'See a doctor before you run on it again.',
  },
  extensorTendinopathy: {
    name: 'Extensor tendinopathy',
    aka: 'lace pressure',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'An ache along the tendons on the top of the foot, right under the laces, sometimes with a little swelling. Lifting the toes against resistance hurts.',
    why: 'Compression from tight laces or a stiff tongue — often after new shoes — or tight calves making the tendons work harder.',
    helps: 'Loosen the laces or skip the eyelets over the sore spot, pad the tongue, and ease back for a few days.',
    check: 'There is marked swelling or a tender spot on a bone — that could be a stress fracture instead.',
  },
  metatarsalgia: {
    name: 'Metatarsalgia',
    aka: 'ball-of-foot pain',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'An aching, bruised feeling under the ball of the foot, behind the 2nd to 4th toes, worse barefoot on hard floors and when running fast or on your toes.',
    why: 'Too much pressure through the ends of the long foot bones — linked to high or stiff arches, thin cushioning and tight calves.',
    helps: 'A metatarsal pad placed just behind the sore area, more cushioned shoes, calf stretches and toe-strength work.',
    check: 'One bone is tender to press on top, or the foot swells — rule out a stress fracture.',
  },
  morton: {
    name: 'Morton’s neuroma',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'Burning, electric or numb feelings between two toes — usually the 3rd and 4th — and the sense of a pebble in the shoe. Tight, narrow shoes bring it on; taking the shoe off and rubbing the foot relieves it.',
    why: 'A thickened, irritated nerve squeezed between the ends of two foot bones.',
    helps: 'Shoes with a wider toe box, looser forefoot lacing and a metatarsal pad behind the sore spot. Injections or surgery only if that fails.',
    check: 'The numbness stays after running or keeps spreading.',
  },
  sesamoiditis: {
    name: 'Sesamoiditis',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'Pain under the big toe joint on the ball of the foot when pushing off, running on your toes or bending the big toe upwards.',
    why: 'Two small bones inside the tendon under the big toe take much of the load at push-off; hills, speed work and thin shoes overload them.',
    helps: 'Offload the spot with a pad cut out around it, wear stiffer-soled shoes, and cut speed and hill work for a while.',
    check: 'It hasn’t eased in 2–3 weeks or is sharply painful to press — a sesamoid stress fracture needs imaging.',
  },
  bigToeArthritis: {
    name: 'Big toe arthritis',
    aka: 'hallux rigidus',
    likelihood: 'occasional',
    care: 'self',
    feels:
      'Pain and stiffness in the big toe joint itself, often a bony bump on top, and a toe that won’t bend up far — noticed at push-off and uphill.',
    why: 'Wear of the joint cartilage, usually from middle age.',
    helps: 'Stiffer or rocker-soled shoes reduce how far the joint bends; a physio or podiatrist can add mobility work and inserts.',
    check: 'The joint turns suddenly red, hot and swollen — that can be gout.',
  },
  blackToenail: {
    name: 'Black toenail',
    aka: 'runner’s toe',
    likelihood: 'common',
    care: 'self',
    feels:
      'A toenail — usually the big or second toe — turns purple-black after a long or downhill run. It throbs while fresh and is painless later; it may fall off and regrow over months.',
    why: 'The toe repeatedly hits the front of the shoe and bleeds under the nail.',
    helps:
      'Shoes with a thumb’s width of room at the front, heel-lock lacing to stop the foot sliding forward, and short-trimmed nails. A painless black nail can be left alone.',
    check: 'The throbbing is severe (the blood can be released), it looks infected, or a dark streak appears without any injury — have that checked for skin cancer.',
  },
  blisters: {
    name: 'Friction blisters',
    likelihood: 'common',
    care: 'self',
    feels:
      'A stinging hot spot that becomes a fluid-filled bubble, typically on the toes, heel or ball of the foot.',
    why: 'Friction and shear between skin, sock and shoe, made worse by moisture — one of the commonest skin injuries at marathons.',
    helps:
      'Moisture-wicking synthetic socks, well-fitting shoes, and lubricant or tape on known hot spots. Leave small blisters intact; drain big ones with a sterile needle and keep the roof on.',
    check: 'Redness spreads, or pus or red streaks appear — especially if you have diabetes.',
  },
} satisfies Record<string, Cause>

export type CauseId = keyof typeof CAUSE_DATA

export const CAUSES: Record<CauseId, Cause> = CAUSE_DATA

interface SpotData {
  id: string
  /** Spot name as a heading: "Outside of the knee". */
  name: string
  /** Short name for the map tooltip and chips. */
  short: string
  /** One line pinning down where exactly the spot is. */
  where: string
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
    name: 'Chest',
    short: 'Chest',
    where: 'The breastbone and nipples.',
    views: ['front'],
    causes: ['nippleChafing', 'cardiac'],
    nearby: ['side-stitch'],
  },
  {
    id: 'side-stitch',
    name: 'Side of the belly',
    short: 'Side of belly',
    where: 'Just below the ribs, on one side of the abdomen.',
    views: ['front'],
    causes: ['stitch'],
    nearby: ['chest', 'groin'],
  },
  {
    id: 'lower-back',
    name: 'Lower back',
    short: 'Lower back',
    where: 'Across the lower back, above the buttocks.',
    views: ['back'],
    causes: ['lowBackPain', 'sciatica'],
    nearby: ['buttock', 'outer-hip'],
  },
  {
    id: 'groin',
    name: 'Groin and front of the hip',
    short: 'Groin / front of hip',
    where: 'The crease where the thigh meets the body, and the inner groin.',
    views: ['front'],
    causes: ['hipFlexor', 'hipJoint', 'adductor', 'femoralNeckStressFracture'],
    nearby: ['outer-hip', 'front-thigh', 'side-stitch'],
  },
  {
    id: 'outer-hip',
    name: 'Outside of the hip',
    short: 'Outer hip',
    where: 'The bony point on the side of the hip.',
    views: ['front', 'back'],
    causes: ['glutealTendinopathy', 'sciatica'],
    nearby: ['buttock', 'groin', 'lower-back'],
  },
  {
    id: 'buttock',
    name: 'Buttock',
    short: 'Buttock',
    where: 'Deep in the middle of the buttock.',
    views: ['back'],
    causes: ['sciatica', 'deepGluteal', 'proximalHamstring'],
    nearby: ['sit-bone', 'lower-back', 'outer-hip'],
  },
  {
    id: 'sit-bone',
    name: 'Sit bone',
    short: 'Sit bone',
    where: 'Low in the buttock, the bone you sit on.',
    views: ['back'],
    causes: ['proximalHamstring', 'hamstringStrain', 'sciatica'],
    nearby: ['buttock', 'back-thigh'],
  },
  {
    id: 'front-thigh',
    name: 'Front of the thigh',
    short: 'Front of thigh',
    where: 'The quadriceps, between hip and knee.',
    views: ['front'],
    causes: ['doms', 'quadStrain', 'hipFlexor'],
    nearby: ['groin', 'front-knee'],
  },
  {
    id: 'back-thigh',
    name: 'Back of the thigh',
    short: 'Back of thigh',
    where: 'The hamstrings, between buttock and knee.',
    views: ['back'],
    causes: ['hamstringStrain', 'doms', 'cramp', 'sciatica'],
    nearby: ['sit-bone', 'calf'],
  },
  {
    id: 'front-knee',
    name: 'Front of the knee',
    short: 'Front of knee',
    where: 'Around, behind or just below the kneecap.',
    views: ['front'],
    causes: ['pfp', 'patellarTendinopathy'],
    nearby: ['outer-knee', 'inner-knee', 'front-thigh'],
  },
  {
    id: 'outer-knee',
    name: 'Outside of the knee',
    short: 'Outer knee',
    where: 'The outer side of the knee joint.',
    views: ['front'],
    causes: ['itbs', 'meniscus'],
    nearby: ['front-knee', 'inner-knee', 'outer-shin'],
  },
  {
    id: 'inner-knee',
    name: 'Inside of the knee',
    short: 'Inner knee',
    where: 'The inner side of the knee joint and just below it.',
    views: ['front'],
    causes: ['pfp', 'pesAnserine', 'meniscus'],
    nearby: ['front-knee', 'outer-knee', 'inner-shin'],
  },
  {
    id: 'inner-shin',
    name: 'Inner edge of the shin',
    short: 'Inner shin',
    where: 'Along the inner border of the shin bone, lower two-thirds.',
    views: ['front'],
    causes: ['mtss', 'tibialStressFracture', 'tibialisPosterior'],
    nearby: ['outer-shin', 'calf', 'inner-ankle'],
  },
  {
    id: 'outer-shin',
    name: 'Front and outside of the shin',
    short: 'Front / outer shin',
    where: 'The muscle beside the sharp front edge of the shin, and the edge itself.',
    views: ['front'],
    causes: ['cecs', 'anteriorTibialStressFracture'],
    nearby: ['inner-shin', 'outer-ankle', 'outer-knee'],
  },
  {
    id: 'calf',
    name: 'Calf',
    short: 'Calf',
    where: 'The muscle at the back of the lower leg.',
    views: ['back'],
    causes: ['calfStrain', 'cramp', 'doms', 'cecs', 'dvt'],
    nearby: ['achilles', 'back-thigh', 'inner-shin'],
  },
  {
    id: 'achilles',
    name: 'Achilles tendon',
    short: 'Achilles',
    where: 'The cord at the back of the ankle, 2–6 cm above the heel.',
    views: ['back'],
    causes: ['achilles', 'calfStrain', 'insertionalAchilles'],
    nearby: ['back-heel', 'calf'],
  },
  {
    id: 'back-heel',
    name: 'Back of the heel',
    short: 'Back of heel',
    where: 'Where the Achilles tendon attaches to the heel bone.',
    views: ['back'],
    causes: ['insertionalAchilles', 'heelStressFracture'],
    nearby: ['achilles', 'heel'],
  },
  {
    id: 'outer-ankle',
    name: 'Outside of the ankle',
    short: 'Outer ankle',
    where: 'Around and below the outer ankle bone.',
    views: ['front'],
    causes: ['ankleSprain', 'peroneal'],
    nearby: ['inner-ankle', 'top-of-foot', 'outer-shin'],
  },
  {
    id: 'inner-ankle',
    name: 'Inside of the ankle',
    short: 'Inner ankle',
    where: 'Around and below the inner ankle bone.',
    views: ['front'],
    causes: ['tibialisPosterior', 'navicularStressFracture'],
    nearby: ['outer-ankle', 'arch', 'inner-shin'],
  },
  {
    id: 'top-of-foot',
    name: 'Top of the foot',
    short: 'Top of foot',
    where: 'The top of the midfoot and forefoot, under the laces.',
    views: ['front'],
    causes: ['extensorTendinopathy', 'metatarsalStressFracture', 'navicularStressFracture'],
    nearby: ['outer-ankle', 'inner-ankle', 'ball-of-foot'],
  },
  {
    id: 'toes',
    name: 'Toes',
    short: 'Toes',
    where: 'The toes and toenails.',
    views: ['sole'],
    causes: ['blisters', 'blackToenail', 'morton'],
    nearby: ['ball-of-foot', 'big-toe-joint'],
  },
  {
    id: 'big-toe-joint',
    name: 'Under the big toe joint',
    short: 'Big toe joint',
    where: 'The ball of the foot behind the big toe.',
    views: ['sole'],
    causes: ['sesamoiditis', 'bigToeArthritis', 'blisters'],
    nearby: ['ball-of-foot', 'toes', 'arch'],
  },
  {
    id: 'ball-of-foot',
    name: 'Ball of the foot',
    short: 'Ball of foot',
    where: 'Under the forefoot, behind the 2nd to 5th toes.',
    views: ['sole'],
    causes: ['metatarsalgia', 'morton', 'metatarsalStressFracture', 'blisters'],
    nearby: ['big-toe-joint', 'toes', 'top-of-foot'],
  },
  {
    id: 'arch',
    name: 'Arch of the foot',
    short: 'Arch',
    where: 'The inner, raised middle of the sole.',
    views: ['sole'],
    causes: ['plantarHeel', 'tibialisPosterior', 'navicularStressFracture'],
    nearby: ['heel', 'inner-ankle', 'big-toe-joint'],
  },
  {
    id: 'heel',
    name: 'Bottom of the heel',
    short: 'Heel',
    where: 'The underside of the heel.',
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

export const VIEWS: { id: BodyView; label: string; caption: string }[] = [
  { id: 'front', label: 'Front', caption: 'Front of the body, facing you' },
  { id: 'back', label: 'Back', caption: 'Back of the body' },
  { id: 'sole', label: 'Sole', caption: 'Sole of either foot' },
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
export const RED_FLAGS: { urgent: boolean; message: string }[] = [
  {
    urgent: true,
    message: 'Chest pain or pressure, fainting or sudden breathlessness while running: stop and call emergency services.',
  },
  { urgent: false, message: 'You can’t put weight on the leg or walk normally.' },
  { urgent: false, message: 'A fingertip-sized spot on a bone hurts to press, or hopping on the leg hurts.' },
  { urgent: false, message: 'Pain at rest or at night, or pain that gets worse run after run.' },
  { urgent: false, message: 'Swelling, warmth or redness — above all of one calf — or a fever.' },
  { urgent: false, message: 'Numbness, tingling or weakness.' },
  { urgent: false, message: 'A pop or snap followed by pain and loss of function.' },
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
