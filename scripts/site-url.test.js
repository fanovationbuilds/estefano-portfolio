import assert from "node:assert/strict";
import test from "node:test";
import { resolveSite } from "./site-url.js";

test("GitHub Pages project path", () => {
  const site = resolveSite({ url: "https://fanovationbuilds.github.io/estefano-portfolio" });
  assert.equal(site.origin, "https://fanovationbuilds.github.io/estefano-portfolio");
  assert.equal(site.basePath, "/estefano-portfolio");
  assert.equal(site.href("/"), "/estefano-portfolio/");
  assert.equal(site.href("/quote/"), "/estefano-portfolio/quote/");
  assert.equal(site.href("/images/logo.webp"), "/estefano-portfolio/images/logo.webp");
  assert.equal(site.canonical("/"), "https://fanovationbuilds.github.io/estefano-portfolio/");
  assert.equal(
    site.canonical("/about/"),
    "https://fanovationbuilds.github.io/estefano-portfolio/about/",
  );
});

test("custom domain root", () => {
  const site = resolveSite({ url: "https://fanovationbuilds.com" });
  assert.equal(site.origin, "https://fanovationbuilds.com");
  assert.equal(site.basePath, "");
  assert.equal(site.href("/"), "/");
  assert.equal(site.href("/quote/"), "/quote/");
  assert.equal(site.href("/css/site.css"), "/css/site.css");
  assert.equal(site.canonical("/"), "https://fanovationbuilds.com/");
  assert.equal(site.canonical("/work/"), "https://fanovationbuilds.com/work/");
});

test("a trailing slash does not change the prefix", () => {
  const pages = resolveSite({ url: "https://fanovationbuilds.github.io/estefano-portfolio/" });
  const root = resolveSite({ url: "https://fanovationbuilds.com/" });
  assert.equal(pages.href("/restoration/"), "/estefano-portfolio/restoration/");
  assert.equal(root.href("/"), "/");
  assert.equal(root.canonical("/quote/"), "https://fanovationbuilds.com/quote/");
});
