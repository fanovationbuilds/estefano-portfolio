import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const site = JSON.parse(fs.readFileSync(path.join(root, "data/site.json"), "utf8"));
const { projects } = JSON.parse(fs.readFileSync(path.join(root, "data/projects.json"), "utf8"));

const origin = site.url.replace(/\/$/, "");
const basePath = new URL(site.url).pathname.endsWith("/")
  ? new URL(site.url).pathname
  : `${new URL(site.url).pathname}/`;

const VOLLANA = "https://vollana-antiques.com/";
const EMAIL_LINK =
  '<a class="button" href="mailto:queborealestate@gmail.com?subject=Quote%20request">Email me</a>';
const SERVICES = ["restoration", "carpentry", "renovation"];
const SERVICE_LABEL = {
  renovation: "Full renovation",
  carpentry: "Custom carpentry",
  restoration: "Antique restoration",
};

const pages = [
  {
    id: "home",
    out: "index.html",
    path: "/",
    title: "Estefano | Restoration, carpentry, and renovations in NYC",
    description:
      "Estefano does antique wood restoration, custom carpentry, and full renovations in New York City.",
    template: "home.html",
    jsonld: true,
  },
  {
    id: "work",
    out: "work/index.html",
    path: "/work/",
    title: "Before and after | Estefano",
    description:
      "Before-and-after projects from Estefano: wood restoration done as an apprentice at Vollana Antiques, custom carpentry, and renovations.",
    template: "work.html",
  },
  {
    id: "restoration",
    out: "restoration/index.html",
    path: "/restoration/",
    title: "Antique repair and wood restoration | Estefano",
    description:
      "Antique repair and wood restoration Estefano did as an apprentice at Vollana Antiques, shown with the shop's permission.",
    template: "restoration.html",
  },
  {
    id: "carpentry",
    out: "carpentry/index.html",
    path: "/carpentry/",
    title: "Custom carpentry in New York City | Estefano",
    description:
      "Kitchen cabinets, doors, closets, and built-ins, made for the room. Custom carpentry in New York City by Estefano.",
    template: "carpentry.html",
  },
  {
    id: "renovations",
    out: "renovations/index.html",
    path: "/renovations/",
    title: "Full renovations in New York City | Estefano",
    description:
      "Plumbing, electrical, kitchens, bathrooms, framing, and flooring. Renovation work in New York City by Estefano.",
    template: "renovations.html",
  },
  {
    id: "about",
    out: "about/index.html",
    path: "/about/",
    title: "About Estefano | New York City",
    description:
      "Estefano takes restoration, carpentry, and renovation jobs across New York City.",
    template: "about.html",
  },
  {
    id: "quote",
    out: "quote/index.html",
    path: "/quote/",
    title: "Request a quote | Estefano",
    description:
      "Ask Estefano for a quote on antique restoration, carpentry, or a renovation in New York City. Big jobs and small ones.",
    template: "quote.html",
  },
  {
    id: "404",
    out: "404.html",
    path: "/404.html",
    title: "Page not found | Estefano",
    description: "That page is not on Estefano's site. The work, services, and quote form are linked from here.",
    template: "404.html",
    robots: "noindex",
    sitemap: false,
  },
];

const serviceOrder = [
  { id: "restoration", label: "Restoration", full: "Antique repair and wood restoration" },
  { id: "carpentry", label: "Carpentry", full: "Custom carpentry" },
  { id: "renovations", label: "Renovations", full: "Full renovations" },
];

const nav = [
  { id: "work", label: "Work" },
  ...serviceOrder.map((service) => ({ id: service.id, label: service.label })),
  { id: "about", label: "About" },
  { id: "quote", label: "Request a quote", cta: true },
];

const testimonialHtml = `<figure class="testimonial">
  <blockquote>
    <p>It is so hard to find people that do wood restoration, thank you so much for your amazing craft and expertise. You made this whole process a great experience.</p>
  </blockquote>
  <figcaption>Wood restoration client</figcaption>
</figure>`;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function href(pathname) {
  const base = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
  if (pathname === "/") return base === "" ? "/" : `${base}/`;
  return `${base}${pathname}`;
}

function canonical(pathname) {
  if (pathname === "/") return `${origin}/`;
  return `${origin}${pathname}`;
}

