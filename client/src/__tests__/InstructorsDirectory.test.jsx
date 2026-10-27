import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { LanguageContext } from "../components/languageContext";
import InstructorsDirectory from "../pages/student/InstructorsDirectory";
import { useGetPublicInstructorsQuery } from "../features/api/authApi";

vi.mock("../features/api/authApi", () => ({ useGetPublicInstructorsQuery: vi.fn() }));

const Location = () => {
  const { search } = useLocation();
  return <output data-testid="location">{search}</output>;
};

const renderDirectory = (route = "/instructors") => render(
  <LanguageContext.Provider value={{ t: (key) => key }}>
    <MemoryRouter initialEntries={[route]}>
      <InstructorsDirectory />
      <Location />
    </MemoryRouter>
  </LanguageContext.Provider>,
);

describe("InstructorsDirectory", () => {
  it("shows a bounded page of instructors and preserves filters while paging", () => {
    useGetPublicInstructorsQuery.mockReturnValue({
      data: {
        total: 13,
        totalPages: 2,
        subjects: ["History", "Science"],
        instructors: [{ _id: "teacher-1", name: "Amal", instructorSubjects: ["Science"], courseCount: 2 }],
      },
      isFetching: false,
      isError: false,
    });

    renderDirectory("/instructors?q=Amal&subject=Science");

    expect(useGetPublicInstructorsQuery).toHaveBeenCalledWith({ page: 1, limit: 12, q: "Amal", subject: "Science" });
    expect(screen.getByRole("link", { name: /Amal/ })).toHaveAttribute("href", "/instructors/teacher-1");
    fireEvent.click(screen.getByRole("button", { name: "nextPage" }));
    expect(screen.getByTestId("location")).toHaveTextContent("q=Amal&subject=Science&page=2");
    expect(useGetPublicInstructorsQuery).toHaveBeenLastCalledWith({ page: 2, limit: 12, q: "Amal", subject: "Science" });
  });

  it("resets pagination when a new search or subject is selected", () => {
    useGetPublicInstructorsQuery.mockReturnValue({
      data: { total: 0, totalPages: 0, subjects: ["Science", "History"], instructors: [] },
      isFetching: false,
      isError: false,
    });

    renderDirectory("/instructors?page=3&subject=Science");
    fireEvent.change(screen.getByRole("combobox", { name: "subject" }), { target: { value: "History" } });
    expect(screen.getByTestId("location")).toHaveTextContent("subject=History");
    expect(screen.getByTestId("location")).not.toHaveTextContent("page=");

    fireEvent.change(screen.getByRole("textbox", { name: "instructorSearchPlaceholder" }), { target: { value: "Karim" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(screen.getByTestId("location")).toHaveTextContent("q=Karim&subject=History");
    expect(useGetPublicInstructorsQuery).toHaveBeenLastCalledWith({ page: 1, limit: 12, q: "Karim", subject: "History" });
  });
});
