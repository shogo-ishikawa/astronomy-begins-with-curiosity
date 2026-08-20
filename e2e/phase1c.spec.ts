import { expect, test, type Page } from "@playwright/test";
async function seedMethodProject(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: "新しい研究を始める" }).click();
  await expect(
    page.getByText("保存済みの状態から再開しました。"),
  ).toBeVisible();
  await page.evaluate(async () => {
    const request = indexedDB.open("abcs-projects", 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = db
      .transaction("projects", "readonly")
      .objectStore("projects")
      .getAll();
    const values = await new Promise<Array<Record<string, unknown>>>(
      (resolve) => {
        read.onsuccess = () =>
          resolve(read.result as Array<Record<string, unknown>>);
      },
    );
    const p = values[0];
    const now = new Date().toISOString();
    Object.assign(p, {
      currentStage: "method",
      motivation: { choiceId: "unsure", note: "", chosenAt: now },
      researchQuestion: {
        choiceId: "time-change",
        measurementId: "density-image",
        timeFocusId: "whole-history",
        spaceFocusId: "whole-box",
        alignment: { status: "aligned", acknowledged: false, reasonId: null },
        note: "",
        chosenAt: now,
      },
      hypothesis: { choiceId: "uncertain", note: "", chosenAt: now },
      prediction: {
        choiceId: "uncertain-density-image",
        direction: "uncertain",
        reasonId: "uncertain",
        alignment: { status: "aligned", acknowledged: false, reasonId: null },
        note: "",
        chosenAt: now,
      },
    });
    const tx = db.transaction("projects", "readwrite");
    tx.objectStore("projects").put(p);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "この方法で、何がわかる？" }),
  ).toBeVisible();
}
test("S04で誤答、ヒント、再回答、完了、保存復元を確認する", async ({
  page,
}) => {
  await seedMethodProject(page);
  await page.getByLabel("観測では宇宙の進化を何も調べられない").click();
  await expect(page.getByText(/観測でも異なる赤方偏移/)).toBeVisible();
  await page.getByRole("button", { name: "説明を踏まえて再挑戦" }).click();
  await page.getByLabel("異なる強みを持ち、比較して使う相補的な方法").click();
  await page.getByLabel("多数の暗黒物質を粗視化した計算上の要素").click();
  await page.getByLabel("同じ物理条件のもとで密度ゆらぎの細かな配置").click();
  await page.getByLabel("一方から出た粒子が反対側から入る計算上の扱い").click();
  await page.getByLabel("暗黒物質の重力的な密度構造の形成と成長").click();
  await expect(page.getByText("✓ S04 方法の理解を完了しました")).toBeVisible();
  await expect(page.getByText("保存しました。")).toBeVisible();
  await page.reload();
  await expect(page.getByText("✓ S04 方法の理解を完了しました")).toBeVisible();
  await expect(page.getByText("✓ 理解済み")).toHaveCount(5);
});
test("図の用語凡例と模式図注記を表示する", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "新しい研究を始める" }).click();
  await page.getByRole("button", { name: "研究への招待を始める" }).click();
  for (const name of ["フィラメント", "ノード", "ノット", "ボイド"])
    await expect(page.getByRole("button", { name })).toBeVisible();
  await expect(page.getByText(/形態を理解するための模式図/)).toBeVisible();
  await page.getByRole("button", { name: "ノード" }).press("Enter");
  await expect(page.getByRole("heading", { name: "ノード" })).toBeVisible();
});
