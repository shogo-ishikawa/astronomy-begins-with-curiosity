import { expect, test } from "@playwright/test";

const viewports = [
  { width: 1600, height: 1000 },
  { width: 1200, height: 900 },
  { width: 1024, height: 768 },
  { width: 960, height: 900 },
  { width: 959, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
];

for (const viewport of viewports)
  test(`workspace layout ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("./#/", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "新しい研究を始める" }).click();
    const work = page.locator(".work-card");
    const rail = page.locator(".companion-rail");
    await expect(work).toBeVisible();
    await expect(rail).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    const workBox = await work.boundingBox();
    const railBox = await rail.boundingBox();
    expect(workBox).not.toBeNull();
    expect(railBox).not.toBeNull();
    if (viewport.width >= 960) {
      expect(railBox!.x).toBeGreaterThanOrEqual(workBox!.x + workBox!.width);
      expect(railBox!.width).toBeGreaterThanOrEqual(
        viewport.width >= 1200 ? 380 : 304,
      );
      expect(railBox!.width).toBeLessThanOrEqual(
        viewport.width >= 1200 ? 440 : 336,
      );
    } else {
      expect(railBox!.y).toBeGreaterThanOrEqual(workBox!.y + workBox!.height);
      expect(
        await rail.evaluate((node) => getComputedStyle(node).position),
      ).toBe("static");
      expect(
        await page
          .locator(".context-panel:not([hidden])")
          .evaluate((node) => getComputedStyle(node).overflowY),
      ).not.toBe("auto");
    }
  });
