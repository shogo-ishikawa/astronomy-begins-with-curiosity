import { expect, it } from "vitest";
import { createCosmicWebModel } from "./cosmicWebModel";
it("is deterministic and preserves tracer count", () => {
  const a = createCosmicWebModel(42);
  const b = createCosmicWebModel(42);
  expect(a).toEqual(b);
  expect(a.early).toHaveLength(a.late.length);
  expect(a.filaments.length).toBeGreaterThan(1);
  expect(a.voids.length).toBeGreaterThan(1);
});
