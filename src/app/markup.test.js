import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const weather = read("./weather/[zip]/page.js");
const home = read("./page.js");
const layout = read("./layout.js");
const slotsCss = read("./weather/[zip]/page.module.css");

test("card 6: slots are a list and icon alt is empty", () => {
  assert.match(weather, /<ul className=\{styles\.slots\}>/);
  assert.match(weather, /<li key=\{entry\.dt\} className=\{styles\.slot\}>/);
  assert.doesNotMatch(weather, /<div key=\{entry\.dt\}/);
  assert.match(weather, /alt=""/);
  assert.doesNotMatch(weather, /alt=\{/);
  assert.match(slotsCss, /\.slots \{[^}]*list-style: none/);
});

test("card 6: home input autocomplete and error wiring", () => {
  assert.match(home, /autoComplete="postal-code"/);
  assert.match(home, /aria-describedby=\{error \? "zip-error" : undefined\}/);
  assert.match(home, /id="zip-error" role="alert"/);
});

test("card 6: per-zip generateMetadata", () => {
  assert.match(weather, /export async function generateMetadata\(/);
  assert.match(weather, /title: `Forecast for \$\{zip\}`/);
});

test("card 7: icons are @2x, 40px, lazy", () => {
  assert.match(weather, /icon\}@2x\.png/);
  assert.match(weather, /width=\{40\}\s+height=\{40\}\s+loading="lazy"/);
});

test("card 7: Geist fonts dropped consistently", () => {
  assert.doesNotMatch(layout, /next\/font|Geist|font-geist/);
  assert.doesNotMatch(read("./globals.css"), /font-geist/);
});
