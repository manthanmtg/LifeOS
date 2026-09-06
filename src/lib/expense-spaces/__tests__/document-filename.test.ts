import { describe, expect, it } from "vitest";
import { splitDocumentFilename } from "../document-filename";

describe("splitDocumentFilename", () => {
  it("keeps the final extension separate while preserving earlier dots", () => {
    expect(splitDocumentFilename("renovation.quote.pdf")).toEqual({
      basename: "renovation.quote",
      extension: ".pdf",
    });
  });

  it("does not treat dotfiles or trailing dots as extensions", () => {
    expect(splitDocumentFilename(".env")).toEqual({
      basename: ".env",
      extension: "",
    });
    expect(splitDocumentFilename("notes.")).toEqual({
      basename: "notes.",
      extension: "",
    });
  });
});
