import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { LanguageContext } from "../components/languageContext";
import AllCourses from "../pages/student/AllCourses";
import InstructorProfile from "../pages/student/InstructorProfile";
import SearchPage from "../pages/student/SearchPage";
import { useGetPublishedCourseQuery, useGetSearchCourseQuery, useGetCourseFiltersQuery } from "../features/api/courseApi";
import { useGetPublicInstructorQuery } from "../features/api/authApi";

vi.mock("../features/api/courseApi", () => ({ useGetPublishedCourseQuery: vi.fn(), useGetSearchCourseQuery: vi.fn(), useGetCourseFiltersQuery: vi.fn() }));
vi.mock("../features/api/authApi", () => ({ useGetPublicInstructorQuery: vi.fn() }));
function Navigation() {
  const { search } = useLocation(); const navigate = useNavigate();
  return <><output data-testid="location">{search}</output><button onClick={() => navigate(-1)}>History back</button></>;
}
function show(route, element, path = "*") {
  return render(<LanguageContext.Provider value={{ language: "en", t: (key) => key }}><MemoryRouter initialEntries={[route]}><Routes><Route path={path} element={element} /></Routes><Navigation /></MemoryRouter></LanguageContext.Provider>);
}
function pageResult({ page = 1 } = {}) {
  return { data: { page, total: 37, totalPages: 4, courses: [{ _id: `course-${page}`, courseTitle: `Course page ${page}`, subject: "Science" }] }, isFetching: false, isLoading: false };
}
beforeEach(() => {
  vi.clearAllMocks();
  useGetPublishedCourseQuery.mockImplementation(pageResult);
  useGetSearchCourseQuery.mockImplementation(pageResult);
  useGetCourseFiltersQuery.mockReturnValue({ data: { subjects: ["Science", "History"], grades: ["Grade 1"] } });
  useGetPublicInstructorQuery.mockImplementation((args) => ({ ...pageResult(args), data: { ...pageResult(args).data, instructor: { name: "Amal", courseCount: 37 } } }));
});

describe("course pagination", () => {
  it("loads bookmarked catalog pages and shows the total rather than the current page size", () => {
    show("/courses?page=2", <AllCourses />);
    expect(useGetPublishedCourseQuery).toHaveBeenLastCalledWith({ page: 2, limit: 12 });
    expect(screen.getByText("37 catalogCount")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "nextPage" }));
    expect(screen.getByTestId("location")).toHaveTextContent("page=3");
    expect(screen.getByRole("heading", { name: "Course page 3" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "History back" }));
    expect(screen.getByRole("heading", { name: "Course page 2" })).toBeInTheDocument();
  });
  it("preserves search, subject, stage, and sorting when paging, and resets the page when filters change", () => {
    show("/course/search?query=unit&subjects=Science&grades=Grade+1&sortByPrice=low&page=2", <SearchPage />);
    fireEvent.click(screen.getByRole("button", { name: "nextPage" }));
    expect(useGetSearchCourseQuery).toHaveBeenLastCalledWith({ query: "unit", subjects: ["Science"], grades: ["Grade 1"], sortByPrice: "low", page: 3, limit: 12 });
    fireEvent.click(screen.getByRole("checkbox", { name: "History" }));
    expect(screen.getByTestId("location")).not.toHaveTextContent("page=");
    expect(useGetSearchCourseQuery).toHaveBeenLastCalledWith({ query: "unit", subjects: ["Science", "History"], grades: ["Grade 1"], sortByPrice: "low", page: 1, limit: 12 });
    fireEvent.click(screen.getByRole("button", { name: "History back" }));
    expect(screen.getByRole("checkbox", { name: "History" })).not.toBeChecked();
    expect(screen.getByTestId("location")).toHaveTextContent("page=3");
    expect(useGetPublishedCourseQuery).not.toHaveBeenCalled();
  });
  it("paginates public instructor courses while retaining the complete course count", () => {
    show("/instructors/teacher-1?page=2", <InstructorProfile />, "/instructors/:instructorId");
    expect(screen.getByText("37 instructorCourses")).toBeInTheDocument();
    expect(useGetPublicInstructorQuery).toHaveBeenLastCalledWith({ instructorId: "teacher-1", page: 2, limit: 12 }, expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "nextPage" }));
    expect(useGetPublicInstructorQuery).toHaveBeenLastCalledWith({ instructorId: "teacher-1", page: 3, limit: 12 }, expect.anything());
  });
  it("canonicalizes obsolete page URLs and hides stale listings during a new request", () => {
    useGetPublishedCourseQuery.mockImplementation(({ page }) => page === 999 ? { ...pageResult({ page: 4 }) } : pageResult({ page }));
    const { unmount } = show("/courses?page=999", <AllCourses />);
    expect(screen.getByTestId("location")).toHaveTextContent("page=4");
    unmount();
    useGetPublishedCourseQuery.mockReturnValue({ ...pageResult(), isFetching: true });
    show("/courses?page=2", <AllCourses />);
    expect(screen.queryByRole("heading", { name: "Course page 1" })).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("page=2");
    expect(screen.getByRole("button", { name: "nextPage" })).toBeDisabled();
  });
});
