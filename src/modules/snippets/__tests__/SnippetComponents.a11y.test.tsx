import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SnippetForm from "../components/SnippetForm";
import SnippetsSettings from "../components/SnippetsSettings";

const settings = {
  defaultLanguage: "javascript",
  languages: ["javascript", "typescript"],
  showLineNumbers: false,
};

describe("snippets component accessibility", () => {
  it("names settings icon buttons by their language action", () => {
    render(
      <SnippetsSettings
        visible
        settings={settings}
        saving={false}
        configuredLanguages={settings.languages}
        onUpdate={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Remove javascript language" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove typescript language" }),
    ).toBeInTheDocument();
  });

  it("names form icon buttons for assistive technology", () => {
    render(
      <SnippetForm
        visible
        editingSnippet={{
          _id: "snippet-1",
          created_at: "2026-05-16T00:00:00.000Z",
          payload: {
            title: "Fetch helper",
            code: "const load = () => fetch('/api');",
            language: "javascript",
            tags: [],
            is_favorite: false,
          },
        }}
        settings={settings}
        configuredLanguages={settings.languages}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Close snippet form" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy preview code" }),
    ).toBeInTheDocument();
  });
});
