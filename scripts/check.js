import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JOB_TYPES, SIZES } from "../src/js/validate-quote.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const site = JSON.parse(fs.readFileSync(path.join(root, "data/site.json"), "utf8"));
const { projects } = JSON.parse(fs.readFileSync(path.join(root, "data/projects.json"), "utf8"));
const origin = site.url.replace(/\/$/, "");
const basePath = new URL(site.url).pathname.replace(/\/$/, "");
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(rel) {
  const file = path.join(dist, rel);
  if (!fs.existsSync(file)) {
    fail(`Missing dist/${rel}`);
    return "";
  }
  return fs.readFileSync(file, "utf8");
}

function walk(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else found.push(full);
  }
  return found;
}

function fileFor(urlPath) {
  let rel = urlPath;
  if (basePath && (rel === basePath || rel.startsWith(`${basePath}/`))) {
    rel = rel.slice(basePath.length) || "/";
  }
  if (!rel.startsWith("/")) return null;
  if (rel === "/") return "index.html";
  if (rel.endsWith("/")) return `${rel.slice(1)}index.html`;
  return rel.slice(1);
}

if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error("dist/ is missing. Run node scripts/build.js first.");
  process.exit(1);
}

const htmlFiles = walk(dist).filter((file) => file.endsWith(".html"));
const htmlByRel = new Map(htmlFiles.map((file) => [path.relative(dist, file), fs.readFileSync(file, "utf8")]));

for (const [rel, html] of htmlByRel) {
  if (!html.includes("<html lang=\"en\">")) fail(`${rel} missing lang=en`);
  if (!html.includes('href="#content"')) fail(`${rel} missing skip link`);
  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) fail(`${rel} has ${h1s.length} h1 elements`);
  const title = html.match(/<title>([^<]*)<\/title>/);
  if (!title) fail(`${rel} missing title`);
  else if (title[1].length > 70) fail(`${rel} title is ${title[1].length} characters`);
  const description = html.match(/<meta name="description" content="([^"]*)">/);
  if (!description) fail(`${rel} missing meta description`);
  else if (description[1].length < 50 || description[1].length > 170) {
    fail(`${rel} meta description is ${description[1].length} characters`);
  }
  if (!html.includes('rel="canonical"')) fail(`${rel} missing canonical`);
  if ((html.match(/class="todo">TODO/g) || []).length < 2) fail(`${rel} contact TODOs missing`);
  if (!html.includes("https://vollana-antiques.com/")) fail(`${rel} missing Vollana link`);
  if (!html.includes("apprentice")) fail(`${rel} missing apprenticeship credit`);
  if (/\$\s?\d/.test(html)) fail(`${rel} appears to list a price`);
  if (/\b\d{3}[-.)]\s?\d{3}[-.]\d{4}\b/.test(html) || /\(\d{3}\)\s*\d{3}/.test(html)) {
    fail(`${rel} appears to contain a phone number`);
  }
  for (const banned of ["fonts.googleapis.com", "googletagmanager", "google-analytics", "facebook.net", "hotjar"]) {
    if (html.includes(banned)) fail(`${rel} includes ${banned}`);
  }

  const attrs = html.matchAll(/(?:href|src)="([^"]+)"/g);
  for (const match of attrs) {
    let url = match[1];
    if (url.startsWith("https://vollana-antiques.com/")) continue;
    if (url.startsWith(origin)) url = url.slice(origin.length) || "/";
    const hashIndex = url.indexOf("#");
    const hash = hashIndex >= 0 ? url.slice(hashIndex + 1) : "";
    const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
    if (!withoutHash) {
      if (hash && !html.includes(`id="${hash}"`)) fail(`${rel} missing #${hash}`);
      continue;
    }
    if (!withoutHash.startsWith("/")) {
      fail(`${rel} has a non-root link: ${match[1]}`);
      continue;
    }
    const local = fileFor(withoutHash);
    if (!local || !htmlByRel.has(local) && !fs.existsSync(path.join(dist, local))) {
      fail(`${rel} links to missing ${match[1]}`);
      continue;
    }
    if (hash) {
      const targetHtml = htmlByRel.get(local) || fs.readFileSync(path.join(dist, local), "utf8");
      if (!targetHtml.includes(`id="${hash}"`)) fail(`${rel} links to missing #${hash} on ${local}`);
    }
  }
}

