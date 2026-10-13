import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "msedge" });
for (const [id, url, scroll] of [
  ["techstage-detail", "https://techstage.ru/", 900],
  ["td-music-detail", "https://dev.td-music.ru/catalog", 0],
  ["aurum-detail", "https://aurum-accordions.ru/catalog/", 0],
  ["gnosis-app", "https://gnosis-astro.ru/gnosis/", 0],
]) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  try {
    const r = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 40000,
    });
    await page.waitForTimeout(4500);
    if (!r.ok()) throw Error("HTTP " + r.status());
    if (scroll) await page.evaluate((y) => window.scrollTo(0, y), scroll);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `artifacts/${id}.png` });
    console.log(id, r.status(), await page.title());
  } finally {
    await page.close();
  }
}
await browser.close();
