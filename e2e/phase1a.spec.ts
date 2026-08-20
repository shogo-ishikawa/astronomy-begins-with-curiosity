import { expect, test } from "@playwright/test";

test("研究への招待の選択とメモを再読込後に復元する", async ({ page }) => {
  await page.goto("./");
  await expect(
    page.getByText("開発中のプロトタイプ — v0.1-alpha / Phase 1A"),
  ).toBeVisible();
  await page.getByRole("button", { name: "新しい研究を始める" }).click();
  await expect(page.getByText(/私はMira/)).toBeVisible();
  await page.getByRole("button", { name: "研究への招待を始める" }).click();
  await expect(
    page.getByRole("heading", {
      name: "宇宙は、最初から網目模様だったのでしょうか？",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("模式図（実際の計算結果ではありません）"),
  ).toBeVisible();
  await page.getByRole("button", { name: "密度のむら" }).click();
  await expect(page.getByRole("heading", { name: "密度のむら" })).toBeVisible();
  await page.getByRole("radio", { name: /いつ構造が成長したか/ }).click();
  await page
    .getByLabel("任意メモ（書かなくても進められます）")
    .fill("中間の変化が気になる");
  await expect(page.getByText("保存しました。")).toBeVisible();
  await page.waitForTimeout(600);
  await page.reload();
  await expect(
    page.getByRole("radio", { name: /いつ構造が成長したか/ }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(
    page.getByLabel("任意メモ（書かなくても進められます）"),
  ).toHaveValue("中間の変化が気になる");
  await expect(page.getByText("関心を記録済み")).toBeVisible();
});

test("既存のPhase 0プロジェクト作成・一覧への復帰を維持する", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "新しい研究を始める" }).click();
  await page.reload();
  await expect(
    page.getByText("保存済みの状態から再開しました。"),
  ).toBeVisible();
  await page.getByRole("button", { name: /プロジェクト一覧へ/ }).click();
  await expect(
    page.getByRole("button", { name: "続きから始める" }),
  ).toBeVisible();
});
