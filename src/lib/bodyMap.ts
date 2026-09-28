import type { BodyView, SpotId } from './painMap'
import type { Message } from './i18n.svelte'
import { m } from '../paraglide/messages.js'

/**
 * Geometry of the pain map drawings: a front and a back view of a runner and
 * the sole of a foot, all in one 200 × 490 coordinate space so the three
 * views share a frame (and the page does not jump when switching them).
 *
 * Outlines are lists of points smoothed into curves (Catmull-Rom), drawn once
 * for the right-hand side and mirrored across the centre line. Proportions
 * follow standard anthropometric ratios of stature (chin ≈ 0.87, shoulder ≈
 * 0.82, crotch ≈ 0.47, knee ≈ 0.285, ankle ≈ 0.04 of height).
 *
 * Pure data and string building: no DOM, rendered by BodyMap.svelte.
 */

export const WIDTH = 200
export const HEIGHT = 490
const MID = WIDTH / 2

type Pt = readonly [number, number]

/** A tappable area: an ellipse over the spot, with the dot marking it. */
export interface Zone {
  /** Stable key for keyed rendering. */
  key: string
  spot: SpotId
  cx: number
  cy: number
  rx: number
  ry: number
  /** Degrees, clockwise. */
  rotate: number
  dot: Pt
  /**
   * One zone per spot takes keyboard focus; its mirror image on the other
   * limb is pointer-only, so tabbing visits each spot once.
   */
  primary: boolean
}

export interface Figure {
  /** Closed body parts; overlapping parts merge into one silhouette. */
  parts: string[]
  /** Hair: the front shows a hairline (a face), the back the whole head. */
  hair: string
  /** Anatomical hints: kneecaps, spine, creases — strokes, no fill. */
  details: string[]
  labels: { x: number; y: number; rotate: number; text: Message }[]
  zones: Zone[]
}

const round = (v: number) => Math.round(v * 10) / 10

function mirrorPts(points: readonly Pt[]): Pt[] {
  return points.map(([x, y]) => [2 * MID - x, y] as const)
}

/** Closed Catmull-Rom spline through the points, written as cubic Béziers. */
function smooth(points: readonly Pt[]): string {
  const n = points.length
  let d = `M${round(points[0][0])} ${round(points[0][1])}`
  for (let i = 0; i < n; i++) {
    const [x0, y0] = points[(i - 1 + n) % n]
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % n]
    const [x3, y3] = points[(i + 2) % n]
    d +=
      `C${round(x1 + (x2 - x0) / 6)} ${round(y1 + (y2 - y0) / 6)} ` +
      `${round(x2 - (x3 - x1) / 6)} ${round(y2 - (y3 - y1) / 6)} ${round(x2)} ${round(y2)}`
  }
  return `${d}Z`
}

/** A symmetric outline from its right half, listed from centre line to centre line. */
function symmetric(rightHalf: readonly Pt[]): string {
  return smooth([...rightHalf, ...mirrorPts(rightHalf.slice(1, -1)).reverse()])
}