const home = htmlByRel.get("index.html");
const ldMatch = home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!ldMatch) fail("Home page missing JSON-LD");
else {
  const data = JSON.parse(ldMatch[1]);
  if (data["@type"] !== "LocalBusiness") fail("JSON-LD @type is not LocalBusiness");
  const address = data.address || {};
  if (address.postalCode !== "10032" || address.addressRegion !== "NY") fail("JSON-LD address is not ZIP 10032, NY");
  if ("streetAddress" in address) fail("JSON-LD includes a street address");
  for (const key of ["telephone", "priceRange", "aggregateRating", "review"]) {
    if (key in data) fail(`JSON-LD includes ${key}`);
  }
  if (data.areaServed?.name !== "New York City") fail("JSON-LD areaServed is not New York City");
  const services = data.hasOfferCatalog?.itemListElement || [];
  if (services.length !== 3) fail("JSON-LD should list three services");
  const restoration = JSON.stringify(services);
  if (!/apprentice/i.test(restoration) || !/Vollana/.test(restoration)) {
    fail("JSON-LD restoration service does not credit Vollana");
  }
}

const restoration = htmlByRel.get("restoration/index.html");
if (restoration && !restoration.includes("not presented as his alone")) {
  fail("Restoration page does not say the pieces are not his alone");
}
for (const project of projects.filter((item) => item.service === "restoration")) {
  if (!restoration.includes(`id="${project.id}"`)) fail(`Restoration page missing ${project.id}`);
  if (!restoration.includes("not as Estefano's alone")) fail("Restoration project caption missing the apprenticeship credit");
}

const work = htmlByRel.get("work/index.html");
for (const project of projects) {
  if (!work.includes(`id="${project.id}"`)) fail(`Work page missing ${project.id}`);
  const page = {
    renovation: "renovations/index.html",
    carpentry: "carpentry/index.html",
    restoration: "restoration/index.html",
  }[project.service];
  if (!htmlByRel.get(page).includes(`id="${project.id}"`)) fail(`${page} missing ${project.id}`);
}

const quote = htmlByRel.get("quote/index.html");
for (const id of ["name", "phone", "email", "jobType", "size", "location", "timeline", "photos", "message"]) {
  if (!quote.includes(`<label for="${id}">`)) fail(`Quote form missing label for ${id}`);
  if (!quote.includes(`id="${id}"`)) fail(`Quote form missing #${id}`);
}
if (!quote.includes("novalidate")) fail("Quote form should use novalidate and custom validation");
for (const value of JOB_TYPES) {
  if (!quote.includes(`value="${value}"`)) fail(`Quote form missing job type ${value}`);
}
for (const value of SIZES) {
  if (!quote.includes(`value="${value}"`)) fail(`Quote form missing size ${value}`);
}

const config = fs.readFileSync(path.join(root, "src/js/config.js"), "utf8");
const exports = config.match(/export const QUOTE_ENDPOINT\s*=/g) || [];
if (exports.length !== 1) fail("src/js/config.js should export QUOTE_ENDPOINT once");
if (fs.readFileSync(path.join(dist, "js/config.js"), "utf8") !== config) {
  fail("dist/js/config.js does not match src/js/config.js");
}
const assignment = /QUOTE_ENDPOINT\s*=/;
for (const file of walk(path.join(root, "src")).concat(walk(path.join(root, "scripts")))) {
  if (file.endsWith("config.js")) continue;
  const source = fs.readFileSync(file, "utf8");
  if (assignment.test(source)) fail(`QUOTE_ENDPOINT is assigned outside config.js in ${file}`);
}

const robots = read("robots.txt");
if (!robots.includes(`Sitemap: ${origin}/sitemap.xml`)) fail("robots.txt sitemap URL is wrong");
const sitemap = read("sitemap.xml");
for (const loc of [
  `${origin}/`,
  `${origin}/work/`,
  `${origin}/renovations/`,
  `${origin}/carpentry/`,
  `${origin}/restoration/`,
  `${origin}/about/`,
  `${origin}/quote/`,
]) {
  if (!sitemap.includes(`<loc>${loc}</loc>`)) fail(`sitemap missing ${loc}`);
}
if (sitemap.includes("404")) fail("sitemap should not list the 404 page");

for (const project of projects) {
  for (const side of ["before", "after"]) {
    const svg = read(project[side] || `images/placeholders/${project.id}-${side}.svg`);
    if (!svg.includes(side === "before" ? ">BEFORE<" : ">AFTER<")) fail(`${project.id} ${side} image is not labeled`);
    if (!svg.includes("PLACEHOLDER") || !svg.includes("Not a photograph")) {
      fail(`${project.id} ${side} image is not marked as a placeholder`);
    }
  }
}

const css = read("css/site.css");
for (const banned of ["fonts.googleapis.com", "fonts.gstatic.com"]) {
  if (css.includes(banned)) fail(`CSS includes ${banned}`);
}

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Checked ${htmlByRel.size} pages, ${projects.length} projects, quote form, JSON-LD, sitemap.`);
