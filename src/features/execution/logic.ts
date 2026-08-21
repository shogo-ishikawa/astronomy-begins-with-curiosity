import { z } from "zod";
import type { ProjectState } from "../../domain/project";
import type { PlanVersion } from "../review/logic";

export const SNAPSHOT_ORDER = [
  "initial",
  "z10",
  "z5",
  "z2",
  "z1",
  "z0",
] as const;
export type SnapshotId = (typeof SNAPSHOT_ORDER)[number];
const snapshotSchema = z.object({
  id: z.enum(SNAPSHOT_ORDER),
  redshift: z.number(),
  scaleFactor: z.number().positive(),
});
export const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  packageId: z.string().min(1),
  dataVersion: z.string().min(1),
  provenance: z.object({
    kind: z.literal("demo-fixture"),
    generator: z.string().min(1),
    generatorVersion: z.string().min(1),
    createdAt: z.string().datetime(),
    description: z.string().min(1),
  }),
  simulation: z.object({
    boxSizeMpcOverH: z.number(),
    boxSizeUnit: z.literal("h^-1 Mpc"),
    particleSide: z.number().int(),
    particleCount: z.number().int(),
    seed: z.number().int(),
    zStart: z.number(),
    boundary: z.literal("periodic"),
    physics: z.literal("collisionless-dark-matter-only"),
  }),
  cosmology: z.object({
    status: z.literal("not-modeled"),
    description: z.string().min(1),
  }),
  grid: z.object({
    projection: z.literal("xy"),
    width: z.literal(128),
    height: z.literal(128),
    quantity: z.literal("rho_over_mean"),
    arrayType: z.literal("Float32Array"),
  }),
  payload: z.object({
    kind: z.literal("generated-demo-fixture"),
    fixtureId: z.string().min(1),
    fixtureVersion: z.string().min(1),
  }),
  snapshots: z.array(snapshotSchema).length(6),
});
export type ResultManifest = z.infer<typeof manifestSchema>;
export const catalogSchema = z.object({
  schemaVersion: z.literal(1),
  catalogVersion: z.string().min(1),
  packages: z.array(
    z.object({
      packageId: z.string(),
      boxSizeMpcOverH: z.number(),
      particleSide: z.number().int(),
      manifestPath: z.string(),
      provenanceKind: z.literal("demo-fixture"),
    }),
  ),
});
export type ResultCatalog = z.infer<typeof catalogSchema>;
export type AcquisitionRequest = {
  themeId: string;
  planVersionId: string;
  planSubjectHash: string;
  boxSizeMpcOverH: number;
  particleSide: number;
  snapshotIds: SnapshotId[];
  projection: "xy";
  quantity: "rho_over_mean";
};
export type BoundResultPackageRef = {
  refKind: "bound";
  refSchemaVersion: 1;
  packageId: string;
  catalogVersion: string;
  manifestPath: string;
  dataVersion: string;
  planVersionId: string;
  planSubjectHash: string;
  requestFingerprint: string;
  acquisitionFingerprint: string;
  boxSizeMpcOverH: number;
  particleSide: number;
  requestedSnapshotIds: SnapshotId[];
  snapshotInventory: {
    id: SnapshotId;
    redshift: number;
    scaleFactor: number;
  }[];
  grid: ResultManifest["grid"];
  provenance: ResultManifest["provenance"];
  fixtureVersion: string;
  acquiredAt: string;
};
export type LegacyResultPackageRef = {
  refKind: "legacy-unbound";
  packageId: string;
  dataVersion: string;
  provenance: unknown;
};
export type ResultPackageRef = BoundResultPackageRef | LegacyResultPackageRef;

