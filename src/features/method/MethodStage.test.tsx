import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createEmptyProject } from "../../domain/project";
import { methodContent } from "../../content/ja/method/content";
import { answerMethod } from "./logic";
import { MethodStage } from "./MethodStage";
const props = { back: vi.fn(), onGlossary: vi.fn() };
describe("MethodStage", () => {
  it("shows feedback, hint, retry, text alternatives and term links", async () => {
    const user = userEvent.setup();
    const project = createEmptyProject();
    const onAnswer = vi.fn();
    render(<MethodStage {...props} project={project} onAnswer={onAnswer} />);
    expect(screen.getByText(/まだS04は完了していません/)).toBeVisible();
    await user.click(
      screen.getByLabelText("観測では宇宙の進化を何も調べられない"),
    );
    expect(screen.getByText(/観測でも異なる赤方偏移/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "説明を踏まえて再挑戦" }),
    ).toBeVisible();
    await user.click(
      screen.getByLabelText("まだわからない", {
        selector: 'input[name="particle-meaning"]',
      }),
    );
    expect(screen.getAllByText("ヒント").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: /周期境界条件/ }));
    await user.click(
      screen.getByRole("button", { name: "用語を確認：周期境界条件" }),
    );
    expect(props.onGlossary).toHaveBeenCalledWith("periodic-boundary");
  });
  it("identifies all-correct state without color alone", () => {
    let project = createEmptyProject();
    for (const q of methodContent.questions)
      project = {
        ...project,
        methodUnderstanding: answerMethod(
          project.methodUnderstanding,
          q.id,
          q.correctChoiceId,
          new Date().toISOString(),
        ),
      };
    render(<MethodStage {...props} project={project} onAnswer={vi.fn()} />);
    expect(screen.getByText("✓ S04 方法の理解を完了しました")).toBeVisible();
    expect(screen.getAllByText("✓ 理解済み")).toHaveLength(5);
  });
});
