import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { stageSupport } from "../../content/ja/support/stageSupport";
import { CompanionRail } from "./CompanionRail";

const props = {
  history: [],
  selectedGlossary: undefined,
  onGlossary: vi.fn(),
  glossaryRequest: 0,
};
describe("CompanionRail", () => {
  it("keeps Mira visible and offers important terms in every tab", () => {
    render(<CompanionRail {...props} support={stageSupport.invitation} />);
    expect(screen.getByRole("heading", { name: "Mira" })).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "宇宙の大規模構造（コズミック・ウェブ）",
      }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("tab", { name: "図の見方" }));
    expect(screen.getByRole("heading", { name: "Mira" })).toBeVisible();
    expect(
      screen.getByText(/シミュレーション結果や観測データではありません/),
    ).toBeVisible();
  });

  it("implements horizontal roving focus and leaves vertical arrows alone", () => {
    render(<CompanionRail {...props} support={stageSupport.invitation} />);
    const glossary = screen.getByRole("tab", { name: "用語解説" });
    const figure = screen.getByRole("tab", { name: "図の見方" });
    expect(glossary).toHaveAttribute("tabindex", "0");
    expect(figure).toHaveAttribute("tabindex", "-1");
    const vertical = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      cancelable: true,
      bubbles: true,
    });
    glossary.dispatchEvent(vertical);
    expect(vertical.defaultPrevented).toBe(false);
    fireEvent.keyDown(glossary, { key: "ArrowRight" });
    expect(figure).toHaveFocus();
    expect(figure).toHaveAttribute("aria-controls", "support-panel-figure");
    expect(document.getElementById("support-panel-figure")).toHaveAttribute(
      "aria-labelledby",
      "support-tab-figure",
    );
    fireEvent.keyDown(figure, { key: "End" });
    expect(screen.getByRole("tab", { name: "これまでの助言" })).toHaveFocus();
    expect(
      screen.queryByRole("tabpanel", { name: "用語解説" }),
    ).not.toBeInTheDocument();
  });

  it("does not expose pilot result guidance before reveal", () => {
    render(<CompanionRail {...props} support={stageSupport.pilot} />);
    expect(
      screen.queryByRole("tab", { name: "図の見方" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/大まかな構造、細かな濃淡/),
    ).not.toBeInTheDocument();
  });
});
