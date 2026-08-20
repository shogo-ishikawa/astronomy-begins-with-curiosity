import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ChoiceCards } from "./ChoiceCards";

it("矢印キーだけで選択できる", async () => {
  const onChange = vi.fn();
  render(
    <ChoiceCards
      choices={[
        { id: "a", label: "最初" },
        { id: "b", label: "次" },
      ]}
      onChange={onChange}
    />,
  );
  const first = screen.getByRole("radio", { name: /最初/ });
  first.focus();
  await userEvent.keyboard("{ArrowRight}");
  expect(onChange).toHaveBeenCalledWith("b");
});