function assertProjects(list) {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("data/projects.json needs a projects array.");
  }
  const ids = new Set();
  for (const project of list) {
    if (!/^[a-z0-9-]+$/.test(project.id || "")) {
      throw new Error(`Bad project id: ${project.id}`);
    }
    if (ids.has(project.id)) throw new Error(`Duplicate project id: ${project.id}`);
    ids.add(project.id);
    if (!SERVICES.includes(project.service)) {
      throw new Error(`${project.id} has an unknown service.`);
    }
    if (!project.title || !project.summary) throw new Error(`${project.id} needs a title and summary.`);
    if (project.service === "restoration" && project.apprenticeship !== true) {
      throw new Error(`${project.id} is restoration and must set "apprenticeship": true so it stays credited to Vollana.`);
    }
    if (project.service !== "restoration" && project.apprenticeship) {
      throw new Error(`${project.id} uses apprenticeship, which is only for restoration projects.`);
    }
    for (const key of ["beforeAlt", "afterAlt"]) {
      const alt = project[key] || "";
      if (alt.length < 20) throw new Error(`${project.id} ${key} is too short.`);
    }
    project.before ||= `images/placeholders/${project.id}-before.svg`;
    project.after ||= `images/placeholders/${project.id}-after.svg`;
    for (const key of ["before", "after"]) {
      const rel = project[key];
      if (!rel.startsWith("images/") || rel.includes("..")) {
        throw new Error(`${project.id} has an unsafe image path: ${rel}`);
      }
      const alt = project[key === "before" ? "beforeAlt" : "afterAlt"];
      const placeholder = rel.startsWith("images/placeholders/");
      if (placeholder && !/placeholder/i.test(alt)) {
        throw new Error(`${project.id} placeholder image needs alt text that says it is a placeholder.`);
      }
      if (placeholder && !/not a photograph/i.test(alt)) {
        throw new Error(`${project.id} placeholder alt text must say it is not a photograph.`);
      }
      if (!placeholder && /placeholder/i.test(alt)) {
        throw new Error(`${project.id} uses a real image path but the alt text still says placeholder.`);
      }
    }
  }
  if (!list.some((project) => project.featured)) {
    throw new Error("Mark at least one project as featured for the home page.");
  }
  for (const service of SERVICES) {
    if (!list.some((project) => project.service === service)) {
      throw new Error(`Add at least one ${service} project.`);
    }
  }
}

