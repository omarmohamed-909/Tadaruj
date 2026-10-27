import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import AppErrorBoundary from "../components/AppErrorBoundary";
import FailureState from "../components/FailureState";
import RouteError from "../pages/RouteError";
import { LanguageContext } from "../components/languageContext";
import { translateInterface } from "../lib/interfaceMessages";

const arabic = (children) => <LanguageContext.Provider value={{ language: "ar" }}>{children}</LanguageContext.Provider>;

describe("failure recovery", () => {
  it("catches a rendering failure, hides technical details, and retries the failed subtree", async () => {
    let shouldFail = true;
    function Content() { if (shouldFail) throw new Error("private internal failure"); return <h1>Recovered content</h1>; }
    const logging = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      render(arabic(<AppErrorBoundary><Content /></AppErrorBoundary>));
      expect(screen.getByRole("heading", { name: "حصل خطأ أثناء عرض الصفحة" })).toBeInTheDocument();
      expect(screen.queryByText("private internal failure")).not.toBeInTheDocument();
      shouldFail = false;
      await userEvent.click(screen.getByRole("button", { name: "حاول تاني" }));
      expect(screen.getByRole("heading", { name: "Recovered content" })).toBeInTheDocument();
    } finally { logging.mockRestore(); }
  });
  it("handles an unmatched route with a branded 404 and real recovery links", async () => {
    const router = createMemoryRouter([{ path: "/", element: <h1>Home</h1>, errorElement: <RouteError /> }], { initialEntries: ["/missing-page"] });
    const logging = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(arabic(<RouterProvider router={router} />));
      expect(await screen.findByRole("heading", { name: "الصفحة دي مش موجودة" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "الصفحة الرئيسية" })).toHaveAttribute("href", "/");
      expect(screen.getByRole("link", { name: "استكشف الكورسات" })).toHaveAttribute("href", "/courses");
    } finally { logging.mockRestore(); router.dispose(); }
  });
  it("allows explicit retry and home navigation in English without a router", async () => {
    const retry = vi.fn();
    render(<FailureState onRetry={retry} />);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  });
  it("interpolates instructor and course values without translating user content", () => {
    expect(translateInterface("Lecture {0}: {1}", "ar", [3, "Physics"])).toBe("الدرس 3: Physics");
    expect(translateInterface("Lecture {0}: {1}", "en", [3, "Physics"])).toBe("Lecture 3: Physics");
  });
});
