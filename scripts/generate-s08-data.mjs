import { mkdir, writeFile } from "node:fs/promises";
import { URL } from "node:url";

const root = new URL("../public/data/cosmic-web/v1/", import.meta.url);
const boxes = [25, 50, 75, 100],
  sides = [16, 32, 64];
const snapshots = [
  ["initial", 49, 0.02],
  ["z10", 10, 1 / 11],
  ["z5", 5, 1 / 6],
  ["z2", 2, 1 / 3],
  ["z1", 1, 0.5],
  ["z0", 0, 1],
].map(([id, redshift, scaleFactor]) => ({ id, redshift, scaleFactor }));
const packages = [];
for (const boxSizeMpcOverH of boxes)
  for (const particleSide of sides) {
    const stem = `L${String(boxSizeMpcOverH).padStart(3, "0")}_N${String(particleSide).padStart(3, "0")}`;
    const packageId = `${stem}_demo_v1`,
      manifestPath = `${stem}/manifest.json`;
    packages.push({
      packageId,
      boxSizeMpcOverH,
      particleSide,
      manifestPath,
      provenanceKind: "demo-fixture",
    });
    const manifest = {
      schemaVersion: 1,
      packageId,
      dataVersion: "demo-data-1.0.0",
      provenance: {
        kind: "demo-fixture",
        generator: "ABCs deterministic educational density fixture",
        generatorVersion: "1.0.0",
        createdAt: "2026-08-21T00:00:00.000Z",
        description:
          "教育用の合成結果です。CWSや実際のN体計算の結果ではありません。",
      },
      simulation: {
        boxSizeMpcOverH,
        boxSizeUnit: "h^-1 Mpc",
        particleSide,
        particleCount: particleSide ** 3,
        seed: 1701 + boxSizeMpcOverH * 10 + particleSide,
        zStart: 49,
        boundary: "periodic",
        physics: "collisionless-dark-matter-only",
      },
      cosmology: {
        status: "not-modeled",
        description:
          "この教育用fixtureは力学的な宇宙論計算を行わず、宇宙論パラメータを仮定していません。",
      },
      grid: {
        projection: "xy",
        width: 128,
        height: 128,
        quantity: "rho_over_mean",
        arrayType: "Float32Array",
      },
      payload: {
        kind: "generated-demo-fixture",
        fixtureId: "abcs-density-field",
        fixtureVersion: "1.0.0",
      },
      snapshots,
    };
    await mkdir(new URL(`${stem}/`, root), { recursive: true });
    await writeFile(
      new URL(manifestPath, root),
      JSON.stringify(manifest, null, 2) + "\n",
    );
  }
await mkdir(root, { recursive: true });
await writeFile(
  new URL("catalog.json", root),
  JSON.stringify(
    { schemaVersion: 1, catalogVersion: "demo-catalog-1.0.0", packages },
    null,
    2,
  ) + "\n",
);
