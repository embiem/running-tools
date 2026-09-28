#!/usr/bin/env node
// Renders every page and state of a built app to snapshots: a full-page PNG
// per viewport and a text dump (visible text with every <details> opened, plus
// aria-labels, titles, placeholders and <option>s), so a change that must not
// alter what the app shows — a refactor, the i18n framework, a new language
// that must leave English alone — can be checked against a baseline.
//
// Serves an already-built dist/ (run `npm run build` first), blocks every
// request that leaves localhost (YouTube thumbnails would make screenshots
// flaky) and freezes CSS animations. The browser's language comes from
// --locale, which is also what the app detects its language from.
//
//   npm run snapshots -- --out=snapshots/before               # record
//   npm run snapshots -- --out=snapshots/after --compare=snapshots/before
//   npm run snapshots -- --locale=de-DE --out=snapshots/de    # another language
//   npm run snapshots -- --dist=some/other/dist --only=pain-  # scenarios by name prefix
//   npm run snapshots -- --mask=.topbar --ignore=.language    # leave out a deliberate change
//   npm run snapshots -- --locale=de-DE --mobile-width=320    # the narrowest phones
//
// --compare exits 1 when any text or pixel differs, and writes a diff PNG
// (differing pixels in red) next to each changed screenshot. --mask paints
// over elements in the screenshots (pass it when recording the baseline too);
// --ignore drops elements from the text dumps. Both take a CSS selector list.
// Every run also lists what sticks out sideways on the phone viewport: a page
// that scrolls horizontally, or a word wider than its box (long translated
// words are the usual culprit).
// Needs Playwright's Chromium: `npx playwright install chromium` once.
import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";

const { values: options } = parseArgs({
  strict: true,
  options: {
    dist: { type: "string", default: "dist" },
    out: { type: "string", default: "snapshots/current" },
    compare: { type: "string" },
    locale: { type: "string", default: "en-US" },
    only: { type: "string", default: "" },
    mask: { type: "string" },
    ignore: { type: "string" },
    "mobile-width": { type: "string", default: "390" },
  },
});

const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: Number(options["mobile-width"]), height: 844 },
};

/* ---------------------------------------------------------------- scenarios */

