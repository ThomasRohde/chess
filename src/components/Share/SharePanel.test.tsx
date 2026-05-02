import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AppliedMove } from "../../domain/chess/moveTypes";
import { SharePanel } from "./SharePanel";

const move: AppliedMove = {
  beforeFen: "before",
  afterFen: "after",
  from: "e2",
  to: "e4",
  uci: "e2e4",
  san: "e4",
  status: {
    kind: "active",
    label: "Black to move.",
    sideToMove: "black",
    isFinal: false,
  },
};

describe("SharePanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("asks the user to publish a confirmed move", async () => {
    const user = userEvent.setup();
    const onPublish = vi.fn();

    render(
      <SharePanel
        move={move}
        nickname="Ada"
        onContinue={vi.fn()}
        onPublish={onPublish}
        shareUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: /publish this branch/i }));

    expect(onPublish).toHaveBeenCalledOnce();
  });

  it("disables publishing while the branch is being recorded", async () => {
    const user = userEvent.setup();
    const onPublish = vi.fn();

    render(
      <SharePanel
        isPublishing
        move={move}
        nickname="Ada"
        onContinue={vi.fn()}
        onPublish={onPublish}
        shareUrl={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: /publishing/i }));

    expect(onPublish).not.toHaveBeenCalled();
  });

  it("shows publish errors", () => {
    render(
      <SharePanel
        move={move}
        nickname="Ada"
        onContinue={vi.fn()}
        onPublish={vi.fn()}
        publishError="Rejected branch"
        shareUrl={null}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Rejected branch");
  });

  it("shows copy and X share actions after publish", () => {
    render(
      <SharePanel
        move={move}
        nickname="Ada"
        onContinue={vi.fn()}
        onPublish={vi.fn()}
        shareUrl="https://example.com/chess/#/p/abc"
      />,
    );

    expect(screen.getByDisplayValue("https://example.com/chess/#/p/abc")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy url/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /post on x/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /share board image/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reload published url/i })).toBeInTheDocument();
  });

  it("shares or downloads a board image from the published position", async () => {
    const user = userEvent.setup();
    const onShareBoardImage = vi.fn().mockResolvedValue("downloaded");

    render(
      <SharePanel
        move={move}
        nickname="Ada"
        onContinue={vi.fn()}
        onPublish={vi.fn()}
        onShareBoardImage={onShareBoardImage}
        shareUrl="https://example.com/chess/#/p/abc"
      />,
    );

    await user.click(screen.getByRole("button", { name: /share board image/i }));

    expect(onShareBoardImage).toHaveBeenCalledWith({
      fen: "after",
      lastMoveFrom: "e2",
      lastMoveSan: "e4",
      lastMoveTo: "e4",
      shareUrl: "https://example.com/chess/#/p/abc",
      statusLabel: "Black to move.",
    });
    expect(await screen.findByRole("button", { name: /image downloaded/i })).toBeInTheDocument();
  });

  it("reloads from the published URL when requested", async () => {
    const user = userEvent.setup();
    const onReloadPublishedUrl = vi.fn();

    render(
      <SharePanel
        move={move}
        nickname="Ada"
        onContinue={vi.fn()}
        onPublish={vi.fn()}
        onReloadPublishedUrl={onReloadPublishedUrl}
        shareUrl="https://example.com/chess/#/p/abc"
      />,
    );

    await user.click(screen.getByRole("button", { name: /reload published url/i }));

    expect(onReloadPublishedUrl).toHaveBeenCalledWith("https://example.com/chess/#/p/abc");
  });

  it("opens the X composer when the share action is clicked", async () => {
    const user = userEvent.setup();
    const focus = vi.fn();
    const openSpy = vi.spyOn(window, "open").mockReturnValue({ focus } as unknown as Window);

    render(
      <SharePanel
        move={move}
        nickname="Ada"
        onContinue={vi.fn()}
        onPublish={vi.fn()}
        shareUrl="https://example.com/chess/#/p/abc"
      />,
    );

    await user.click(screen.getByRole("link", { name: /post on x/i }));

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining("https://twitter.com/intent/tweet?"),
      "_blank",
      "noopener,noreferrer",
    );
    expect(focus).toHaveBeenCalledOnce();
  });

  it("copies through the legacy selection fallback when Clipboard API is unavailable", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => true),
    });

    render(
      <SharePanel
        move={move}
        nickname="Ada"
        onContinue={vi.fn()}
        onPublish={vi.fn()}
        shareUrl="https://example.com/chess/#/p/abc"
      />,
    );

    await user.click(screen.getByRole("button", { name: /copy url/i }));

    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByRole("button", { name: /copied/i })).toBeInTheDocument();
  });
});
