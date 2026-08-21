import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
/* global console */
const root = path.resolve("public/data/cosmic-web/v1");
const catalog = JSON.parse(
  await readFile(path.join(root, "catalog.json"), "utf8"),
);
const expected = new Set(
  [25, 50, 75, 100].flatMap((L) => [16, 32, 64].map((N) => `${L}:${N}`)),
);
const ids = new Set(),
  paths = new Set();
const safe = (p) =>
  p &&
  !path.isAbsolute(p) &&
  !/^[a-z][a-z\d+.-]*:/i.test(p) &&
  !p.includes("//") &&
  !p.split("/").includes("..");
if (
  catalog.schemaVersion !== 1 ||
  !catalog.catalogVersion ||
  catalog.packages.length !== 12
)
  throw Error("catalog metadata/count invalid");
for (const entry of catalog.packages) {
  const key = `${entry.boxSizeMpcOverH}:${entry.particleSide}`;
  if (
    !expected.delete(key) ||
    ids.has(entry.packageId) ||
    paths.has(entry.manifestPath) ||
    !safe(entry.manifestPath)
  )
    throw Error(`invalid/duplicate catalog entry: ${entry.packageId}`);
  ids.add(entry.packageId);
  paths.add(entry.manifestPath);
  // Directory traversal is excluded above; exact directory spelling checks GitHub Pages case sensitivity.
  const parts = entry.manifestPath.split("/"),
    actual = await readdir(root);
  if (!actual.includes(parts[0]))
    throw Error(`path case mismatch: ${entry.manifestPath}`);
  const manifest = JSON.parse(
    await readFile(path.join(root, entry.manifestPath), "utf8"),
  );
  if (
    manifest.packageId !== entry.packageId ||
    manifest.simulation.boxSizeMpcOverH !== entry.boxSizeMpcOverH ||
    manifest.simulation.particleSide !== entry.particleSide
  )
    throw Error(`catalog/manifest mismatch: ${entry.packageId}`);
  const s = manifest.simulation,
    p = manifest.provenance,
    g = manifest.grid,
    payload = manifest.payload;
  if (
    s.particleCount !== s.particleSide ** 3 ||
    !Number.isInteger(s.seed) ||
    s.boundary !== "periodic" ||
    s.physics !== "collisionless-dark-matter-only"
  )
    throw Error(`simulation invalid: ${entry.packageId}`);
  if (
    p.kind !== "demo-fixture" ||
    !p.generator ||
    !p.generatorVersion ||
    Number.isNaN(Date.parse(p.createdAt)) ||
    !p.description
  )
    throw Error(`provenance invalid: ${entry.packageId}`);
  if (
    manifest.cosmology.status !== "not-modeled" ||
    g.projection !== "xy" ||
    g.width !== 128 ||
    g.height !== 128 ||
    g.quantity !== "rho_over_mean" ||
    g.arrayType !== "Float32Array" ||
    payload.kind !== "generated-demo-fixture" ||
    !payload.fixtureVersion
  )
    throw Error(`payload metadata invalid: ${entry.packageId}`);
  const expectedSnapshots = [
    ["initial", 49, 0.02],
    ["z10", 10, 1 / 11],
    ["z5", 5, 1 / 6],
    ["z2", 2, 1 / 3],
    ["z1", 1, 0.5],
    ["z0", 0, 1],
  ];
  if (
    manifest.snapshots.length !== 6 ||
    new Set(manifest.snapshots.map((x) => x.id)).size !== 6 ||
    manifest.snapshots.some(
      (x, i) =>
        x.id !== expectedSnapshots[i][0] ||
        x.redshift !== expectedSnapshots[i][1] ||
        Math.abs(x.scaleFactor - expectedSnapshots[i][2]) > 1e-12,
    ) ||
    manifest.snapshots.some((x) => /recomb/i.test(x.id)) ||
    manifest.snapshots[0].redshift !== s.zStart
  )
    throw Error(`snapshots invalid: ${entry.packageId}`);
}
if (expected.size) throw Error("missing combinations");
console.log("Validated 12 catalog packages and manifests.");
