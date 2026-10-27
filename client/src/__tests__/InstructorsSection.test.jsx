import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageContext } from "../components/languageContext";
import InstructorsSection from "../pages/student/InstructorsSection";
import { useGetPublicInstructorsQuery } from "../features/api/authApi";

vi.mock("../features/api/authApi", () => ({ useGetPublicInstructorsQuery: vi.fn() }));

describe("InstructorsSection", () => {
  it("shows an instructor without published courses and links to the public profile", () => {
    useGetPublicInstructorsQuery.mockReturnValue({
      data: { instructors: [{ _id: "teacher-1", name: "Amal", photoUrl: "", courseCount: 0, instructorSubjects: ["Science"] }] },
      isLoading: false,
      isError: false,
    });

    render(<LanguageContext.Provider value={{ t: (key) => key }}><MemoryRouter><InstructorsSection /></MemoryRouter></LanguageContext.Provider>);

    expect(screen.getByRole("link", { name: /Amal/ })).toHaveAttribute("href", "/instructors/teacher-1");
    expect(screen.getByText("instructorNoCourses")).toBeInTheDocument();
    expect(screen.getByText("viewInstructorProfile")).toBeInTheDocument();
    expect(screen.getByText("instructorProfileHint")).toBeInTheDocument();
    expect(useGetPublicInstructorsQuery).toHaveBeenCalledWith({ page: 1, limit: 6 });
    expect(screen.getByRole("link", { name: "viewAllInstructors" })).toHaveAttribute("href", "/instructors");
  });

  it("shows multiple instructors as separate profile cards without a course catalog", () => {
    useGetPublicInstructorsQuery.mockReturnValue({
      data: { instructors: [
        { _id: "teacher-1", name: "Amal", instructorSubjects: ["Science"], instructorBio: "Clear science lessons", courseCount: 2 },
        { _id: "teacher-2", name: "Karim", instructorSubjects: ["History"], instructorBio: "Stories from history", courseCount: 1 },
      ] },
      isLoading: false,
      isError: false,
    });

    render(<LanguageContext.Provider value={{ t: (key) => key }}><MemoryRouter><InstructorsSection /></MemoryRouter></LanguageContext.Provider>);

    expect(screen.getByRole("link", { name: /Amal/ })).toHaveAttribute("href", "/instructors/teacher-1");
    expect(screen.getByRole("link", { name: /Karim/ })).toHaveAttribute("href", "/instructors/teacher-2");
    expect(screen.getByText("Science")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
  });
});
