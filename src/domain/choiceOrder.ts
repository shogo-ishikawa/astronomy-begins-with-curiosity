export type OrderPolicy =
  | { kind: "stable-shuffle"; orderVersion: number; pinToEnd?: string[] }
  | { kind: "natural"; dimension: "numeric" | "chronological" | "ordinal" }
  | { kind: "fixed"; reason: string };

function hash(text: string) {
  let value = 2166136261;
  for (const character of text) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function legacyChoiceOrderSeed(projectId: string) {
  return `choice-v1-${hash(`abcs-choice-order:${projectId}`).toString(36)}`;
}

export function orderChoices<T extends { id: string }>(
  input: readonly T[],
  policy: OrderPolicy,
  context: { choiceOrderSeed: string; themeId: string; groupId: string },
): T[] {
  const copy = [...input];
  if (policy.kind !== "stable-shuffle") return copy;
  const pinned = new Set(policy.pinToEnd ?? []);
  const values = copy.filter((item) => !pinned.has(item.id));
  const end = copy.filter((item) => pinned.has(item.id));
  let state = hash(
    `${context.choiceOrderSeed}:${context.themeId}:${context.groupId}:${policy.orderVersion}`,
  );
  const random = () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j]!, values[i]!];
  }
  return [...values, ...end];
}
