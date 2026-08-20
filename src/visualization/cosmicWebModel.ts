export interface Point {
  x: number;
  y: number;
  r: number;
}
export interface Filament {
  id: string;
  path: string;
  width: number;
}
function random(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (1664525 * value + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
export function createCosmicWebModel(seed = 104729, count = 96) {
  const earlyRandom = random(seed);
  const lateRandom = random(seed + 1);
  const early: Point[] = [];
  const cols = 12,
    rows = 8;
  for (let i = 0; i < count; i++) {
    const col = i % cols,
      row = Math.floor(i / cols) % rows;
    early.push({
      x: 14 + (col + 0.5) * 14.2 + (earlyRandom() - 0.5) * 4,
      y: 16 + (row + 0.5) * 16 + (earlyRandom() - 0.5) * 4,
      r: 1.4 + (i % 7 === 0 ? 0.5 : 0),
    });
  }
  const anchors = [
    [26, 32],
    [88, 25],
    [145, 48],
    [55, 92],
    [115, 108],
    [164, 86],
    [30, 130],
  ] as const;
  const late: Point[] = [];
  for (let i = 0; i < count; i++) {
    const a = anchors[i % anchors.length];
    const spread = i % 3 === 0 ? 10 : 5;
    late.push({
      x: a[0] + (lateRandom() - 0.5) * spread * 2,
      y: a[1] + (lateRandom() - 0.5) * spread * 2,
      r: 1.2 + (i % 9 === 0 ? 0.7 : 0),
    });
  }
  const filaments: Filament[] = [
    { id: "f1", path: "M18 30 C55 15 68 27 88 25 S130 35 147 49", width: 9 },
    { id: "f2", path: "M88 25 C96 58 91 82 115 108 S146 98 166 86", width: 7 },
    {
      id: "f3",
      path: "M25 132 C40 118 46 101 55 92 S87 95 115 108",
      width: 10,
    },
    { id: "f4", path: "M18 62 C43 66 42 82 55 92 S85 66 88 25", width: 5 },
    { id: "f5", path: "M147 49 C133 70 145 79 166 86", width: 6 },
  ];
  return {
    seed,
    count,
    early,
    late,
    filaments,
    nodes: anchors.slice(0, 6),
    voids: [
      { x: 67, y: 56, rx: 18, ry: 15 },
      { x: 126, y: 75, rx: 19, ry: 16 },
      { x: 82, y: 126, rx: 18, ry: 12 },
    ],
  };
}
export const cosmicWebModel = createCosmicWebModel();
