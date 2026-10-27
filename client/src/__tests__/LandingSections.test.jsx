import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { LanguageContext } from "../components/languageContext";
import LearningPathSection from "../pages/student/LearningPathSection";
import JoinSection from "../pages/student/JoinSection";

const renderWithProviders = (element, user = null) => {
  const store = configureStore({ reducer: { auth: () => ({ user }) } });
  return render(
    <Provider store={store}>
      <LanguageContext.Provider value={{ t: (key) => key }}>
        <MemoryRouter>{element}</MemoryRouter>
      </LanguageContext.Provider>
    </Provider>
  );
};

describe("landing page sections", () => {
  it("explains the path through instructor profiles", () => {
    renderWithProviders(<LearningPathSection />);
    expect(screen.getByRole("heading", { name: "homePathTitle" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "homeStepTwoTitle" })).toBeInTheDocument();
  });

  it("reveals the learning path when it enters the viewport", () => {
    let onIntersection;
    const disconnect = vi.fn();
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback) { onIntersection = callback; }
      observe() {}
      disconnect() { disconnect(); }
    });
    try {
      const { container } = renderWithProviders(<LearningPathSection />);
      const section = container.querySelector(".academy-journey");
      expect(section).not.toHaveClass("is-visible");
      act(() => onIntersection([{ isIntersecting: true }]));
      expect(section).toHaveClass("is-visible");
      expect(disconnect).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("links to instructors and offers sign-up to visitors", () => {
    renderWithProviders(<JoinSection />);
    expect(screen.getByRole("link", { name: "joinFindInstructor" })).toHaveAttribute("href", "#instructors");
    expect(screen.getByRole("link", { name: "signup" })).toHaveAttribute("href", "/login?mode=signup");
  });

  it("does not ask signed-in learners to create another account", () => {
    renderWithProviders(<JoinSection />, { _id: "student-1" });
    expect(screen.queryByRole("link", { name: "signup" })).not.toBeInTheDocument();
  });
});