function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`
}

/** Mirror an SVG path made only of absolute M/L/Q/C commands (no arcs). */
function mirrorPath(d: string): string {
  return d.replace(/([MLQC])([^MLQCZ]*)/g, (_, cmd: string, args: string) => {
    const nums = args.trim().split(/[\s,]+/).map(Number)
    return cmd + nums.map((v, i) => (i % 2 === 0 ? round(2 * MID - v) : v)).join(' ')
  })
}

/** A part drawn on the right and mirrored to the left. */
const both = (d: string) => [d, mirrorPath(d)]

// ---------- Shared silhouette (front and back are the same outline) ----------

const HEAD = ellipse(MID, 37, 20, 28)
const EARS = [ellipse(80, 40, 3.5, 7), ellipse(120, 40, 3.5, 7)]

const TORSO = symmetric([
  [100, 60],
  [110, 62],
  [111, 80],
  [116, 86],
  [130, 88],
  [142, 90],
  [150, 95],
  [154, 104],
  [153, 113],
  [143, 120],
  [141, 132],
  [139, 150],
  [134, 168],
  [131, 182],
  [134, 198],
  [140, 214],
  [142, 230],
  [140, 244],
  [122, 252],
  [100, 256],
])

const ARM: Pt[] = [
  [140, 100],
  [150, 99],
  [156, 106],
  [159, 118],
  [161, 140],
  [162, 162],
  [163, 178],
  [167, 196],
  [169, 222],
  [168, 246],
  [159, 248],
  [156, 226],
  [152, 202],
  [148, 182],
  [145, 160],
  [142, 128],
]

const HAND: Pt[] = [
  [159, 246],
  [168.5, 245],
  [171, 257],
  [171.5, 273],
  [169, 287],
  [164.5, 294],
  [159.5, 291],
  [157, 277],
  [157, 259],
]

const LEG: Pt[] = [
  // Outer contour, hip to ankle.
  [126, 206],
  [141, 226],
  [142, 244],
  [140, 268],
  [138, 294],
  [135, 318],
  [133, 332],
  [133.5, 344],
  [132, 356],
  [135, 378],
  [134, 400],
  [130, 424],
  [127, 446],
  [128.5, 456],
  [126, 464],
  // Inner contour, ankle back up to the crotch.
  [112, 464],
  [110.5, 452],
  [112, 442],
  [111, 420],
  [108, 396],
  [106.5, 380],
  [108.5, 360],
  [108, 346],
  [106.5, 330],
  [104.5, 306],
  [102, 280],
  [100.8, 260],
  [104, 236],
  [112, 214],
]

const FOOT: Pt[] = [
  [112, 457],
  [127, 456],
  [132, 462],
  [137, 470],
  [138, 477],
  [133, 482],
  [121, 483],
  [112, 481],
  [107, 475],
  [107, 465],
]

const HEEL: Pt[] = [
  [111, 456],
  [127, 456],
  [129, 466],
  [127, 476],
  [120, 481],
  [113, 479],
  [109, 470],
]

const limbs = (end: Pt[]) =>
  [ARM, HAND, LEG, end].flatMap((pts) => [smooth(pts), smooth(mirrorPts(pts))])

// ---------- Zones ----------

interface ZoneSpec {
  spot: SpotId
  cx: number
  cy: number
  rx: number
  ry: number
  rotate?: number
  /** Dot position when not the ellipse centre. */
  dot?: Pt
  /** Drawn on the right limb and mirrored onto the left. */
  pair?: boolean
}

/**
 * Expand specs into zones: primaries first (left-hand copies of pairs, in
 * spec order, so keyboard focus reads top to bottom), then the mirrors.
 */
function zones(view: BodyView, specs: ZoneSpec[]): Zone[] {
  const primaries: Zone[] = []
  const mirrors: Zone[] = []
  for (const s of specs) {
    const dot = s.dot ?? ([s.cx, s.cy] as const)
    const right: Zone = {
      key: `${view}-${s.spot}-r`,
      spot: s.spot,
      cx: s.cx,
      cy: s.cy,
      rx: s.rx,
      ry: s.ry,
      rotate: s.rotate ?? 0,
      dot,
      primary: !s.pair,
    }
    if (!s.pair) {
      primaries.push(right)
      continue
    }
    primaries.push({
      ...right,
      key: `${view}-${s.spot}-l`,
      cx: 2 * MID - s.cx,
      rotate: -right.rotate,
      dot: [2 * MID - dot[0], dot[1]],
      primary: true,
    })
    mirrors.push(right)
  }
  return [...primaries, ...mirrors]
}

// ---------- The three views ----------

export const FIGURES: Record<BodyView, Figure> = {
  front: {
    parts: [HEAD, ...EARS, TORSO, ...limbs(FOOT)],
    hair: 'M80 36C79 14 91 8 100 8C109 8 121 14 120 36C116 24 108 20 100 20C92 20 84 24 80 36Z',
    details: [
      ...both('M112 88Q124 84 140 91'), // collarbones
      ...both('M101 127Q118 140 138 124'), // chest
      'M100 140V184', // midline
      ellipse(MID, 195, 1.4, 1.8), // navel
      ...both('M130 214Q118 236 104 250'), // hip crease
      ellipse(120.5, 340, 6.5, 8.5), // kneecaps
      ellipse(2 * MID - 120.5, 340, 6.5, 8.5),
      ...both('M121 358Q120 400 119.5 440'), // shin bone
    ],
    labels: [],
    zones: zones('front', [
      { spot: 'chest', cx: 100, cy: 132, rx: 34, ry: 16 },
      { spot: 'side-stitch', cx: 124, cy: 170, rx: 10, ry: 12, pair: true },
      { spot: 'groin', cx: 117, cy: 236, rx: 13, ry: 7, rotate: -45, pair: true },
      { spot: 'outer-hip', cx: 142, cy: 228, rx: 7, ry: 12, pair: true },
      { spot: 'front-thigh', cx: 121, cy: 290, rx: 14, ry: 26, pair: true },
      { spot: 'front-knee', cx: 120.5, cy: 344, rx: 8, ry: 13, pair: true },
      { spot: 'outer-knee', cx: 134, cy: 344, rx: 6, ry: 10, pair: true },
      { spot: 'inner-knee', cx: 107.5, cy: 350, rx: 6, ry: 10, pair: true },
      { spot: 'inner-shin', cx: 111.5, cy: 404, rx: 5.5, ry: 26, pair: true },
      { spot: 'outer-shin', cx: 126, cy: 392, rx: 6.5, ry: 24, pair: true },
      { spot: 'inner-ankle', cx: 110.5, cy: 451, rx: 6, ry: 6, pair: true },
      { spot: 'outer-ankle', cx: 129, cy: 456, rx: 6, ry: 6, pair: true },
      { spot: 'top-of-foot', cx: 123, cy: 469, rx: 11, ry: 6, pair: true },
    ]),
  },

  back: {
    parts: [HEAD, ...EARS, TORSO, ...limbs(HEEL)],
    hair: 'M80 40C79 14 90 8 100 8C110 8 121 14 120 40C120 54 112 62 100 62C88 62 80 54 80 40Z',
    details: [
      'M100 88V204', // spine
      ...both('M112 104Q130 100 132 116Q128 134 114 140'), // shoulder blades
      'M100 212V250', // cleft
      ...both('M101 254Q118 262 136 250'), // buttock creases
      ...both('M110 346Q120 350 131 346'), // back of the knee
      ...both('M117 420Q118.5 440 118 456'), // Achilles tendon
      ...both('M122 420Q120.5 440 121 456'),
    ],
    labels: [],
    zones: zones('back', [
      { spot: 'lower-back', cx: 100, cy: 192, rx: 26, ry: 13 },
      { spot: 'buttock', cx: 119, cy: 228, rx: 14, ry: 13, pair: true },
      { spot: 'outer-hip', cx: 142, cy: 228, rx: 7, ry: 12, pair: true },
      { spot: 'sit-bone', cx: 111, cy: 252, rx: 8, ry: 6, pair: true },
      { spot: 'back-thigh', cx: 121, cy: 294, rx: 14, ry: 25, pair: true },
      { spot: 'calf', cx: 121, cy: 384, rx: 13, ry: 22, pair: true },
      { spot: 'achilles', cx: 119.5, cy: 434, rx: 5.5, ry: 13, pair: true },
      { spot: 'back-heel', cx: 119.5, cy: 467, rx: 9, ry: 9, pair: true },
    ]),
  },

  // One large sole, inner (big-toe) edge on the left: either foot, seen from below.
  sole: {
    parts: [
      smooth([
        [46, 150],
        [52, 126],
        [72, 104],
        [100, 94],
        [126, 100],
        [146, 112],
        [160, 126],
        [168, 152],
        [164, 190],
        [157, 240],
        [152, 290],
        [152, 340],
        [154, 385],
        [148, 425],
        [132, 452],
        [108, 461],
        [84, 454],
        [68, 430],
        [62, 390],
        [66, 345],
        [78, 300],
        [78, 255],
        [66, 212],
        [52, 180],
      ]),
      ellipse(66, 88, 17, 27),
      ellipse(99, 80, 10, 21),
      ellipse(122, 86, 9.5, 18),
      ellipse(142, 100, 9, 16),
      ellipse(159.5, 118, 8, 13),
    ],
    hair: '',
    details: [
      'M50 166Q104 184 164 166', // ball of the foot
      'M80 222Q94 276 80 334', // arch
      ellipse(108, 404, 30, 34), // heel pad
    ],
    labels: [
      { x: 24, y: 290, rotate: -90, text: m.pain_sole_inner_edge },
      { x: 180, y: 290, rotate: 90, text: m.pain_sole_outer_edge },
    ],
    zones: zones('sole', [
      { spot: 'toes', cx: 108, cy: 82, rx: 68, ry: 32, rotate: 12, dot: [100, 66] },
      { spot: 'big-toe-joint', cx: 62, cy: 140, rx: 18, ry: 17 },
      { spot: 'ball-of-foot', cx: 120, cy: 144, rx: 38, ry: 18, rotate: 10 },
      { spot: 'arch', cx: 96, cy: 268, rx: 30, ry: 52 },
      { spot: 'heel', cx: 108, cy: 402, rx: 38, ry: 44 },
    ]),
  },
}
