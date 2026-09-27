#!/usr/bin/env node
// Pre-renders every sentence the guided-workout player can say with
// Kokoro-82M, running locally (ONNX Runtime, CPU by default). Writes one MP3
// per sentence into src/assets/narration/ plus manifest.json there, mapping the
// exact sentence text to its clip; src/lib/workoutPlayer.ts bundles both
// through Vite. The sentences come from `narrationLines` in
// src/lib/workouts.ts, so re-run this after any wording change there.
//
// Needs Node >= 22.18 (imports the .ts data module via built-in type stripping)
// and ffmpeg with libmp3lame on PATH.
//
// Find all voices here: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md
//
//   npm run narrate                    # render anything missing or changed, prune the rest
//   npm run narrate -- --force         # re-render everything
//   npm run narrate -- --voice=af_heart --speed=1.05
//   npm run narrate -- --device=cuda   # GPU: CUDA (Linux x64 + NVIDIA, needs system CUDA 11.8 + cuDNN); default cpu
//   npm run narrate -- --dry-run       # print the sentences that would be rendered
//   npm run narrate -- --list-voices
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { KokoroTTS } from "kokoro-js";
import { WORKOUTS, narrationLines } from "../src/lib/workouts.ts";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
/** Energetic American female voice (grade A- in VOICES.md): a coach, not a narrator. */
const DEFAULT_VOICE = "af_bella";
const DEFAULT_DTYPE = "q8";
const SAMPLE_RATE = 24_000;
/** Kokoro truncates past ~510 phoneme tokens; keep requests comfortably below. */
const MAX_CHUNK_CHARS = 300;
/** Breath between chunks of one over-long sentence group. */
const CHUNK_GAP_MS = 120;
/** Bump when the text normalisation or audio assembly changes, to invalidate clips. */
const PIPELINE_VERSION = 1;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const narrationDir = join(root, "src/assets/narration");
const manifestPath = join(narrationDir, "manifest.json");

/* ------------------------------------------------------------------ options */

function parseOptions() {
  const { values } = parseArgs({
    strict: true,
    options: {
      force: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      "list-voices": { type: "boolean", default: false },
      voice: { type: "string", default: DEFAULT_VOICE },
      speed: { type: "string", default: "1" },
      dtype: { type: "string", default: DEFAULT_DTYPE },
      device: { type: "string", default: "cpu" },
    },
  });
  const speed = Number(values.speed);
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new Error(`--speed must be a positive number, got ${values.speed}`);
  }
  return {
    force: values.force,
    dryRun: values["dry-run"],
    listVoices: values["list-voices"],
    voice: values.voice,
    speed,
    dtype: values.dtype,
    device: values.device,
  };
}

/* ---------------------------------------------------------- text -> speech */