export function canonicalSnapshots(ids: readonly string[]) {
  return SNAPSHOT_ORDER.filter((id) => ids.includes(id));
}
const fingerprint = (values: unknown[]) => {
  let h = 2166136261;
  for (const c of JSON.stringify(values)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return `fp-${(h >>> 0).toString(16).padStart(8, "0")}`;
};
export function createAcquisitionRequest(
  plan: PlanVersion,
  themeId: string,
): AcquisitionRequest {
  return {
    themeId,
    planVersionId: plan.planVersionId,
    planSubjectHash: plan.subjectHash,
    boxSizeMpcOverH: plan.resolved.boxSizeMpcOverH,
    particleSide: plan.resolved.particleSide,
    snapshotIds: canonicalSnapshots(plan.resolved.snapshotIds),
    projection: "xy",
    quantity: "rho_over_mean",
  };
}
export const requestFingerprint = (r: AcquisitionRequest) =>
  fingerprint([
    r.themeId,
    r.planVersionId,
    r.planSubjectHash,
    r.boxSizeMpcOverH,
    r.particleSide,
    r.snapshotIds,
  ]);
export const acquisitionFingerprint = (
  r: AcquisitionRequest,
  catalogVersion: string,
  packageId: string,
  dataVersion: string,
  fixtureVersion: string,
) =>
  fingerprint([
    requestFingerprint(r),
    catalogVersion,
    packageId,
    dataVersion,
    fixtureVersion,
  ]);
export function isSafeManifestPath(path: string) {
  return (
    Boolean(path) &&
    !path.startsWith("/") &&
    !/^[a-z][a-z\d+.-]*:/i.test(path) &&
    !path.includes("//") &&
    !path.split("/").includes("..")
  );
}
export function resolveDataUrl(baseUrl: string, relative: string) {
  if (!isSafeManifestPath(relative))
    throw Error("manifest pathが安全ではありません。");
  return new URL(
    `data/cosmic-web/v1/${relative}`,
    new URL(baseUrl, window.location.origin),
  ).toString();
}
export function findExactPackage(c: ResultCatalog, r: AcquisitionRequest) {
  const found = c.packages.filter(
    (p) =>
      p.boxSizeMpcOverH === r.boxSizeMpcOverH &&
      p.particleSide === r.particleSide,
  );
  if (found.length !== 1)
    throw Error(
      `研究計画と完全一致する結果パッケージが${found.length}件です。`,
    );
  return found[0]!;
}
export function canEnterExecution(p: ProjectState) {
  const plan = p.planVersions.find(
    (v) => v.planVersionId === p.activePlanVersionId,
  );
  return Boolean(
    plan &&
      p.planReviewCompletedAt &&
      p.pilot?.status === "complete" &&
      p.pilot.resultingPlanVersionId === p.activePlanVersionId,
  );
}
export function generateSnapshot(m: ResultManifest, id: SnapshotId) {
  if (!m.snapshots.some((s) => s.id === id))
    throw Error(`未知のsnapshot: ${id}`);
  const out = new Float32Array(m.grid.width * m.grid.height);
  const t = SNAPSHOT_ORDER.indexOf(id),
    amp = 0.008 + t * 0.13;
  let sum = 0;
  const phase =
    (m.simulation.seed +
      m.simulation.boxSizeMpcOverH * 31 +
      m.simulation.particleSide * 17 +
      m.payload.fixtureVersion.length * 13) *
    0.017;
  for (let y = 0; y < m.grid.height; y++)
    for (let x = 0; x < m.grid.width; x++) {
      const X = (x / m.grid.width) * 2 * Math.PI,
        Y = (y / m.grid.height) * 2 * Math.PI;
      const field =
        Math.sin(X * 2 + phase) +
        0.65 * Math.cos(Y * 3 - phase) +
        0.45 * Math.sin(X * 3 + Y * 2 + phase * 0.7) +
        0.25 * Math.cos(X * 7 - Y * 5);
      const value = Math.exp(amp * field);
      out[y * m.grid.width + x] = value;
      sum += value;
    }
  const mean = sum / out.length;
  for (let i = 0; i < out.length; i++) out[i] = out[i]! / mean;
  return out;
}
export function validateManifestForRequest(
  m: ResultManifest,
  r: AcquisitionRequest,
) {
  if (
    m.simulation.boxSizeMpcOverH !== r.boxSizeMpcOverH ||
    m.simulation.particleSide !== r.particleSide ||
    m.simulation.particleCount !== r.particleSide ** 3
  )
    throw Error("manifestの計算条件が研究計画と一致しません。");
  if (r.snapshotIds.some((id) => !m.snapshots.some((s) => s.id === id)))
    throw Error("必要なsnapshotがmanifestにありません。");
  return m;
}
export async function acquire(
  request: AcquisitionRequest,
  baseUrl = import.meta.env.BASE_URL,
  fetcher: typeof fetch = fetch,
  now = () => new Date().toISOString(),
): Promise<BoundResultPackageRef> {
  const catalogUrl = resolveDataUrl(baseUrl, "catalog.json"),
    c = catalogSchema.parse(await responseJson(await fetcher(catalogUrl)));
  const entry = findExactPackage(c, request);
  const m = validateManifestForRequest(
    manifestSchema.parse(
      await responseJson(
        await fetcher(resolveDataUrl(baseUrl, entry.manifestPath)),
      ),
    ),
    request,
  );
  request.snapshotIds.forEach((id) => generateSnapshot(m, id));
  return {
    refKind: "bound",
    refSchemaVersion: 1,
    packageId: m.packageId,
    catalogVersion: c.catalogVersion,
    manifestPath: entry.manifestPath,
    dataVersion: m.dataVersion,
    planVersionId: request.planVersionId,
    planSubjectHash: request.planSubjectHash,
    requestFingerprint: requestFingerprint(request),
    acquisitionFingerprint: acquisitionFingerprint(
      request,
      c.catalogVersion,
      m.packageId,
      m.dataVersion,
      m.payload.fixtureVersion,
    ),
    boxSizeMpcOverH: request.boxSizeMpcOverH,
    particleSide: request.particleSide,
    requestedSnapshotIds: request.snapshotIds,
    snapshotInventory: request.snapshotIds.map(
      (id) => m.snapshots.find((s) => s.id === id)!,
    ),
    grid: m.grid,
    provenance: m.provenance,
    fixtureVersion: m.payload.fixtureVersion,
    acquiredAt: now(),
  };
}
async function responseJson(response: Response) {
  if (!response.ok)
    throw Error(`データを読み込めませんでした（HTTP ${response.status}）。`);
  return response.json();
}
export type RuntimeResultPackage = {
  catalog: ResultCatalog;
  manifest: ResultManifest;
  snapshots: { id: SnapshotId; values: Float32Array }[];
};
/** Shared safe loader used by acquisition and every later data stage. */
export async function reloadResultPackage(
  ref: BoundResultPackageRef,
  baseUrl = import.meta.env.BASE_URL,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<RuntimeResultPackage> {
  const request: AcquisitionRequest = {
    themeId: "cosmic-web-growth",
    planVersionId: ref.planVersionId,
    planSubjectHash: ref.planSubjectHash,
    boxSizeMpcOverH: ref.boxSizeMpcOverH,
    particleSide: ref.particleSide,
    snapshotIds: canonicalSnapshots(ref.requestedSnapshotIds),
    projection: ref.grid.projection,
    quantity: ref.grid.quantity,
  };
  const catalog = catalogSchema.parse(
    await responseJson(
      await fetcher(resolveDataUrl(baseUrl, "catalog.json"), { signal }),
    ),
  );
  const entry = findExactPackage(catalog, request);
  if (entry.manifestPath !== ref.manifestPath)
    throw Error("catalogの参照先が取得記録と一致しません。");
  const manifest = validateManifestForRequest(
    manifestSchema.parse(
      await responseJson(
        await fetcher(resolveDataUrl(baseUrl, entry.manifestPath), { signal }),
      ),
    ),
    request,
  );
  if (
    ref.catalogVersion !== catalog.catalogVersion ||
    ref.packageId !== manifest.packageId ||
    ref.dataVersion !== manifest.dataVersion ||
    ref.fixtureVersion !== manifest.payload.fixtureVersion ||
    ref.acquisitionFingerprint !==
      acquisitionFingerprint(
        request,
        catalog.catalogVersion,
        manifest.packageId,
        manifest.dataVersion,
        manifest.payload.fixtureVersion,
      )
  )
    throw Error(
      "取得後にcatalogまたはmanifestが変更されています。再取得してください。",
    );
  return {
    catalog,
    manifest,
    snapshots: request.snapshotIds.map((id) => ({
      id,
      values: generateSnapshot(manifest, id),
    })),
  };
}
export type RefState = "current" | "stale" | "unverifiable";
export function localRefState(
  ref: ResultPackageRef | null,
  project: ProjectState,
  request: AcquisitionRequest,
): "current-candidate" | "stale" {
  if (
    !ref ||
    ref.refKind !== "bound" ||
    !canEnterExecution(project) ||
    ref.planVersionId !== request.planVersionId ||
    ref.planSubjectHash !== request.planSubjectHash ||
    ref.boxSizeMpcOverH !== request.boxSizeMpcOverH ||
    ref.particleSide !== request.particleSide ||
    ref.requestFingerprint !== requestFingerprint(request)
  )
    return "stale";
  return "current-candidate";
}
export function verifiedRefState(
  ref: ResultPackageRef | null,
  project: ProjectState,
  request: AcquisitionRequest,
  manifest?: ResultManifest,
  catalog?: ResultCatalog,
): RefState {
  if (localRefState(ref, project, request) === "stale") return "stale";
  if (!manifest || !catalog) return "unverifiable";
  const bound = ref as BoundResultPackageRef;
  return bound.catalogVersion === catalog.catalogVersion &&
    bound.packageId === manifest.packageId &&
    bound.dataVersion === manifest.dataVersion &&
    bound.fixtureVersion === manifest.payload.fixtureVersion &&
    bound.acquisitionFingerprint ===
      acquisitionFingerprint(
        request,
        catalog.catalogVersion,
        manifest.packageId,
        manifest.dataVersion,
        manifest.payload.fixtureVersion,
      )
    ? "current"
    : "stale";
}
