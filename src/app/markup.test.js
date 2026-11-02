// Structural checks over the real JSX (parsed with @babel/parser) and CSS
// (parsed with postcss). Both ship in node_modules via eslint-config-next and
// next, so no dependency is added. Comments never count: they are not in the AST.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { parse } = require("@babel/parser");
const postcss = require("postcss");

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const parseJsx = (src) =>
  parse(src, { sourceType: "module", plugins: ["jsx"] });

function walk(node, visit) {
  if (!node || typeof node.type !== "string") return;
  visit(node);
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "leadingComments" || key === "trailingComments") continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => walk(c, visit));
    else if (v && typeof v === "object") walk(v, visit);
  }
}

function elements(ast, name) {
  const out = [];
  walk(ast.program, (n) => {
    if (n.type === "JSXElement" && n.openingElement.name.name === name) out.push(n.openingElement);
  });
  return out;
}

// Static value of a JSX attribute: string literal, `{"x"}`, or template
// literal source with expressions shown as ${...}. undefined = absent.
function attr(opening, name, src) {
  const a = opening.attributes.find((x) => x.type === "JSXAttribute" && x.name.name === name);
  if (!a) return undefined;
  if (a.value === null) return true;
  if (a.value.type === "StringLiteral") return a.value.value;
  const e = a.value.expression;
  if (e.type === "StringLiteral") return e.value;
  if (e.type === "TemplateLiteral") return src.slice(e.start + 1, e.end - 1);
  if (e.type === "BooleanLiteral") return e.value;
  return { expr: src.slice(e.start, e.end) };
}

function exportedFunction(ast, name) {
  let found = false;
  walk(ast.program, (n) => {
    if (
      n.type === "ExportNamedDeclaration" &&
      n.declaration?.type === "FunctionDeclaration" &&
      n.declaration.id.name === name
    ) found = true;
  });
  return found;
}

const weatherSrc = read("./weather/[zip]/page.js");
const weather = parseJsx(weatherSrc);
const homeSrc = read("./page.js");
const home = parseJsx(homeSrc);

function declsFor(cssSrc, selector) {
  const out = {};
  postcss.parse(cssSrc).walkRules((rule) => {
    if (rule.selectors.includes(selector)) {
      rule.each((d) => { if (d.type === "decl") out[d.prop] = d.value; });
    }
  });
  return out;
}

test("parser helpers ignore comments and survive line splitting", () => {
  const commented = parseJsx('const a = <img {/* alt="" */ ...p} />; const b = <div>{/* <ul> */}</div>;');
  assert.equal(attr(elements(commented, "img")[0], "alt", ""), undefined);
  assert.equal(elements(commented, "ul").length, 0);
  const split = parseJsx('const a = <li\n  key={1}\n  className="x"\n>y</li>;');
  assert.equal(elements(split, "li").length, 1);
  const css = declsFor('.a { /* list-style: none; */ color: red }\n.b { list-style: none }', ".a");
  assert.deepEqual(css, { color: "red" });
});

test("card 6: slots are a list (ul role=list, li items), icon alt is empty", () => {
  const uls = elements(weather, "ul");
  assert.equal(uls.length, 1);
  assert.deepEqual(attr(uls[0], "className", weatherSrc), { expr: "styles.slots" });
  assert.equal(attr(uls[0], "role", weatherSrc), "list");
  const lis = elements(weather, "li");
  assert.equal(lis.length, 1);
  assert.deepEqual(attr(lis[0], "className", weatherSrc), { expr: "styles.slot" });
  assert.equal(elements(weather, "img").length, 1);
  assert.equal(attr(elements(weather, "img")[0], "alt", weatherSrc), "");
  const slotDivs = elements(weather, "div");
  assert.equal(slotDivs.length, 0);
});

test("card 6: .slots rule removes list markers", () => {
  const css = read("./weather/[zip]/page.module.css");
  assert.equal(declsFor(css, ".slots")["list-style"], "none");
});

test("card 6: home input autocomplete and error wiring", () => {
  const input = elements(home, "input")[0];
  assert.equal(attr(input, "autoComplete", homeSrc), "postal-code");
  assert.deepEqual(attr(input, "aria-describedby", homeSrc), { expr: 'error ? "zip-error" : undefined' });
  const alerts = elements(home, "p").filter((p) => attr(p, "id", homeSrc) === "zip-error");
  assert.equal(alerts.length, 1);
  assert.equal(attr(alerts[0], "role", homeSrc), "alert");
});

test("card 6: per-zip generateMetadata", () => {
  assert.ok(exportedFunction(weather, "generateMetadata"));
  let title;
  walk(weather.program, (n) => {
    if (n.type === "ObjectProperty" && n.key.name === "title" && n.value.type === "TemplateLiteral") {
      title = weatherSrc.slice(n.value.start + 1, n.value.end - 1);
    }
  });
  assert.equal(title, "Forecast for ${zip}");
});

test("card 7: icons are @2x, 40px, lazy", () => {
  const img = elements(weather, "img")[0];
  assert.match(attr(img, "src", weatherSrc), /\$\{entry\.weather\[0\]\.icon\}@2x\.png$/);
  assert.deepEqual(attr(img, "width", weatherSrc), { expr: "40" });
  assert.deepEqual(attr(img, "height", weatherSrc), { expr: "40" });
  assert.equal(attr(img, "loading", weatherSrc), "lazy");
});

test("card 7: Geist fonts dropped consistently", () => {
  const layout = parseJsx(read("./layout.js"));
  const sources = [];
  walk(layout.program, (n) => {
    if (n.type === "ImportDeclaration") sources.push(n.source.value);
  });
  assert.deepEqual(sources, ["./globals.css"]);
  const css = postcss.parse(read("./globals.css"));
  let geist = false;
  css.walkDecls((d) => { if (/geist/.test(d.value) || /geist/.test(d.prop)) geist = true; });
  assert.equal(geist, false);
});
