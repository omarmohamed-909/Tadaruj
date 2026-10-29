import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LearningDashboard from "../pages/student/LearningDashboard";
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("../features/api/courseProgressApi", () => ({ useGetMyLearningQuery: query }));
vi.mock("../components/languageContext", () => ({ useLanguage: () => ({ language: "en", t: key => key }) }));
const course = { _id: "c1", courseTitle: "Physics", creator: { name: "Teacher" }, subject: "Science", status: "in-progress", completedLessons: 1, totalLessons: 4, percentage: 25, resumeLectureId: "l2", resumeLectureTitle: "Motion" };
const renderPage = () => render(<MemoryRouter><LearningDashboard /></MemoryRouter>);
describe("learning dashboard", () => {
  it("links straight to the resumed lesson and filters without losing the route", () => {
    query.mockReturnValue({ currentData: { courses: [course], continueCourse: course, counts: { all: 1, "in-progress": 1, completed: 0, "not-started": 0 }, page: 1, totalPages: 1 } });
    renderPage();
    expect(screen.getAllByRole("link", { name: "Continue learning" })[0]).toHaveAttribute("href", "/course-progress/c1?lectureId=l2");
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "25");
    fireEvent.click(screen.getByRole("button", { name: "Completed 0" }));
    expect(query).toHaveBeenLastCalledWith({ page: 1, status: "completed" }, expect.anything());
  });
  it("distinguishes a request failure from an empty library", () => {
    const refetch = vi.fn(); query.mockReturnValue({ isError: true, refetch });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
    expect(screen.queryByText("No courses here yet")).not.toBeInTheDocument();
  });
});
