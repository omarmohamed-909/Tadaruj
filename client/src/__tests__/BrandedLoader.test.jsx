import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BrandedLoader from "../components/BrandedLoader";
import PageSkeleton, { ListSkeleton } from "../components/PageSkeleton";

afterEach(() => { document.documentElement.lang = "en"; });

describe("BrandedLoader", () => {
  it("keeps the favicon still while the surrounding ring rotates", () => {
    render(<BrandedLoader variant="fullPage" />);
    const status = screen.getByRole("status", { name: "Loading" });
    expect(status).toHaveClass("min-h-screen");
    expect(status.querySelector("img")).toHaveAttribute("src", "/brand-mark.webp");
    expect(status.querySelector("img")).not.toHaveClass("animate-spin");
    expect(status.querySelector("[aria-hidden='true']")).toHaveClass("motion-safe:animate-spin");
  });

  it("works in Arabic and replaces page and list placeholders", () => {
    document.documentElement.lang = "ar";
    render(<><PageSkeleton variant="profile" /><ListSkeleton /></>);
    expect(screen.getAllByRole("status", { name: "جارٍ التحميل" })).toHaveLength(2);
    expect(screen.getAllByRole("presentation")).toHaveLength(2);
  });
});
