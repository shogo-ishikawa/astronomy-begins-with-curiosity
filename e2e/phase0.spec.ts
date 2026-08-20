import { expect, test } from "@playwright/test";

test("空の研究を保存し、再読込後も再開できる", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /ABCs/ })).toBeVisible();
  await page.getByRole("button", { name: "新しい研究を始める" }).click();
  await expect(
    page.getByText("保存済みの状態から再開しました。"),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("保存済みの状態から再開しました。"),
  ).toBeVisible();
  await page.getByRole("button", { name: /プロジェクト一覧へ/ }).click();
  await expect(
    page.getByRole("button", { name: "続きから始める" }),
  ).toBeVisible();
});
