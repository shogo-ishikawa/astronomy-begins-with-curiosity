import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createEmptyProject } from "../../domain/project";
import type { PlanVersion } from "../review/logic";
import { ExecutionStage } from "./ExecutionStage";
import type { BoundResultPackageRef } from "./logic";

const plan = {
  planVersionId: "plan-1",
  versionNumber: 1,
  subjectHash: "subject-a",
  resolved: {
    boxSizeMpcOverH: 50,
    boxSizeUnit: "h^-1 Mpc",
    particleSide: 32,
    totalParticles: 32768,
    snapshotIds: ["z0", "initial", "z2", "z10"],
  },
  subjectSnapshot: {
    draft: { primaryAnalysis: "sigma-delta", plannedFigure: "sigma-growth" },
  },
} as unknown as PlanVersion;
function project() {
  const p = createEmptyProject();
  p.currentStage = "execution";
  p.planVersions = [plan];
  p.activePlanVersionId = plan.planVersionId;
  p.planReviewCompletedAt = "2026-08-21T00:00:00.000Z";
  p.pilot = {
    status: "complete",
    resultingPlanVersionId: plan.planVersionId,
  } as never;
  return p;
}
const ref = {
  refKind: "bound",
  refSchemaVersion: 1,
  packageId: "L050_N032_demo_v1",
  catalogVersion: "demo-catalog-1.0.0",
  manifestPath: "L050_N032/manifest.json",
  dataVersion: "demo-data-1.0.0",
  planVersionId: "plan-1",
  planSubjectHash: "subject-a",
  requestFingerprint: "fp",
  acquisitionFingerprint: "afp",
  boxSizeMpcOverH: 50,
  particleSide: 32,
  requestedSnapshotIds: ["initial", "z10", "z2", "z0"],
  snapshotInventory: [],
  grid: {
    projection: "xy",
    width: 128,
    height: 128,
    quantity: "rho_over_mean",
    arrayType: "Float32Array",
  },
  provenance: {
    kind: "demo-fixture",
    generator: "g",
    generatorVersion: "1",
    createdAt: "2026-08-21T00:00:00.000Z",
    description: "demo",
  },
  fixtureVersion: "1.0.0",
  acquiredAt: "2026-08-21T00:00:00.000Z",
} as BoundResultPackageRef;
describe("ExecutionStage", () => {
  it("shows plan, comparison, DEMO label and does not acquire automatically", () => {
    const acquirePackage = vi.fn();
    render(
      <ExecutionStage
        project={project()}
        save={vi.fn()}
        onGlossary={vi.fn()}
        back={vi.fn()}
        acquirePackage={acquirePackage}
      />,
    );
    expect(
      screen.getAllByText("DEMO / synthetic fixture", { selector: "strong" }),
    ).toHaveLength(2);
    expect(
      screen.getByText(/研究計画と候補結果パッケージ/),
    ).toBeInTheDocument();
    expect(acquirePackage).not.toHaveBeenCalled();
    expect(screen.queryByText(/品質合格|科学的結論/)).not.toBeInTheDocument();
  });
  it("tracks real loading and saves only success", async () => {
    let resolve!: (v: BoundResultPackageRef) => void;
    const controlled = new Promise<BoundResultPackageRef>((r) => (resolve = r)),
      save = vi.fn(),
      user = userEvent.setup();
    render(
      <ExecutionStage
        project={project()}
        save={save}
        onGlossary={vi.fn()}
        back={vi.fn()}
        acquirePackage={vi.fn(() => controlled) as never}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "この結果パッケージを取得する" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("読み込んでいます");
    expect(save).not.toHaveBeenCalled();
    resolve(ref);
    expect(
      await screen.findByText("取得済み（品質未確認）"),
    ).toBeInTheDocument();
    expect(save).toHaveBeenCalledWith(ref);
  });
  it("reports errors without saving and enables retry", async () => {
    const save = vi.fn(),
      user = userEvent.setup();
    render(
      <ExecutionStage
        project={project()}
        save={save}
        onGlossary={vi.fn()}
        back={vi.fn()}
        acquirePackage={vi.fn().mockRejectedValue(new Error("offline"))}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "この結果パッケージを取得する" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("offline");
    expect(save).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "この結果パッケージを再取得する" }),
    ).toBeEnabled();
  });
});
