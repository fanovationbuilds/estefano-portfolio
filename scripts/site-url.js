// The published address is one value, `url` in data/site.json.
// Its path is the link prefix: `/estefano-portfolio` on GitHub Pages,
// or nothing when the site is served from a domain root.

export function resolveSite(site) {
  if (!site || typeof site.url !== "string" || site.url.trim() === "") {
    throw new Error("data/site.json needs a url.");
  }
  let parsed;
  try {
    parsed = new URL(site.url);
  } catch {
    throw new Error(`data/site.json url is not absolute: ${site.url}`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error("data/site.json url must use https.");
  }
  if (parsed.search || parsed.hash) {
    throw new Error("data/site.json url should be the origin and path only.");
  }
  const basePath = parsed.pathname.replace(/\/$/, "");
  const origin = `${parsed.origin}${basePath}`;

  function href(pathname) {
    if (!pathname.startsWith("/")) {
      throw new Error(`Site paths must start with /: ${pathname}`);
    }
    if (pathname === "/") return basePath === "" ? "/" : `${basePath}/`;
    return `${basePath}${pathname}`;
  }

  function canonical(pathname) {
    if (pathname === "/") return `${origin}/`;
    return `${origin}${pathname}`;
  }

  return { origin, basePath, href, canonical };
}
