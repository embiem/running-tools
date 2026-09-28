#!/usr/bin/env node
// Checks that every translation in messages/ matches the English source:
// the same keys, the same {placeholders} and the same HTML tags (some messages
// are rendered with {@html}, so a dropped </strong> would leak into the page).
// Paraglide falls back to English for a missing key without a word, so this is
// what keeps German and Spanish complete. Part of `npm run check`.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../messages");
const SOURCE = "en";

function load(locale) {
  const { $schema, ...messages } = JSON.parse(readFileSync(join(dir, `${locale}.json`), "utf8"));
  return messages;
}

/** Sorted multiset of a message's {placeholders} and HTML tags. */
function shape(text) {
  if (typeof text !== "string") return ["(not a plain string)"];
  const placeholders = [...text.matchAll(/\{(\w+)\}/g)].map((match) => `{${match[1]}}`);
  const tags = [...text.matchAll(/<\/?[a-z]+\b[^>]*>/g)].map((match) => match[0]);
  return [...placeholders, ...tags].sort();
}

const source = load(SOURCE);
const problems = [];
for (const file of readdirSync(dir).filter((name) => name.endsWith(".json"))) {
  const locale = file.replace(/\.json$/, "");
  if (locale === SOURCE) continue;
  const messages = load(locale);
  for (const key of Object.keys(source)) {
    if (!(key in messages)) {
      problems.push(`${locale}: missing ${key}`);
      continue;
    }
    const [expected, actual] = [shape(source[key]), shape(messages[key])];
    if (expected.join() !== actual.join()) {
      problems.push(`${locale}: ${key} has ${actual.join(" ") || "nothing"}, English has ${expected.join(" ") || "nothing"}`);
    }
  }
  for (const key of Object.keys(messages)) {
    if (!(key in source)) problems.push(`${locale}: ${key} is not in ${SOURCE}.json`);
  }
}

if (problems.length) {
  console.error(`messages/: ${problems.length} problems\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`messages/: every locale matches ${SOURCE}.json (${Object.keys(source).length} messages)`);
