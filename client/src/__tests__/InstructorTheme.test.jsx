import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { createPortal } from "react-dom";
import AcademyTheme from "../components/AcademyTheme";
import { usesAcademyTheme } from "../lib/academyTheme";

afterEach(cleanup);

describe("AcademyTheme", () => {
  it("sets the palette on the document so portal menus inherit it", () => {
    render(<><AcademyTheme enabled />{createPortal(<div role="dialog">Course settings</div>, document.body)}</>);
    expect(document.documentElement).toHaveAttribute("data-academy-theme");
    expect(document.querySelector('[role="dialog"]').closest("[data-academy-theme]")).toBe(document.documentElement);
  });

  it("keeps the palette throughout the course journey and removes it on exit", () => {
    const { rerender } = render(<AcademyTheme enabled={usesAcademyTheme("/courses")} />);
    for (const route of ["/course/search", "/course-detail/course-id", "/course-progress/course-id", "/my-learning"]) {
      rerender(<AcademyTheme enabled={usesAcademyTheme(route)} />);
      expect(document.documentElement).toHaveAttribute("data-academy-theme");
    }
    rerender(<AcademyTheme enabled={usesAcademyTheme("/")} />);
    expect(document.documentElement).not.toHaveAttribute("data-academy-theme");
  });

  it("cleans up when the layout unmounts without changing language or dark mode", () => {
    document.documentElement.classList.add("dark");
    document.documentElement.dir = "rtl";
    const { unmount } = render(<AcademyTheme enabled />);
    unmount();
    expect(document.documentElement).not.toHaveAttribute("data-academy-theme");
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.dir).toBe("rtl");
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("dir");
  });

  it.each(["/admin", "/login", "/courses-admin", "/instructors", "/course-progressive"])("does not change unrelated routes: %s", (route) => {
    expect(usesAcademyTheme(route)).toBe(false);
  });

  it("keeps the instructor workspace on the shared palette", () => {
    expect(usesAcademyTheme("/instructor")).toBe(true);
    expect(usesAcademyTheme("/instructor/course/create")).toBe(true);
  });
});
