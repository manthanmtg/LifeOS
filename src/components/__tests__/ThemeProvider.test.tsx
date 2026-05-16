import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import ThemeProvider, { THEMES } from "../ThemeProvider";
import { ThemeProvider as NextThemesProvider } from "next-themes";

vi.mock("next-themes", () => ({
  ThemeProvider: vi.fn(
    ({
      children,
      ...props
    }: {
      children: ReactNode;
      [key: string]: unknown;
    }) => (
      <div
        data-testid="next-themes-provider"
        data-props={JSON.stringify(props)}
      >
        {children}
      </div>
    ),
  ),
}));

const mockedNextThemesProvider = vi.mocked(NextThemesProvider);

describe("ThemeProvider", () => {
  it("renders children inside the next-themes provider", () => {
    render(
      <ThemeProvider>
        <main>Dashboard shell</main>
      </ThemeProvider>,
    );

    expect(screen.getByText("Dashboard shell")).toBeInTheDocument();
    expect(screen.getByTestId("next-themes-provider")).toBeInTheDocument();
  });

  it("uses the data-theme attribute and one-dark as the default theme", () => {
    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>,
    );

    expect(mockedNextThemesProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        attribute: "data-theme",
        defaultTheme: "one-dark",
      }),
      undefined,
    );
  });

  it("passes custom default themes through to next-themes", () => {
    render(
      <ThemeProvider defaultTheme="minimal-light">
        <div>Content</div>
      </ThemeProvider>,
    );

    expect(mockedNextThemesProvider).toHaveBeenLastCalledWith(
      expect.objectContaining({
        defaultTheme: "minimal-light",
      }),
      undefined,
    );
  });

  it("exposes every supported theme to next-themes", () => {
    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>,
    );

    expect(mockedNextThemesProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        themes: [...THEMES],
      }),
      undefined,
    );
  });

  it("keeps system themes disabled and transition changes enabled", () => {
    render(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>,
    );

    expect(mockedNextThemesProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        enableSystem: false,
        disableTransitionOnChange: false,
      }),
      undefined,
    );
  });
});
