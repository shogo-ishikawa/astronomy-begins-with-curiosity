import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { StageSection } from "./StageSection";
import { StageSectionNav } from "./StageSectionNav";
import type { StageSectionState } from "./StageSectionStatus";
import { StageDecisionSummary } from "./StageDecisionSummary";

const states: StageSectionState[] = [
  "未着手",
  "検討中",
  "選択済み",
  "確認が必要",
];

describe("stage workspace components", () => {
  it("shows every research-work state as text and rejects duplicate IDs", () => {
    const { rerender } = render(
      <StageSectionNav
        activeId="a"
        onNavigate={vi.fn()}
        items={states.map((state, index) => ({
          id: String(index),
          label: `項目${index}`,
          state,
        }))}
      />,
    );
    states.forEach((state) =>
      expect(screen.getByText(state)).toBeInTheDocument(),
    );
    expect(() =>
      rerender(
        <StageSectionNav
          activeId="a"
          onNavigate={vi.fn()}
          items={[
            { id: "same", label: "A", state: "未着手" },
            { id: "same", label: "B", state: "未着手" },
          ]}
        />,
      ),
    ).toThrow("unique");
  });

  it("opens an item explicitly, keeps it open after choosing, and exposes a real summary", () => {
    function Example() {
      const [open, setOpen] = useState(false);
      const [choice, setChoice] = useState("");
      return (
        <StageSection
          id="planning-box-size"
          title="箱サイズ"
          description="領域の広さを決めます"
          state={choice ? "選択済み" : "未着手"}
          summary={choice}
          open={open}
          onToggle={() => setOpen((value) => !value)}
        >
          <label>
            <input
              type="radio"
              checked={choice === "50 Mpc/h"}
              onChange={() => setChoice("50 Mpc/h")}
            />
            50 Mpc/h
          </label>
        </StageSection>
      );
    }
    render(<Example />);
    fireEvent.click(screen.getByRole("button", { name: "この項目を開く" }));
    fireEvent.click(screen.getByRole("radio"));
    expect(screen.getByRole("button", { name: "閉じる" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(screen.getByText("選択済み：50 Mpc/h")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("derives a read-only note without inventing a reason", () => {
    render(
      <StageDecisionSummary
        data={{
          purpose: "密度のむら",
          choices: "箱サイズ 50 Mpc/h",
          evidence: "比較表",
          limitation: "理由はまだ記録されていません",
          unknown: "銀河形成",
          nextQuestion: "粒子数",
        }}
      />,
    );
    expect(
      screen.getByText("画面で選択した内容から自動整理"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("理由はまだ記録されていません"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
