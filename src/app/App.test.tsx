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
    expect(
      screen.getByText("開発中のプロトタイプ — v0.1-alpha / Phase 0"),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "新しい研究を始める" }),
    );
    expect(projectRepository.save).toHaveBeenCalledOnce();
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
