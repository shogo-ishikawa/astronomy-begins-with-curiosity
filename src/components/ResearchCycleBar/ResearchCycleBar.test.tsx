import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createEmptyProject, RESEARCH_STAGES } from "../../domain/project";
import { assignedResearchStages, ResearchCycleBar } from "./ResearchCycleBar";

describe("ResearchCycleBar", () => {
  it("assigns every stage exactly once", () => {
    const assigned = assignedResearchStages();
    expect(new Set(assigned).size).toBe(assigned.length);
    expect([...assigned].sort()).toEqual([...RESEARCH_STAGES].sort());
  });

  it("shows the detailed current position without making stages links", () => {
    const project = createEmptyProject(new Date("2026-08-20T00:00:00Z"));
    project.currentStage = "plan-review";
    render(<ResearchCycleBar project={project} />);
    expect(screen.getByText(/研究計画レビュー（6\/7）/)).toBeInTheDocument();
    expect(screen.getByText("問いと計画").closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
