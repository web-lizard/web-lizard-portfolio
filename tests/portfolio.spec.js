import { test, expect } from "@playwright/test";
const ids = [
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
];
test("all direct hashes, aliases, assets and desktop layout", async ({
  page,
}) => {
  const errors = [],
    bad = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().startsWith("http://127.0.0.1:4174") && r.status() >= 400)
      bad.push(r.url());
  });
  for (const id of ids) {
    await page.goto("/#" + id);
    await expect(page.locator(".scene.active")).toHaveAttribute("id", id);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1050);
    await expect(page.locator(".scene.active")).toHaveJSProperty(
      "inert",
      false,
    );
    expect(await page.evaluate(() => scrollY)).toBe(0);
    expect(
      await page
        .locator(".scene.active")
        .evaluate((s) => Math.round(s.getBoundingClientRect().top)),
    ).toBe(0);
    expect(
      await page
        .locator(".scene.active")
        .evaluate((s) => s.scrollWidth <= s.clientWidth + 1),
    ).toBeTruthy();
    await page.screenshot({
      path: `artifacts/qa-desktop-${id}.png`,
      animations: "disabled",
    });
  }
  for (const [alias, id] of [
    ["projects", "modern"],
    ["eras", "philosophy"],
    ["archive", "legacy"],
    ["workflow", "ai"],
  ]) {
    await page.goto("/#" + alias);
    await expect(page.locator(".scene.active")).toHaveAttribute("id", id);
  }
  expect(errors).toEqual([]);
  expect(bad).toEqual([]);
});
test("wheel burst, keyboard, backward history and scene navigation", async ({
  page,
}) => {
  await page.goto("/#home");
  for (let i = 0; i < 15; i++) await page.mouse.wheel(0, 100);
  await expect(page.locator(".scene.active")).toHaveAttribute(
    "id",
    "philosophy",
  );
  await expect(page.locator("#scenes")).not.toHaveClass(/is-transitioning/);
  await page.keyboard.press("PageDown");
  await expect(page.locator(".scene.active")).toHaveAttribute("id", "modern");
  await expect(page.locator("#scenes")).not.toHaveClass(/is-transitioning/);
  await page.keyboard.press("ArrowUp");
  await expect(page.locator(".scene.active")).toHaveAttribute(
    "id",
    "philosophy",
  );
  await expect(page.locator("#scenes")).not.toHaveClass(/is-transitioning/);
  await page.keyboard.press("Space");
  await expect(page.locator(".scene.active")).toHaveAttribute("id", "modern");
  await page.locator('.scene-nav a[href="#contact"]').click();
  await expect(page).toHaveURL(/#contact$/);
  await page.goBack();
  await expect(page.locator(".scene.active")).toHaveAttribute("id", "modern");
});
test("trackpad inertia crosses one scene with overlapping animated frames", async ({
  page,
}) => {
  await page.goto("/#home");
  await page.mouse.wheel(0, 120);
  await expect(page.locator(".scene.active")).toHaveAttribute(
    "id",
    "philosophy",
  );
  await expect(page.locator("#home")).toHaveClass(/exiting/);
  await expect(page.locator("#philosophy")).toHaveClass(/entering/);
  await page.waitForTimeout(180);
  const midpoint = await page.evaluate(() => ({
    oldOpacity: Number(
      getComputedStyle(document.querySelector("#home")).opacity,
    ),
    newOpacity: Number(
      getComputedStyle(document.querySelector("#philosophy")).opacity,
    ),
    oldVisible: getComputedStyle(document.querySelector("#home")).visibility,
    newVisible: getComputedStyle(document.querySelector("#philosophy"))
      .visibility,
  }));
  expect(midpoint.oldOpacity).toBeGreaterThan(0);
  expect(midpoint.oldOpacity).toBeLessThan(1);
  expect(midpoint.newOpacity).toBeGreaterThan(0);
  expect(midpoint.newOpacity).toBeLessThan(1);
  expect(midpoint.oldVisible).toBe("visible");
  expect(midpoint.newVisible).toBe("visible");
  await page.evaluate(async () => {
    for (let i = 0; i < 90; i++) {
      document.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaY: 18,
        }),
      );
      await new Promise((resolve) => setTimeout(resolve, 16));
    }
  });
  await expect(page.locator(".scene.active")).toHaveAttribute(
    "id",
    "philosophy",
  );
  await expect(page.locator("#scenes")).not.toHaveClass(/is-transitioning/);
  await page.waitForTimeout(280);
  await page.mouse.wheel(0, 120);
  await expect(page.locator(".scene.active")).toHaveAttribute("id", "modern");
});
test("project tabs, all screenshot galleries and keyboard focus", async ({
  page,
}) => {
  await page.goto("/#modern");
  for (const tab of await page.locator("#modern-tabs button").all()) {
    await tab.click();
    const images = page.locator("#modern-stage .browser-frame img");
    await expect(images).toHaveJSProperty("complete", true);
    expect(await images.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
    await page.locator("#modern-stage [data-gallery]").click();
    await expect(page.locator("#gallery")).toBeVisible();
    for (let i = 0; i < 2; i++) {
      await expect(page.locator("#gallery-image")).toHaveJSProperty(
        "complete",
        true,
      );
      expect(
        await page
          .locator("#gallery-image")
          .evaluate((img) => img.naturalWidth),
      ).toBeGreaterThan(0);
      await page.locator("#gallery-next").click();
    }
    await page.keyboard.press("Escape");
    await expect(page.locator("#gallery")).not.toBeVisible();
  }
  await page.locator("#modern-tabs button").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#modern-tabs button").nth(1)).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.goto("/#legacy");
  for (const tab of await page.locator("#legacy-tabs button").all()) {
    await tab.click();
    const image = page.locator("#legacy-stage img");
    if (await image.count()) {
      await expect(image).toHaveJSProperty("complete", true);
      expect(await image.evaluate((img) => img.naturalWidth)).toBeGreaterThan(
        0,
      );
    }
  }
  await page.goto("/#gnosis");
  await page.locator('[data-gallery="gnosis"]').click();
  for (let i = 0; i < 3; i++) {
    await expect(page.locator("#gallery-image")).toHaveJSProperty(
      "complete",
      true,
    );
    expect(
      await page.locator("#gallery-image").evaluate((img) => img.naturalWidth),
    ).toBeGreaterThan(0);
    await page.locator("#gallery-next").click();
  }
});
test("mobile chapters form a natural vertical document", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const id of ids) {
      await page.goto("/#" + id);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(`#${id}`)).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${width} ${id}`,
      ).toBeTruthy();
      if (width === 390)
        await page.screenshot({
          path: `artifacts/qa-mobile-${id}.png`,
          animations: "disabled",
        });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#home");
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 650);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
  expect(await page.locator(".scene").count()).toBe(10);
  expect(await page.locator(".scene[inert]").count()).toBe(0);
  await context.close();
});
test("reduced motion and absent canvas/WebGL degrade cleanly", async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/#home");
  await page.locator('a.button[href="#modern"]').click();
  await expect(page.locator(".scene.active")).toHaveAttribute("id", "modern");
  await page.goto("/#systems");
  await page.locator('a[href="/approach/"]').click();
  await expect(page).toHaveURL(/\/approach\/$/);
  await expect(page.locator("h1")).toContainText("Я ВОЗЬМУ НА СЕБЯ AI");
  expect(errors).toEqual([]);
  await context.close();
});
