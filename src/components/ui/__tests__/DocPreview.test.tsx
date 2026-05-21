import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DocPreview from "../DocPreview";

describe("DocPreview", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("renders accessible dialog metadata with filename and readable size", () => {
    render(
      <DocPreview
        src="/files/photo.png"
        contentType="image/png"
        filename="receipt.png"
        size={2048}
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "doc-preview-title");
    expect(screen.getByText("receipt.png")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
  });

  it("renders an image preview for image content types", () => {
    render(
      <DocPreview
        src="/files/scan.jpeg"
        contentType="image/jpeg"
        filename="scan.jpeg"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("img", { name: "scan.jpeg" })).toBeInTheDocument();
  });

  it("renders an iframe for PDF content", () => {
    render(
      <DocPreview
        src="/files/brochure.pdf"
        contentType="application/pdf"
        filename="brochure.pdf"
        onClose={vi.fn()}
      />,
    );

    const frame = screen.getByTitle("brochure.pdf");

    expect(frame.tagName).toBe("IFRAME");
    expect(frame).toHaveAttribute(
      "src",
      "/files/brochure.pdf#toolbar=0&view=Fit",
    );
  });

  it("shows a download fallback for unsupported file types", () => {
    render(
      <DocPreview
        src="/files/archive.bin"
        contentType="application/octet-stream"
        filename="archive.bin"
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Preview not available for this file type"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Download to View" }),
    ).toHaveAttribute("href", "/files/archive.bin");
  });

  it("invokes onClose when clicking the close button", () => {
    const onClose = vi.fn();

    render(
      <DocPreview
        src="/files/photo.png"
        contentType="image/png"
        filename="photo.png"
        onClose={onClose}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Close document preview" }),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("invokes onClose when pressing Escape", () => {
    const onClose = vi.fn();

    render(
      <DocPreview
        src="/files/photo.png"
        contentType="image/png"
        filename="photo.png"
        onClose={onClose}
      />,
    );

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("invokes onClose when clicking the backdrop", () => {
    const onClose = vi.fn();

    render(
      <DocPreview
        src="/files/photo.png"
        contentType="image/png"
        filename="photo.png"
        onClose={onClose}
      />,
    );

    const backdrop = screen
      .getByRole("dialog")
      .querySelector("div.relative.w-full.h-full.flex");

    expect(backdrop).toBeTruthy();

    fireEvent.click(backdrop as Element);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when clicking inside the preview content", () => {
    const onClose = vi.fn();

    render(
      <DocPreview
        src="/files/photo.png"
        contentType="image/png"
        filename="photo.png"
        onClose={onClose}
      />,
    );

    const previewImage = screen.getByRole("img", { name: "photo.png" });

    fireEvent.click(previewImage);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("falls back to content type text when no size is provided", () => {
    render(
      <DocPreview
        src="/files/photo.png"
        contentType="image/svg+xml"
        filename="vector.svg"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("image/svg+xml")).toBeInTheDocument();
  });
});
