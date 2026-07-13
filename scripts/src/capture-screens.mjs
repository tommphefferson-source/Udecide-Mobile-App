import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`;
const OUT = path.resolve("docs/screenshots");
const EMAIL = process.env.DOCS_EMAIL;
const PASSWORD = process.env.DOCS_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error("Set DOCS_EMAIL and DOCS_PASSWORD env vars to a demo account.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function settle(page, extraMs = 2500) {
  try {
    await page.waitForNetworkIdle({ idleTime: 800, timeout: 20000 });
  } catch {}
  await sleep(extraMs);
}

function have(name) {
  return fs.existsSync(path.join(OUT, `${name}.png`));
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log("captured", name);
}

async function clickByText(page, text) {
  const rect = await page.evaluate((t) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const candidates = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.textContent.trim() === t) {
        let el = node.parentElement;
        while (el && getComputedStyle(el).cursor !== "pointer" && el !== document.body) {
          el = el.parentElement;
        }
        const clickable = el && el !== document.body;
        const target = clickable ? el : node.parentElement;
        const r = target.getBoundingClientRect();
        candidates.push({ clickable, x: r.x + r.width / 2, y: r.y + r.height / 2 });
      }
    }
    if (!candidates.length) return null;
    const pick = candidates.filter((c) => c.clickable).pop() || candidates.pop();
    return { x: pick.x, y: pick.y };
  }, text);
  if (!rect) throw new Error(`could not find "${text}"`);
  await page.mouse.click(rect.x, rect.y);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const executablePath = execSync("which chromium", { encoding: "utf8" }).trim();
  const browser = await puppeteer.launch({
    executablePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--force-device-scale-factor=2"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 870, deviceScaleFactor: 2 });

  // Public auth screens
  if (!have("01-login")) {
    console.log("loading login (first bundle load can be slow)...");
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector("input", { timeout: 120000 });
    await settle(page);
    await shot(page, "01-login");
  }

  if (!have("02-register")) {
    await page.goto(`${BASE}/register`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("input", { timeout: 60000 });
    await settle(page);
    await shot(page, "02-register");
  }

  if (!have("03-forgot-password")) {
    await page.goto(`${BASE}/forgot-password`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("input", { timeout: 60000 });
    await settle(page);
    await shot(page, "03-forgot-password");
  }

  // Log in
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("input", { timeout: 60000 });
  await settle(page, 1000);
  const inputs = await page.$$("input");
  await inputs[0].type(EMAIL, { delay: 10 });
  await inputs[1].type(PASSWORD, { delay: 10 });
  await clickByText(page, "Sign In");
  console.log("signing in...");
  try {
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Representatives") ||
        document.body.innerText.includes("Legislation"),
      { timeout: 90000 },
    );
  } catch (err) {
    const text = await page.evaluate(() => document.body.innerText.slice(0, 600));
    console.error("login wait failed; page text:", JSON.stringify(text));
    throw err;
  }
  await settle(page, 4000);
  if (!have("04-dashboard")) await shot(page, "04-dashboard");

  const routes = [
    ["representatives", "05-representatives", 6000],
    ["elections", "06-elections", 6000],
    ["legislation", "07-legislation", 6000],
    ["more", "08-more", 2500],
    ["voter-tools", "09-voter-tools", 4000],
    ["parties", "10-parties", 2500],
    ["political-guide", "11-political-guide", 2500],
    ["civics-quiz", "12-civics-quiz", 2500],
    ["polls", "13-polls", 5000],
    ["fact-checker", "14-fact-checker", 2500],
    ["profile", "15-profile", 4000],
    ["address-override", "16-address-override", 3000],
    ["issue-questionnaire", "17-issue-questionnaire", 6000],
  ];

  for (const [route, name, extra] of routes) {
    if (have(name)) continue;
    try {
      await page.goto(`${BASE}/${route}`, { waitUntil: "domcontentloaded", timeout: 90000 });
      await settle(page, extra);
      await shot(page, name);
    } catch (err) {
      console.error(`FAILED ${route}: ${err.message}`);
    }
  }

  await browser.close();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