function placeholderSvg(project, side) {
  const before = side === "before";
  const bg = before ? "#efe6d6" : "#5c3b2a";
  const fg = before ? "#241c16" : "#f6f0e6";
  const line = before ? "#8d7b68" : "#e4c7a8";
  const layouts = {
    renovation: [
      [80, 140, 460, 280],
      [580, 140, 520, 130],
      [580, 300, 240, 200],
      [850, 300, 250, 200],
    ],
    carpentry: [
      [90, 150, 170, 390],
      [290, 150, 170, 390],
      [490, 150, 170, 390],
      [700, 210, 390, 280],
    ],
    restoration: [
      [120, 190, 960, 70],
      [170, 290, 860, 190],
      [230, 510, 180, 36],
      [790, 510, 180, 36],
    ],
  };
  const shapes = (layouts[project.service] || layouts.renovation)
    .map(([x, y, w, h]) => {
      if (before) {
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${line}" stroke-width="8"/>`;
      }
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${line}"/>`;
    })
    .join("");
  const hatch = before
    ? `<g stroke="${line}" stroke-width="2" opacity="0.55">${Array.from({ length: 14 }, (_, index) => {
        const x = 48 + index * 36;
        return `<line x1="${x}" y1="48" x2="${x}" y2="540"/>`;
      }).join("")}</g>`
    : "";
  const word = before ? "BEFORE" : "AFTER";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <rect width="1200" height="800" fill="${bg}"/>
  ${hatch}
  <rect x="24" y="24" width="1152" height="752" fill="none" stroke="${fg}" stroke-width="3"/>
  ${shapes}
  <rect x="48" y="560" width="1104" height="190" fill="${bg}"/>
  <text x="72" y="630" fill="${fg}" font-family="Georgia, serif" font-size="26" letter-spacing="5">PLACEHOLDER</text>
  <text x="72" y="700" fill="${fg}" font-family="Georgia, serif" font-size="64">${word}</text>
  <text x="72" y="742" fill="${fg}" font-family="Georgia, serif" font-size="28">${escapeHtml(project.title)}</text>
  <text x="1128" y="742" fill="${fg}" text-anchor="end" font-family="Georgia, serif" font-size="22">Not a photograph</text>
</svg>
`;
}

function materializeImages() {
  for (const project of projects) {
    for (const side of ["before", "after"]) {
      const rel = project[side];
      const out = path.join(dist, rel);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      if (rel.startsWith("images/placeholders/")) {
        fs.writeFileSync(out, placeholderSvg(project, side));
        continue;
      }
      const src = path.join(root, "src", rel);
      if (!fs.existsSync(src)) throw new Error(`Missing src/${rel} for ${project.id}`);
      fs.copyFileSync(src, out);
    }
  }
}

function figure(project) {
  const labelId = `label-${project.id}`;
  const hintId = `hint-${project.id}`;
  const credit =
    project.service === "restoration"
      ? `<p class="credit">Work done as an apprentice at <a href="${VOLLANA}">Vollana Antiques</a>. The piece is the shop's, shown with their permission, not as Estefano's alone.</p>`
      : "";
  return `<figure class="project" id="${escapeHtml(project.id)}">
      <div class="compare" data-compare style="--pos: 50">
        <div class="compare__stage">
          <img class="compare__img" src="${href(`/${project.after}`)}" alt="${escapeHtml(project.afterAlt)}" width="1200" height="800" decoding="async">
          <div class="compare__clip">
            <img class="compare__img" src="${href(`/${project.before}`)}" alt="${escapeHtml(project.beforeAlt)}" width="1200" height="800" decoding="async">
          </div>
          <span class="compare__tag compare__tag--before" aria-hidden="true">Before</span>
          <span class="compare__tag compare__tag--after" aria-hidden="true">After</span>
          <div class="compare__bar" aria-hidden="true"><span class="compare__grip"></span></div>
        </div>
        <label class="compare__label">
          <span class="visually-hidden" id="${labelId}">Before and after: ${escapeHtml(project.title)}</span>
          <input class="compare__range" type="range" min="0" max="100" value="50" step="1" aria-labelledby="${labelId}" aria-describedby="${hintId}">
        </label>
        <p class="compare__hint" id="${hintId}">Drag the photo or the slider. The left side is before.</p>
      </div>
      <figcaption>
        <p class="project__meta">${escapeHtml(SERVICE_LABEL[project.service])} · New York City</p>
        <p class="project__title">${escapeHtml(project.title)}</p>
        <p>${escapeHtml(project.summary)}</p>
        ${credit}
      </figcaption>
    </figure>`;
}

function projectGroup(service, title, intro) {
  const items = projects.filter((project) => project.service === service).map((project) => figure(project)).join("\n");
  return `<section class="section" aria-labelledby="group-${service}">
      <h2 id="group-${service}">${escapeHtml(title)}</h2>
      ${intro || ""}
      <div class="project-list">
        ${items}
      </div>
    </section>`;
}

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: site.name,
    description:
      "Antique wood restoration, custom carpentry, and full renovations in New York City.",
    url: `${origin}/`,
    image: `${origin}/favicon.svg`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "New York",
      addressRegion: site.region,
      addressCountry: "US",
    },
    areaServed: {
      "@type": "City",
      name: site.city,
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Antique repair and wood restoration",
            description:
              "Repair and wood restoration done as an apprentice at Vollana Antiques, shown with the shop's permission.",
            url: `${origin}/restoration/`,
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Custom carpentry",
            description: "Kitchen cabinets, doors, closets, and built-ins.",
            url: `${origin}/carpentry/`,
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Full renovations",
            description: "Plumbing, electrical, kitchens, bathrooms, framing, and flooring.",
            url: `${origin}/renovations/`,
          },
        },
      ],
    },
  };
}

function navList(currentId) {
  return nav
    .map((item) => {
      const target = pages.find((page) => page.id === item.id);
      const current = currentId === item.id ? ' aria-current="page"' : "";
      const cls = item.cta ? ' class="nav__cta"' : "";
      return `<li${cls}><a href="${href(target.path)}"${current}>${escapeHtml(item.label)}</a></li>`;
    })
    .join("");
}

function layout(page, body) {
  const robots = page.robots
    ? `<meta name="robots" content="${escapeHtml(page.robots)}">`
    : `<meta name="robots" content="index, follow">`;
  const structured = page.jsonld
    ? `<script type="application/ld+json">${JSON.stringify(jsonLd())}</script>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}">
  <link rel="canonical" href="${canonical(page.path)}">
  ${robots}
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.description)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonical(page.path)}">
  <meta name="theme-color" content="#f4efe6">
  <link rel="icon" href="${href("/favicon.svg")}" type="image/svg+xml">
  <link rel="stylesheet" href="${href("/css/site.css")}">
  ${structured}
