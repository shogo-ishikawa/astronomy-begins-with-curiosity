import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyProject } from "../domain/project";
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
  beforeEach(() => {
    vi.mocked(projectRepository.list).mockResolvedValue([]);
    vi.mocked(projectRepository.save).mockResolvedValue();
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
    await userEvent.click(
      screen.getByRole("button", { name: "新しい研究を始める" }),
    );
    expect(projectRepository.save).toHaveBeenCalledOnce();
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