function isoDaysFromToday(days) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 12);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Each scenario is a route plus the localStorage it starts from. Inputs are
// chosen to trip the advice flags, so their wording is covered too.
const SCENARIOS = [
  { name: "home", route: "/" },
  { name: "metronome", route: "/metronome" },
  { name: "drink-default", route: "/drink-mix" },
  {
    name: "drink-marathon",
    route: "/drink-mix",
    storage: {
      "drinkMix.prefs": {
        preset: "marathon",
        durationMin: 240,
        bottleMl: 300,
        bottles: 1,
        fluidMlPerHour: 1200,
        saltSetup: "table-potassium",
        potassiumPct: 66,
      },
    },
  },
  {
    name: "drink-table",
    route: "/drink-mix",
    storage: {
      "drinkMix.prefs": {
        preset: "easy",
        durationMin: 30,
        bottleMl: 1000,
        bottles: 3,
        fluidMlPerHour: 200,
        saltSetup: "table",
        potassiumPct: 33,
      },
    },
  },
  {
    name: "drink-low-potassium",
    route: "/drink-mix",
    storage: {
      "drinkMix.prefs": {
        preset: "easy",
        durationMin: 60,
        bottleMl: 500,
        bottles: 1,
        fluidMlPerHour: 500,
        saltSetup: "table-potassium",
        potassiumPct: 2,
      },
    },
  },
  {
    name: "drink-all-potassium",
    route: "/drink-mix",
    storage: {
      "drinkMix.prefs": {
        preset: "progression",
        durationMin: 90,
        bottleMl: 500,
        bottles: 2,
        fluidMlPerHour: 650,
        saltSetup: "table-potassium",
        potassiumPct: 100,
      },
    },
  },
  { name: "race-default", route: "/race-predictor" },
  {
    name: "race-flags",
    route: "/race-predictor",
    storage: {
      "racePredictor.input": {
        raceDate: isoDaysFromToday(-120),
        distance: "custom",
        customMeters: 1000,
        time: "2:30",
        goalDistance: "marathon",
        goalCustomMeters: 21097.5,
        goalPaceSecPerKm: 200,
        split: "negative",
        unit: "mi",
      },
    },
  },
  {
    name: "race-future",
    route: "/race-predictor",
    storage: {
      "racePredictor.input": {
        raceDate: isoDaysFromToday(10),
        distance: "hm",
        customMeters: 5000,
        time: "1:45:00",
        goalDistance: "custom",
        goalCustomMeters: 100000,
        goalPaceSecPerKm: 400,
        split: "even",
        unit: "km",
      },
    },
  },
  {
    name: "race-typo",
    route: "/race-predictor",
    storage: {
      "racePredictor.input": {
        raceDate: isoDaysFromToday(-3),
        distance: "10k",
        customMeters: 5000,
        time: "25:00",
        goalDistance: "5k",
        goalCustomMeters: 5000,
        goalPaceSecPerKm: null,
        split: "even",
        unit: "km",
      },
    },
  },
  { name: "taper-default", route: "/taper-planner" },
  {
    name: "taper-flags",
    route: "/taper-planner",
    storage: {
      "taperPlanner.input": {
        raceDate: isoDaysFromToday(9),
        distance: "5k",
        customMeters: 10000,
        weeklyDistance: 10,
        unit: "mi",
        taperWeeks: 3,
        runsPerWeek: 2,
      },
    },
  },
  {
    name: "taper-past",
    route: "/taper-planner",
    storage: {
      "taperPlanner.input": {
        raceDate: isoDaysFromToday(-5),
        distance: "marathon",
        customMeters: 10000,
        weeklyDistance: 30,
        unit: "km",
        taperWeeks: 2,
        runsPerWeek: 7,
      },
    },
  },
  {
    name: "taper-custom",
    route: "/taper-planner",
    storage: {
      "taperPlanner.input": {
        raceDate: isoDaysFromToday(30),
        distance: "custom",
        customMeters: 15000,
        weeklyDistance: 120,
        unit: "km",
        taperWeeks: 3,
        runsPerWeek: 6,
      },
    },
  },
  { name: "workouts-choose", route: "/workouts" },
  { name: "workouts-warm-up", route: "/workouts", raw: { "workout.selection": "warm-up" } },
  { name: "workouts-stretch", route: "/workouts", raw: { "workout.selection": "stretch" } },
  { name: "youtube", route: "/youtube-workouts" },
  ...["front", "back", "sole"].map((view) => ({
    name: `pain-none-${view}`,
    route: "/pain-map",
    storage: { "painMap.selection": { view, spot: null } },
  })),
  // Every spot, on its home view (the first view it is drawn in).
  ...Object.entries({
    chest: "front",
    "side-stitch": "front",
    "lower-back": "back",
    groin: "front",
    "outer-hip": "front",
    buttock: "back",
    "sit-bone": "back",
    "front-thigh": "front",
    "back-thigh": "back",
    "front-knee": "front",
    "outer-knee": "front",
    "inner-knee": "front",
    "inner-shin": "front",
    "outer-shin": "front",
    calf: "back",
    achilles: "back",
    "back-heel": "back",
    "outer-ankle": "front",
    "inner-ankle": "front",
    "top-of-foot": "front",
    toes: "sole",
    "big-toe-joint": "sole",
    "ball-of-foot": "sole",
    arch: "sole",
    heel: "sole",
  }).map(([spot, view]) => ({
    name: `pain-${spot}`,
    route: "/pain-map",
    storage: { "painMap.selection": { view, spot } },
  })),
];