</head>
<body>
  <a class="skip" href="#content">Skip to content</a>
  <header class="mast">
    <div class="wrap mast__inner">
      <div class="brand">
        <a class="wordmark" href="${href("/")}">Estefano</a>
        <p class="brand__place">New York City</p>
      </div>
      <nav class="nav" aria-label="Primary">
        <ul class="nav__list">
          ${navList(page.id)}
        </ul>
      </nav>
    </div>
  </header>
  <main id="content" class="wrap">
    ${body}
  </main>
  <footer class="foot">
    <div class="wrap">
      <p class="foot__name">Estefano</p>
      <p>Service area: NYC.</p>
      <ul class="foot__services">
        ${serviceOrder
          .map((service) => {
            const target = pages.find((page) => page.id === service.id);
            return `<li><a href="${href(target.path)}">${escapeHtml(service.full)}</a></li>`;
          })
          .join("")}
      </ul>
      <dl class="contact">
        <div><dt>Phone</dt><dd class="todo">TODO</dd></div>
        <div><dt>Email</dt><dd>${EMAIL_LINK}</dd></div>
      </dl>
      <p class="foot__credit">Antique repair and wood restoration on this site is work Estefano did as an apprentice at <a href="${VOLLANA}">Vollana Antiques</a>. Those pieces are the shop's, shown with permission.</p>
    </div>
  </footer>
  <script type="module" src="${href("/js/compare.js")}"></script>
  <script type="module" src="${href("/js/quote.js")}"></script>
</body>
</html>
`;
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === ".gitkeep") continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function writeSitemap() {
  const urls = pages
    .filter((page) => page.sitemap !== false)
    .map((page) => `  <url><loc>${canonical(page.path)}</loc></url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  fs.writeFileSync(path.join(dist, "sitemap.xml"), xml);
  fs.writeFileSync(
    path.join(dist, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`,
  );
}

function build() {
  assertProjects(projects);
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
  copyDir(path.join(root, "src/css"), path.join(dist, "css"));
  copyDir(path.join(root, "src/js"), path.join(dist, "js"));
  copyDir(path.join(root, "src/fonts"), path.join(dist, "fonts"));
  copyDir(path.join(root, "src/images"), path.join(dist, "images"));
  fs.copyFileSync(path.join(root, "src/favicon.svg"), path.join(dist, "favicon.svg"));
  materializeImages();
  fs.writeFileSync(path.join(dist, ".nojekyll"), "");

  const featured = projects.filter((project) => project.featured);
  const tokens = {
    "{{featured-hero}}": figure(featured[0]),
    "{{featured-rest}}": featured.slice(1).map((project) => figure(project)).join("\n"),
    "{{projects-renovation}}": projects
      .filter((project) => project.service === "renovation")
      .map((project) => figure(project))
      .join("\n"),
    "{{projects-carpentry}}": projects
      .filter((project) => project.service === "carpentry")
      .map((project) => figure(project))
      .join("\n"),
    "{{projects-restoration}}": projects
      .filter((project) => project.service === "restoration")
      .map((project) => figure(project))
      .join("\n"),
    "{{projects-all}}": [
      projectGroup(
        "restoration",
        "Antique repair and wood restoration",
        `<p class="credit">These pieces are work Estefano did as an apprentice at <a href="${VOLLANA}">Vollana Antiques</a>. They are the shop's, shown with permission, not his alone.</p>`,
      ),
      projectGroup("carpentry", "Custom carpentry"),
      projectGroup("renovation", "Full renovations"),
    ].join("\n"),
    "{{testimonial}}": testimonialHtml,
    "{{email-link}}": EMAIL_LINK,
  };

  for (const page of pages) {
    let body = fs.readFileSync(path.join(root, "src/pages", page.template), "utf8");
    for (const [token, html] of Object.entries(tokens)) body = body.replaceAll(token, html);
    for (const target of pages) {
      if (target.id === "404") continue;
      body = body.replaceAll(`{{page:${target.id}}}`, href(target.path));
    }
    body = body.replaceAll("{{page:home}}", href("/"));
    if (body.includes("{{")) throw new Error(`Unreplaced token in ${page.template}`);
    const file = path.join(dist, page.out);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, layout(page, body));
  }

  writeSitemap();
  console.log(`Built ${pages.length} pages in dist/`);
}

build();
