import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pages, SITE_URL } from "../src/seo/pages.js";

const frontend = fileURLToPath(new URL("../", import.meta.url));
const read = file => readFile(path.join(frontend, "build", file), "utf8");
test("public build includes readable content, crawlable links and matching metadata", async () => {
  const titles = new Set();
  for (const page of pages) {
    const html = await read(path.join(page.path.slice(1), "index.html"));
    assert.ok(html.includes("<h1"), page.path + " needs a rendered heading");
    assert.ok(html.includes(page.heading || "Suas fichas de RPG."));
    assert.ok(html.includes('<link rel="canonical" href="' + SITE_URL + page.path + '"'));
    assert.ok(html.includes('<meta name="description" content="' + page.description + '"'));
    assert.ok(html.includes('<meta property="og:url" content="' + SITE_URL + page.path + '"'));
    assert.ok(html.includes("<title>" + page.title + "</title>"));
    assert.ok(!html.includes("noindex"), page.path + " must remain indexable");
    assert.ok(html.includes('href="/register"'));
    for (const related of pages.filter(item => item.path !== "/" && item.path !== page.path)) {
      assert.ok(html.includes('href="' + related.path + '"'), "missing internal link");
    }
    titles.add(page.title);
  }
  assert.equal(titles.size, pages.length);
});
test("sitemap contains exactly the public URLs and is advertised in robots.txt", async () => {
  const xml = await read("sitemap.xml");
  assert.ok(xml.startsWith('<?xml version="1.0"'));
  assert.equal((xml.match(/<loc>/g) || []).length, pages.length);
  for (const page of pages) assert.ok(xml.includes("<loc>" + SITE_URL + page.path + "</loc>"));
  assert.ok(!xml.includes("/app"));
  const robots = await read("robots.txt");
  assert.ok(robots.includes("Sitemap: " + SITE_URL + "/sitemap.xml"));
  assert.ok(robots.includes("Disallow: /app"));
});
test("private shell has no public content or canonical and is excluded from indexing", async () => {
  const html = await read("app-shell.html");
  assert.ok(html.includes('name="robots" content="noindex,follow"'));
  assert.ok(!html.includes('rel="canonical"'));
  assert.ok(html.includes('<div id="root"></div>'));
});
test("hosting routes preserve public HTML and serve the private shell for app URLs", async () => {
  const config = await readFile(path.join(frontend, "..", "render.yaml"), "utf8");
  for (const page of pages.filter(item => item.path !== "/")) {
    assert.ok(config.includes("source: " + page.path + "\n"));
    assert.ok(config.includes("destination: " + page.path + "/index.html"));
  }
  assert.ok(config.includes("destination: /app-shell.html"));
});
