import { build } from "vite";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const frontend = fileURLToPath(new URL("../", import.meta.url));
process.chdir(frontend);
const output = path.join(frontend, "build");
const rendererDirectory = path.join(frontend, ".seo-render");
const escape = value => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

await build();
const template = await readFile(path.join(output, "index.html"), "utf8");
try {
  // Use the browser's public components without loading account data or calling the API.
  await build({
    build: {
      ssr: "src/seo/render.jsx",
      outDir: ".seo-render",
      rollupOptions: { output: { entryFileNames: "render.mjs" } },
    },
  });
  const { render, pages, SITE_URL } = await import(pathToFileURL(path.join(rendererDirectory, "render.mjs")).href);
  for (const page of pages) {
    const html = template
      .replace(/<title>.*?<\/title>/, () => "<title>" + escape(page.title) + "</title>")
      .replace(/(<meta name="description" content=")[^"]*(")/, (_, start, end) => start + escape(page.description) + end)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, (_, start, end) => start + escape(page.title) + end)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, (_, start, end) => start + escape(page.description) + end)
      .replace(/(<meta property="og:url" content=")[^"]*(")/, (_, start, end) => start + SITE_URL + page.path + end)
      .replace(/(<link rel="canonical" href=")[^"]*(")/, (_, start, end) => start + SITE_URL + page.path + end)
      .replace('<div id="root"></div>', () => '<div id="root">' + render(page) + "</div>");
    const directory = path.join(output, page.path.slice(1));
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "index.html"), html);
  }
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + pages.map(page => "  <url><loc>" + escape(SITE_URL + page.path) + "</loc></url>").join("\n")
    + "\n</urlset>\n";
  await writeFile(path.join(output, "sitemap.xml"), sitemap);
  const privateShell = template
    .replace(/<link rel="canonical"[^>]*\/>/, "")
    .replace("</head>", '<meta name="robots" content="noindex,follow" />\n</head>');
  await writeFile(path.join(output, "app-shell.html"), privateShell);
  console.log("SEO: rendered " + pages.length + " public pages, sitemap.xml and private app shell.");
} finally {
  await rm(rendererDirectory, { recursive: true, force: true });
}