/* ------------------------------------------------------------------- server */

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function serve(dir) {
  const server = createServer((request, response) => {
    let path = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (path === "/") path = "/index.html";
    const file = join(dir, path);
    if (!file.startsWith(dir) || !existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(response);
  });
  return new Promise((done) => server.listen(0, "127.0.0.1", () => done(server)));
}

/* ------------------------------------------------------------------ capture */

/** What sticks out sideways: the page's own overflow, then text wider than its box. */
function findOverflow() {
  const found = [];
  if (document.documentElement.scrollWidth > innerWidth) {
    found.push(`page is ${document.documentElement.scrollWidth}px wide`);
  }
  const wide = [...document.querySelectorAll("body *")].filter(
    (element) =>
      getComputedStyle(element).overflowX === "visible" &&
      !element.closest("svg, select") &&
      element.clientWidth > 0 &&
      element.scrollWidth > element.clientWidth + 1,
  );
  // Only the innermost culprits: every ancestor of an overflowing element overflows too.
  const innermost = wide.filter((element) => !wide.some((other) => other !== element && element.contains(other)));
  for (const element of innermost) {
    const text = (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 50);
    found.push(`<${element.tagName.toLowerCase()}> ${element.scrollWidth}px in ${element.clientWidth}px: "${text}"`);
  }
  return found;
}

/** Visible text with every <details> opened, then the accessible attributes. */
function dumpText(ignore) {
  if (ignore) for (const element of document.querySelectorAll(ignore)) element.remove();
  for (const details of document.querySelectorAll("details")) details.open = true;
  const lines = [document.body.innerText, ""];
  for (const element of document.querySelectorAll("[aria-label],[title],[placeholder],[alt]")) {
    for (const attribute of ["aria-label", "title", "placeholder", "alt"]) {
      const value = element.getAttribute(attribute);
      if (value) lines.push(`@${attribute}: ${value}`);
    }
  }
  for (const option of document.querySelectorAll("option")) lines.push(`@option: ${option.textContent}`);
  lines.push(`@lang: ${document.documentElement.lang}`);
  return lines.join("\n");
}

async function capture(browser, baseUrl, outDir, scenarios) {
  const overflow = [];
  for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({
      viewport,
      locale: options.locale,
      serviceWorkers: "block",
      reducedMotion: "reduce",
    });
    await context.route((url) => url.hostname !== "127.0.0.1", (route) => route.abort());
    for (const scenario of scenarios) {
      const storage = { ...scenario.raw };
      for (const [key, value] of Object.entries(scenario.storage ?? {})) {
        storage[key] = JSON.stringify(value);
      }
      const page = await context.newPage();
      await page.addInitScript((entries) => {
        localStorage.clear();
        for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
      }, storage);
      await page.goto(`${baseUrl}/#${scenario.route}`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      await page.screenshot({
        path: join(outDir, `${scenario.name}.${viewportName}.png`),
        fullPage: true,
        animations: "disabled",
        caret: "hide",
        mask: options.mask ? [page.locator(options.mask)] : [],
      });
      if (viewportName === "mobile") {
        for (const found of await page.evaluate(findOverflow)) overflow.push(`${scenario.name}: ${found}`);
      }
      // The text dump opens every <details>, so it goes after the screenshot.
      if (viewportName === "desktop") {
        const text = await page.evaluate(dumpText, options.ignore ?? "");
        writeFileSync(join(outDir, `${scenario.name}.txt`), `${text}\n`);
      }
      await page.close();
    }
    await context.close();
  }
  return overflow;
}

/* ------------------------------------------------------------------ compare */

/**
 * Pixel diff in the browser itself (canvas), so the comparison needs nothing
 * beyond Playwright. Returns the number of differing pixels and, when there
 * are any, a PNG data URL marking them in red over a faded copy of `after`.
 */
async function diffImages(page, beforePng, afterPng) {
  return page.evaluate(
    async ([before, after]) => {
      const load = (base64) =>
        new Promise((done, fail) => {
          const image = new Image();
          image.onload = () => done(image);
          image.onerror = fail;
          image.src = `data:image/png;base64,${base64}`;
        });
      const [a, b] = await Promise.all([load(before), load(after)]);
      if (a.width !== b.width || a.height !== b.height) {
        return { size: `${a.width}×${a.height} → ${b.width}×${b.height}`, pixels: -1, image: null };
      }
      const pixelsOf = (image) => {
        const canvas = new OffscreenCanvas(image.width, image.height);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, image.width, image.height);
      };
      const pa = pixelsOf(a).data;
      const after_ = pixelsOf(b);
      const pb = after_.data;
      let pixels = 0;
      for (let i = 0; i < pa.length; i += 4) {
        const same = pa[i] === pb[i] && pa[i + 1] === pb[i + 1] && pa[i + 2] === pb[i + 2] && pa[i + 3] === pb[i + 3];
        if (same) {
          const grey = (pb[i] + pb[i + 1] + pb[i + 2]) / 3;
          pb[i] = pb[i + 1] = pb[i + 2] = 128 + grey / 4;
        } else {
          pixels += 1;
          pb[i] = 255;
          pb[i + 1] = 0;
          pb[i + 2] = 0;
        }
        pb[i + 3] = 255;
      }
      if (pixels === 0) return { size: null, pixels, image: null };
      const canvas = new OffscreenCanvas(b.width, b.height);
      canvas.getContext("2d").putImageData(after_, 0, 0);
      const blob = await canvas.convertToBlob({ type: "image/png" });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return { size: null, pixels, image: btoa(binary) };
    },
    [beforePng.toString("base64"), afterPng.toString("base64")],
  );
}

