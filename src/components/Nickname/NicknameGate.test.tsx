import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearNickname } from "../../storage/localNicknameStore";
import { NicknameGate } from "./NicknameGate";

describe("NicknameGate", () => {
  beforeEach(() => {
    clearNickname();
  });

  it("does not render when a nickname already exists", () => {
    render(<NicknameGate nickname="Ada" onNickname={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("saves a valid nickname", async () => {
    const user = userEvent.setup();
    const onNickname = vi.fn();
    render(<NicknameGate nickname={null} onNickname={onNickname} />);

    await user.type(screen.getByLabelText("Nickname"), "  Ada   Player  ");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(onNickname).toHaveBeenCalledWith("Ada Player");
  });

  it("shows an error for empty nicknames", async () => {
    const user = userEvent.setup();
    render(<NicknameGate nickname={null} onNickname={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByText("Enter a nickname.")).toBeInTheDocument();
  });
});
