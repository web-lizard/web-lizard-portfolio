import { test, expect } from "@playwright/test";

test("every French marker has a plain-language pronunciation tooltip", async ({
  page,
}) => {
  await page.goto("/#philosophy");
  const expected = [
    "ÉVIDEMMENT",
    "AVANT",
    "OUI",
    "PREUVES",
    "ARCHIVE",
    "HÉRÉSIE",
    "CRÉATION",
    "SYSTÈMES",
    "DIALOGUE",
    "MÉTIER",
    "PARLONS",
    "FEU",
    "HUMAIN AUX COMMANDES",
    "LÉZARD",
  ];
  for (const term of expected)
    await expect(
      page.locator(`.fr-term[data-fr="${term}"]`).first(),
    ).toBeAttached();
  const oui = page.locator('#philosophy .fr-term[data-fr="OUI"]');
  await oui.hover();
  await expect(page.locator("#fr-tooltip")).toBeVisible();
  await expect(page.locator("#fr-tooltip")).toContainText(
    "ЭТО ФРАНЦУЗСКИЙ ЯЗЫК",
  );
  await expect(page.locator("#fr-tooltip")).toContainText("/wi/");
  await expect(page.locator("#fr-tooltip")).toContainText("Прямой ответ");
  expect(
    await oui.evaluate(
      (element) => getComputedStyle(element, "::after").content,
    ),
  ).toContain("FR");
  await page.locator('.scene-nav a[href="#modern"]').focus();
  await expect(page.locator("#fr-tooltip")).toContainText("PREUVES");
  await page.setViewportSize({ width: 390, height: 844 });
  await oui.click();
  await expect(page.locator("#fr-tooltip")).toBeVisible();
  await page.goto("/approach/");
  await expect(page.locator('.fr-term[data-fr="MÉTIER"]')).toBeAttached();
});

test("lore remains readable and book notes open with keyboard without changing chapter", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 768, 1882]) {
    await page.setViewportSize({ width, height: 1034 });
    await page.goto(`/?lore-check=${width}#stack`);
    const summary = page.locator(".lore-books summary");
    await summary.scrollIntoViewIfNeeded();
    await summary.focus();
    await page.keyboard.press("Space");
    await expect(page.locator(".lore-books")).toHaveAttribute("open", "");
    await expect(page).toHaveURL(/#stack$/);
    await page.locator(".lore-thesis").scrollIntoViewIfNeeded();
    const thesis = await page.locator(".lore-thesis").boundingBox();
    const footer = await page.locator(".footer").boundingBox();
    expect(thesis.y + thesis.height).toBeLessThanOrEqual(footer.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBeTruthy();
    const word = page.locator('.lore-block [data-fr="LÉZARD"]');
    await word.scrollIntoViewIfNeeded();
    await word.focus();
    await expect(page.locator("#fr-tooltip")).toContainText("/le.zaʁ/");
    await expect(page.locator("#fr-tooltip")).toContainText(
      "ЭТО ФРАНЦУЗСКИЙ ЯЗЫК",
    );
    await page.locator("#lore-title").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `artifacts/qa-lore-${width}.png` });
  }
});

test("reasoning map exposes feedback loops with mouse, keyboard and reduced motion", async ({
  page,
}) => {
  await page.goto("/#ai");
  const error = page.locator('[data-step="error"]');
  await error.hover();
  await expect(page.locator("#reasoning-detail")).toContainText(
    "Ошибка → уточнение → AI",
  );
  await expect(page.locator('[data-edge="clarify:ai"]')).toHaveClass(
    /on-route/,
  );
  await error.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-step="clarify"]')).toBeFocused();
  await expect(page.locator(".scene.active")).toHaveAttribute("id", "ai");
  await page.locator('[data-step="constraint"]').click();
  await expect(page.locator("#reasoning-detail")).toContainText(
    "Новое условие → итерация → контекст",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".reasoning-edges .on-route")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});

test("tablet, short desktop and wide desktop retain reachable chapter content", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const viewport of [
    { width: 768, height: 844 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    for (const id of [
      "home",
      "philosophy",
      "modern",
      "legacy",
      "gnosis",
      "stack",
      "beyond",
      "ai",
      "systems",
      "contact",
    ]) {
      await page.locator(`.scene-nav a[href="#${id}"]`).click();
      const scene = page.locator(`#${id}`);
      await expect(scene).toHaveClass(/active/);
      expect(
        await scene.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        `${viewport.width}: ${id}`,
      ).toBeTruthy();
      const last = scene.locator("a, button").last();
      if (await last.count()) {
        await last.scrollIntoViewIfNeeded();
        const box = await last.boundingBox();
        expect(
          box.y + box.height,
          `${viewport.width}: ${id} last control`,
        ).toBeLessThanOrEqual(viewport.height - 60);
      }
      if (viewport.width === 768)
        await page.screenshot({ path: `artifacts/qa-tablet-${id}.png` });
    }
  }
});

test("very short desktop does not place the hero note under its actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 756, height: 428 });
  await page.goto("/#home");
  await expect(page.locator(".hero-bottom")).toBeHidden();
  await page.locator(".hero-actions").scrollIntoViewIfNeeded();
  const actions = await page.locator(".hero-actions").boundingBox();
  const footer = await page.locator(".footer").boundingBox();
  expect(actions.y + actions.height).toBeLessThanOrEqual(footer.y);
  await page.screenshot({ path: "artifacts/qa-short-hero.png" });
});

test("desktop hero actions do not collide with the bottom prompt", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1882, height: 1034 });
  await page.goto("/#home");
  await expect(page.locator(".hero-bottom p")).toHaveCount(0);
  const actions = await page.locator(".hero-actions").boundingBox();
  const prompt = await page.locator(".scroll-prompt").boundingBox();
  expect(actions.y + actions.height).toBeLessThan(prompt.y);
  await page.screenshot({ path: "artifacts/qa-desktop-hero-1882x1034.png" });
});

test("mobile reading position, chapter buttons, tap interaction and resizing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#home");
  const heading = await page.locator("h1").boundingBox();
  const portrait = await page.locator(".hero-art").boundingBox();
  expect(heading.y).toBeLessThan(portrait.y);
  await page.locator("#next").click();
  await expect(page.locator("#scene-number")).toHaveText("02");
  await page
    .locator("#ai")
    .evaluate((el) => el.scrollIntoView({ behavior: "instant" }));
  await expect(page.locator("#scene-number")).toHaveText("08");
  await expect(page).toHaveURL(/#ai$/);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".scene.active")).toHaveAttribute("id", "ai");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-step="error"]').click();
  await expect(page.locator("#reasoning-detail")).toContainText(
    "Ошибка → уточнение → AI",
  );
  await page.locator("#next").click();
  await expect(page).toHaveURL(/#systems$/);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".scene.active")).toHaveAttribute("id", "systems");
  await expect(page.locator(".scene[inert]")).toHaveCount(9);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".scene[inert]")).toHaveCount(0);
  await expect(page.locator("#scene-number")).toHaveText("09");
});

test("approach article is readable at narrow widths and links back to the chapter", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/approach/");
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${width}: article overflow`,
    ).toBeTruthy();
    await expect(page.locator(".article-cta a")).toHaveAttribute(
      "href",
      "https://t.me/Jaroslavsuveren",
    );
    await page.screenshot({
      path: `artifacts/qa-article-${width}.png`,
      fullPage: true,
    });
  }
  await page.locator(".back").click();
  await expect(page.locator(".scene.active")).toHaveAttribute("id", "systems");
  expect(errors).toEqual([]);
});
