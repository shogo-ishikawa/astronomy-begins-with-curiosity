export type SnapshotTimeMetadata = Readonly<{
  id: string;
  redshift: number | null;
}>;

export const snapshotTimes: readonly SnapshotTimeMetadata[] = [
  { id: "initial", redshift: null },
  { id: "z10", redshift: 10 },
  { id: "z5", redshift: 5 },
  { id: "z2", redshift: 2 },
  { id: "z1", redshift: 1 },
  { id: "z0", redshift: 0 },
];

export function scaleFactor(redshift: number): number {
  if (!Number.isFinite(redshift) || redshift < 0)
    throw new Error("赤方偏移は有限な0以上の値である必要があります。");
  return 1 / (1 + redshift);
}

export function formatSnapshotTime(metadata: SnapshotTimeMetadata): string {
  if (metadata.redshift === null)
    return "計算開始時（開始赤方偏移は実行時に確定）";
  const a = scaleFactor(metadata.redshift);
  const formattedA = Number.isInteger(a) ? String(a) : a.toFixed(3);
  return `z = ${metadata.redshift}、a ${a === 1 || a === 0.5 ? "=" : "≈"} ${formattedA}${metadata.redshift === 0 ? "（現在）" : ""}`;
}

export function snapshotTimeById(id: string): SnapshotTimeMetadata {
  const metadata = snapshotTimes.find((item) => item.id === id);
  if (!metadata) throw new Error(`未知のスナップショットID: ${id}`);
  return metadata;
}

export function formatSnapshotId(id: string): string {
  return formatSnapshotTime(snapshotTimeById(id));
}
