import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const projects = [
  ["td-music", "https://dev.td-music.ru/"],
  ["aurum", "https://aurum-accordions.ru/"],
  ["techstage", "https://techstage.ru/"],
  ["paxra", "https://paxra.ru/"],
  ["nfk24", "https://nfk24.ru/"],
  ["begarat", "https://press.begarat.ru/"],
  ["leadpulse", "https://leadpulse.ru/"],
  ["nevskaya", "https://nevskaya-usadba.ru/"],
  ["donstroy", "https://donstroy.moscow/"],
  ["gnosis", "https://gnosis-astro.ru/"],
];
await mkdir("public/portfolio-media/projects", { recursive: true });
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const report = [];
for (let i = 0; i < projects.length; i += 3) {
  await Promise.all(
    projects.slice(i, i + 3).map(async ([id, url]) => {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 1,
      });
      try {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 35000,
        });
        await page.waitForTimeout(3500);
        const title = await page.title();
        const body = (await page.locator("body").innerText()).slice(0, 700);
        const blocked =
          !response?.ok() ||
          /сайт размещен некорректно|сайт не найден|access denied|checking your browser|домен продается|домен продаётся|502 bad|403 forbidden/i.test(
            title + " " + body,
          );
        if (!blocked) {
          await page.screenshot({ path: `artifacts/${id}.png` });
          if (["td-music", "aurum", "gnosis"].includes(id)) {
            await page.evaluate(() =>
              window.scrollTo(0, window.innerHeight * 0.85),
            );
            await page.waitForTimeout(800);
            await page.screenshot({ path: `artifacts/${id}-detail.png` });
          }
        }
        report.push({
          id,
          url,
          finalUrl: page.url(),
          status: response?.status(),
          title,
          body,
          usable: !blocked,
          capturedAt: new Date().toISOString(),
        });
        console.log(
          id,
          response?.status(),
          title,
          blocked ? "UNAVAILABLE" : "CAPTURED",
        );
      } catch (error) {
        report.push({
          id,
          url,
          usable: false,
          error: error.message.split("\n")[0],
        });
        console.log(id, "FAILED");
      } finally {
        await page.close();
      }
    }),
  );
}
await browser.close();
await writeFile(
  "artifacts/project-audit.json",
  JSON.stringify(report, null, 2),
);
