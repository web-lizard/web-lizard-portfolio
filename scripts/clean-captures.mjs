import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "msedge" });
const pages = [
  ["td-music", "https://dev.td-music.ru/", 0],
  ["td-music-detail", "https://dev.td-music.ru/catalog", 500],
  ["aurum", "https://aurum-accordions.ru/", 0],
  ["aurum-detail", "https://aurum-accordions.ru/catalog/", 650],
  ["gnosis", "https://gnosis-astro.ru/", 0],
  ["gnosis-detail", "https://gnosis-astro.ru/", 900],
  ["gnosis-app", "https://gnosis-astro.ru/gnosis/", 0],
  ["paxra", "https://paxra.ru/", 0],
  ["nevskaya", "https://nevskaya-usadba.ru/", 0],
];
for (let i = 0; i < pages.length; i += 3)
  await Promise.all(
    pages.slice(i, i + 3).map(async ([id, url, scroll]) => {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      try {
        const r = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 40000,
        });
        if (!r.ok()) throw Error(r.status());
        await page.waitForTimeout(4500);
        for (const label of [
          "Только необходимые",
          "Отклонить",
          "Без аналитики",
          "ПРОПУСТИТЬ",
        ]) {
          const item = page.getByText(label, { exact: true }).first();
          if (await item.isVisible()) await item.click({ timeout: 5000 });
        }
        await page.waitForTimeout(id === "nevskaya" ? 8000 : 1000);
        if (scroll) await page.evaluate((y) => window.scrollTo(0, y), scroll);
        await page.waitForTimeout(1200);
        await page.screenshot({ path: `artifacts/${id}.png` });
        console.log(id, "captured");
      } finally {
        await page.close();
      }
    }),
  );
await browser.close();
