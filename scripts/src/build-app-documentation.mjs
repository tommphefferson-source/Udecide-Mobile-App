// Renders docs/feature-documentation.html (Part 1) and docs/developer-guide.html
// (Part 2) to PDF with headless Chrome, then merges them into the combined
// UDecide_Application_Documentation.pdf at the repo root.
//
// Run: node scripts/src/build-app-documentation.mjs
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { PDFDocument } from "pdf-lib";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.join(repo, "UDecide_Application_Documentation.pdf");

const parts = [
  path.join(repo, "docs", "feature-documentation.html"),
  path.join(repo, "docs", "developer-guide.html"),
];

async function renderPdf(browser, htmlPath) {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle0" });
  const buf = await page.pdf({
    width: "8.5in",
    height: "11in",
    printBackground: true,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  await page.close();
  return buf;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const merged = await PDFDocument.create();
  for (const html of parts) {
    const buf = await renderPdf(browser, html);
    const doc = await PDFDocument.load(buf);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
    console.log(`rendered ${path.basename(html)}: ${doc.getPageCount()} pages`);
  }
  if (existsSync(OUT)) {
    copyFileSync(OUT, OUT.replace(/\.pdf$/, ".backup.pdf"));
    console.log("backed up previous PDF");
  }
  writeFileSync(OUT, await merged.save());
  console.log(`wrote ${OUT} (${merged.getPageCount()} pages)`);
} finally {
  await browser.close();
}
