import { describe, expect, it } from "vitest";
import { cosmicWebGrowthTheme } from "./ja/themes/cosmicWebGrowth";
import { themeSchema } from "./schema";

describe("テーマコンテンツ", () => {
  it("日本語、科学的限界、来歴要件を検証する", () => {
    const theme = themeSchema.parse(cosmicWebGrowthTheme);
    expect(theme.locale).toBe("ja");
    expect(theme.method.scientificLimitations).not.toHaveLength(0);
    expect(theme.provenanceRequirements).toContain("units");
    expect(theme.provenanceRequirements).toContain("source");
  });
});