const REPLACEMENTS = [
  [/\u00a0/g, " "],
  [/[\u2018\u2019]/g, "'"],
  [/[\u201c\u201d]/g, '"'],
  // Numeric ranges read as ranges; every other dash becomes a comma pause.
  [/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1 to $2"],
  [/\s*[\u2013\u2014]\s*/g, ", "],
  [/(\d)\s*%/g, "$1 percent"],
  [/\s*&\s*/g, " and "],
  [/\s+/g, " "],
];

function speakable(text) {
  let out = text;
  for (const [pattern, replacement] of REPLACEMENTS) out = out.replace(pattern, replacement);
  return out.trim();
}

/**
 * A single sentence longer than the token budget would be truncated by the
 * model, so break it at the last comma (else the last space) that still fits.
 */
function splitLongSentence(sentence) {
  if (sentence.length <= MAX_CHUNK_CHARS) return [sentence];
  const window = sentence.slice(0, MAX_CHUNK_CHARS);
  const cut = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "));
  const at = cut > MAX_CHUNK_CHARS / 3 ? cut + 1 : window.lastIndexOf(" ");
  if (at <= 0) return [sentence];
  return [sentence.slice(0, at).trim(), ...splitLongSentence(sentence.slice(at).trim())];
}

/** Packs whole sentences into requests short enough for one forward pass. */
function toChunks(text) {
  const chunks = [];
  let buffer = "";
  for (const sentence of text.split(/(?<=[.!?])\s+/).flatMap(splitLongSentence)) {
    if (!buffer) buffer = sentence;
    else if (`${buffer} ${sentence}`.length <= MAX_CHUNK_CHARS) buffer += ` ${sentence}`;
    else {
      chunks.push(buffer);
      buffer = sentence;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks;
}

/* -------------------------------------------------------------------- audio */

/** Encodes raw mono f32 PCM to MP3 through ffmpeg's stdin. */
function encodeMp3(outFile, samples) {
  const child = spawn(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "f32le",
      "-ar",
      String(SAMPLE_RATE),
      "-ac",
      "1",
      "-i",
      "pipe:0",
      // No ID3 tag: the clips are app assets, not library files.
      "-map_metadata",
      "-1",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "48k",
      outFile,
    ],
    { stdio: ["pipe", "ignore", "pipe"] },
  );
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (data) => (stderr += data));
  const done = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}: ${stderr.trim()}`)),
    );
  });
  child.stdin.end(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
  return done;
}

async function requireFfmpeg() {
  const probe = spawn("ffmpeg", ["-hide_banner", "-encoders"], {
    stdio: ["ignore", "pipe", "ignore"],
  });
  let out = "";
  probe.stdout.setEncoding("utf8");
  probe.stdout.on("data", (data) => (out += data));
  const ok = await new Promise((resolve) => {
    probe.on("error", () => resolve(false));
    probe.on("close", (code) => resolve(code === 0));
  });
  if (!ok) throw new Error("ffmpeg is required to encode MP3s but was not found on PATH.");
  if (!out.includes("libmp3lame")) {
    throw new Error("This ffmpeg build lacks the libmp3lame encoder; install a full ffmpeg.");
  }
}

/* ----------------------------------------------------------------- pipeline */

/** Content address of a clip: same text + voice + model settings → same file. */
function clipFile(chunks, options) {
  const hash = createHash("sha256");
  hash.update(
    JSON.stringify({
      version: PIPELINE_VERSION,
      model: MODEL_ID,
      dtype: options.dtype,
      voice: options.voice,
      speed: options.speed,
      chunks,
    }),
  );
  return `${hash.digest("hex").slice(0, 16)}.mp3`;
}

async function main() {
  const options = parseOptions();

  if (options.listVoices) {
    const tts = await KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: options.dtype,
      device: options.device,
    });
    tts.list_voices();
    return;
  }

  const lines = [...new Set(WORKOUTS.flatMap(narrationLines))].sort();
  const jobs = lines.map((text) => {
    const chunks = toChunks(speakable(text));
    return { text, chunks, file: clipFile(chunks, options) };
  });

  if (options.dryRun) {
    for (const job of jobs) console.log(`${job.file}  ${job.chunks.join(" | ")}`);
    console.log(`\n${jobs.length} clips`);
    return;
  }

  const previous = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8")).clips
    : {};
  const pending = jobs.filter(
    (job) =>
      options.force ||
      previous[job.text]?.file !== job.file ||
      !existsSync(join(narrationDir, job.file)),
  );

  const clips = {};
  for (const job of jobs) {
    if (!pending.includes(job)) clips[job.text] = previous[job.text];
  }

  if (pending.length > 0) {
    await requireFfmpeg();
    await mkdir(narrationDir, { recursive: true });

    console.log(`loading ${MODEL_ID} (${options.dtype}, device ${options.device}) …`);
    const tts = await KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: options.dtype,
      device: options.device,
    });
    if (!(options.voice in tts.voices)) {
      throw new Error(`Unknown voice "${options.voice}". Run with --list-voices.`);
    }

    for (const [index, job] of pending.entries()) {
      const parts = [];
      for (const [i, chunk] of job.chunks.entries()) {
        if (i > 0)
          parts.push(new Float32Array(Math.round((CHUNK_GAP_MS / 1000) * SAMPLE_RATE)));
        const audio = await tts.generate(chunk, { voice: options.voice, speed: options.speed });
        parts.push(audio.audio);
      }
      const samples = new Float32Array(parts.reduce((n, part) => n + part.length, 0));
      let offset = 0;
      for (const part of parts) {
        samples.set(part, offset);
        offset += part.length;
      }

      const outFile = join(narrationDir, job.file);
      await encodeMp3(outFile, samples);
      const duration = Number((samples.length / SAMPLE_RATE).toFixed(2));
      clips[job.text] = { file: job.file, duration };
      console.log(
        `[${index + 1}/${pending.length}] ${relative(root, outFile)}  ${duration}s  ${job.text}`,
      );
    }
  }

  // Drop clips no sentence references any more (old wording, old voice).
  const live = new Set(Object.values(clips).map((clip) => clip.file));
  if (existsSync(narrationDir)) {
    for (const file of readdirSync(narrationDir)) {
      if (!file.endsWith(".mp3") || live.has(file)) continue;
      rmSync(join(narrationDir, file));
      console.log(`pruned ${file}`);
    }
  }

  const sorted = Object.fromEntries(Object.entries(clips).sort(([a], [b]) => a.localeCompare(b)));
  const manifest = {
    model: MODEL_ID,
    voice: options.voice,
    speed: options.speed,
    clips: sorted,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const bytes = [...live].reduce((n, file) => n + statSync(join(narrationDir, file)).size, 0);
  console.log(
    `${jobs.length} clips (${pending.length} rendered), ${(bytes / 1024).toFixed(0)} KiB total`,
  );
}

await main();
