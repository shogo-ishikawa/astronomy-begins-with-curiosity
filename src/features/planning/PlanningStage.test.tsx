import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { createEmptyProject } from "../../domain/project";
import { PlanningStage } from "./PlanningStage";
import { updateDraft, type ReasonKey, type ResearchPlanDraft } from "./logic";

function Harness({
  onGlossary = vi.fn(),
}: {
  onGlossary?: (id: string) => void;
}) {
  const [project, setProject] = useState(createEmptyProject());
  function update(
    change: Partial<ResearchPlanDraft>,
    reason: ReasonKey | null,
  ) {
    setProject((old) => ({
      ...old,
      researchPlanDraft: updateDraft(
        old.researchPlanDraft,
        change,
        reason,
        "2026-08-21T00:00:00.000Z",
      ),
    }));
  }
  return (
    <PlanningStage
      project={project}
      update={update}
      complete={vi.fn()}
      review={vi.fn()}
      back={vi.fn()}
      onGlossary={onGlossary}
    />
  );
}

describe("S05研究計画", () => {
  it("判断理由を選ぶとradioがcheckedになる", async () => {
    render(<Harness />);
    const radio = screen.getAllByRole("radio", {
      name: "問いに必要な証拠とつながるから",
    })[0]!;
    await userEvent.click(radio);
    expect(radio).toBeChecked();
  });
  it("本文の用語リンクを開ける", async () => {
    const open = vi.fn();
    render(<Harness onGlossary={open} />);
    await userEvent.click(
      screen.getByRole("button", { name: "共動座標・共動距離" }),
    );
    expect(open).toHaveBeenCalledWith("comoving-distance");
  });
});