/** First differing line of two text dumps, for a readable report. */
function firstTextDifference(before, after) {
  const a = before.split("\n");
  const b = after.split("\n");
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return `line ${i + 1}:\n      - ${a[i] ?? "(missing)"}\n      + ${b[i] ?? "(missing)"}`;
  }
  return "";
}

async function compare(browser, beforeDir, afterDir, scenarios) {
  const page = await browser.newPage();
  const problems = [];
  for (const scenario of scenarios) {
    const files = [
      `${scenario.name}.txt`,
      ...Object.keys(VIEWPORTS).map((viewport) => `${scenario.name}.${viewport}.png`),
    ];
    for (const file of files) {
      const before = join(beforeDir, file);
      const after = join(afterDir, file);
      if (!existsSync(before)) {
        problems.push(`${file}: no baseline`);
        continue;
      }
      if (file.endsWith(".txt")) {
        const [a, b] = [readFileSync(before, "utf8"), readFileSync(after, "utf8")];
        if (a !== b) problems.push(`${file}: text differs, ${firstTextDifference(a, b)}`);
        continue;
      }
      const [a, b] = [readFileSync(before), readFileSync(after)];
      if (a.equals(b)) continue;
      const result = await diffImages(page, a, b);
      if (result.size) problems.push(`${file}: size ${result.size}`);
      else if (result.pixels > 0) {
        const diffFile = join(afterDir, file.replace(/\.png$/, ".diff.png"));
        writeFileSync(diffFile, Buffer.from(result.image, "base64"));
        problems.push(`${file}: ${result.pixels} pixels differ (${diffFile})`);
      }
    }
  }
  await page.close();
  return problems;
}

/* --------------------------------------------------------------------- main */

const dist = resolve(options.dist);
if (!existsSync(join(dist, "index.html"))) {
  throw new Error(`No build in ${dist} — run \`npm run build\` first.`);
}
const outDir = resolve(options.out);
mkdirSync(outDir, { recursive: true });
const scenarios = SCENARIOS.filter((scenario) => scenario.name.startsWith(options.only));

const server = await serve(dist);
const browser = await chromium.launch();
try {
  const { port } = server.address();
  const overflow = await capture(browser, `http://127.0.0.1:${port}`, outDir, scenarios);
  console.log(
    `${scenarios.length} scenarios × ${Object.keys(VIEWPORTS).length} viewports (${options.locale}) → ${outDir}`,
  );
  if (overflow.length) {
    console.log(`\n${overflow.length} things stick out sideways at ${VIEWPORTS.mobile.width}px:`);
    for (const found of overflow) console.log(`  ${found}`);
  }
  if (options.compare) {
    const problems = await compare(browser, resolve(options.compare), outDir, scenarios);
    if (problems.length) {
      console.log(`\n${problems.length} differences against ${options.compare}:`);
      for (const problem of problems) console.log(`  ${problem}`);
      process.exitCode = 1;
    } else {
      console.log(`identical to ${options.compare}: every text dump and every pixel`);
    }
  }
} finally {
  await browser.close();
  server.close();
}
