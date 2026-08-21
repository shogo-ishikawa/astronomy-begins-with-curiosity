import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyProject, type ProjectState } from "../domain/project";
import { projectRepository } from "../persistence/projectRepository";
import { App } from "./App";

vi.mock("../persistence/projectRepository", () => ({
  projectRepository: {
    list: vi.fn(),
    get: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  },
}));

describe("ホーム", () => {
  let savedProject: ProjectState | undefined;

  beforeEach(() => {
    savedProject = undefined;
    vi.mocked(projectRepository.list).mockResolvedValue([]);
    vi.mocked(projectRepository.get).mockImplementation(async (projectId) =>
      savedProject?.projectId === projectId ? savedProject : undefined,
    );
    vi.mocked(projectRepository.save).mockImplementation(async (project) => {
      savedProject = project;
    });
    vi.mocked(projectRepository.remove).mockResolvedValue();
  });

  it("日本語の空状態と新規作成操作を表示する", async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText("保存された研究はまだありません。"),
    ).toBeVisible();
    expect(screen.getByText("開発中のプロトタイプ — v0.1-alpha")).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "新しい研究を始める" }),
    );
    expect(projectRepository.save).toHaveBeenCalled();
    const createdProject = vi.mocked(projectRepository.save).mock.calls[0]?.[0];
    expect(createdProject).toBeDefined();
    expect(
      await screen.findByRole("heading", {
        name: createdProject!.projectName,
      }),
    ).toBeVisible();
    expect(projectRepository.get).toHaveBeenCalledWith(
      createdProject!.projectId,
    );
    expect(screen.getByText("保存済みの状態から再開しました。")).toBeVisible();
  });

  it("Mira、用語、模式図と選択に応じた助言を表示する", async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "新しい研究を始める" }),
    );
    expect(await screen.findByText(/私はMira/)).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "研究への招待を始める" }),
    );
    expect(
      await screen.findByTitle(
        "同じ大きさの領域で比べた初期宇宙と現在に近い宇宙の物質密度の模式図",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/形態を理解するための模式図/)).toBeVisible();
    await userEvent.click(
      screen
        .getAllByRole("button", { name: "密度のむら" })
        .find((button) => button.classList.contains("glossary-link"))!,
    );
    expect(screen.getByRole("heading", { name: "密度のむら" })).toBeVisible();
    await userEvent.click(screen.getByRole("radio", { name: /重力だけで/ }));
    expect(
      await screen.findByText(/含まれる物理と含まれない物理/),
    ).toBeVisible();
  });

  it("保存失敗を知らせる", async () => {
    vi.mocked(projectRepository.save).mockRejectedValueOnce(
      new Error("failed"),
    );
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "新しい研究を始める" }),
    );
    expect(
      await screen.findByText("保存できませんでした。再度お試しください。"),
    ).toBeVisible();
  });

  it("保存済みプロジェクトを一覧表示する", async () => {
    const project = { ...createEmptyProject(), projectName: "密度の研究" };
    vi.mocked(projectRepository.list).mockResolvedValue([project]);
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole("heading", { name: "密度の研究" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "続きから始める" }),
    ).toBeEnabled();
  });
});
