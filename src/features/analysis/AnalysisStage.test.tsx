import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DensityCanvas,
  LineChart,
  type RuntimeAnalysis,
} from "./AnalysisStage";
import {
  analyzeDensity,
  commonHistogramBoundaries,
  histogram,
} from "./numerical";

function item(
  id: RuntimeAnalysis["id"],
  scaleFactor: number,
  redshift: number,
  input: number[],
): RuntimeAnalysis {
  const statistics = analyzeDensity(input);
  const boundaries = commonHistogramBoundaries([statistics.contrast]);
  return {
    id,
    scaleFactor,
    redshift,
    values: Float32Array.from(input),
    statistics,
    histogram: histogram(statistics.contrast, boundaries),
  };
}

describe("S11 scientific figures", () => {
  const items = [
    item("initial", 0.02, 49, [1, 1, 1, 1]),
    item("z10", 0.0909, 10, [0, 1, 2, 1]),
    item("z5", 0.1667, 5, [1, 1, 4, 2]),
    item("z2", 0.3333, 2, [0, 2, 4, 2]),
    item("z1", 0.5, 1, [0, 1, 5, 2]),
    item("z0", 1, 0, [0, 1, 8, 3]),
  ];
  it("uses actual non-uniform scale factors and renders numeric ticks", () => {
    const { container } = render(<LineChart items={items} kind="sigma" />);
    const circles = [...container.querySelectorAll("circle")];
    const xs = circles.map((node) => Number(node.getAttribute("cx")));
    expect(xs[1]! - xs[0]!).toBeLessThan(xs[5]! - xs[4]!);
    expect(screen.getByText("0.020")).toBeInTheDocument();
    expect(screen.getByText("1.000")).toBeInTheDocument();
  });
  it("always shows baseline dense series and adds sensitivity series", () => {
    render(<LineChart items={items} kind="dense" sensitivity={[1.5, 3]} />);
    expect(screen.getByText(/基準 q ≥ 2/)).toBeInTheDocument();
    expect(screen.getByText(/感度 q ≥ 1.5/)).toBeInTheDocument();
    expect(screen.getByText(/感度 q ≥ 3/)).toBeInTheDocument();
  });
  it("describes the actual per-snapshot structure range", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      createImageData: () => ({ data: new Uint8ClampedArray(16) }),
      putImageData: () => undefined,
    } as unknown as CanvasRenderingContext2D);
    render(<DensityCanvas item={items[1]!} range={[0, 8]} mode="structure" />);
    expect(
      screen.getByText(/時刻ごと（色の時刻間比較不可）/),
    ).toHaveTextContent("0.000–2.000");
  });
});
