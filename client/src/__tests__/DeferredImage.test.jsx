import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import DeferredImage from "../components/DeferredImage";

afterEach(() => vi.unstubAllGlobals());
describe("noncritical image downloads", () => {
  it("waits until near the viewport and disconnects on unmount", () => {
    let notify;
    const disconnect = vi.fn();
    const observe = vi.fn();
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback, options) { notify = callback; expect(options.rootMargin).toBe("200px"); }
      observe = observe;
      disconnect = disconnect;
    });
    const { unmount } = render(<DeferredImage src="/teacher.webp" alt="Teacher" width={112} height={112} />);
    const image = screen.getByRole("img", { name: "Teacher" });
    expect(image).not.toHaveAttribute("src");
    expect(image).toHaveAttribute("width", "112");
    expect(observe).toHaveBeenCalledWith(image);
    act(() => notify([{ isIntersecting: false }]));
    expect(image).not.toHaveAttribute("src");
    act(() => notify([{ isIntersecting: true }]));
    expect(image).toHaveAttribute("src", "/teacher.webp");
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
  it("loads normally in browsers without IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<DeferredImage src="/footer.webp" alt="Tadaruj" />);
    expect(screen.getByRole("img", { name: "Tadaruj" })).toHaveAttribute("src", "/footer.webp");
  });
});
