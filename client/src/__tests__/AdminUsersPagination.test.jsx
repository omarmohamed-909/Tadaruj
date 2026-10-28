import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import UsersManagement from "../pages/admin/UsersManagement";
import { LanguageContext } from "../components/languageContext";
import { useGetAdminUsersQuery } from "../features/api/authApi";
import { useGetAdminManageableCoursesQuery } from "../features/api/courseApi";
vi.mock("../features/api/authApi", () => ({
  useGetAdminUsersQuery: vi.fn(),
  useDeleteAdminUserMutation: () => [vi.fn(), {}], useUpdateUserCourseAccessMutation: () => [vi.fn(), {}],
  useUpdateUserRoleMutation: () => [vi.fn(), {}], useCreateAdminInvitationMutation: () => [vi.fn(), {}], useUpdateUserStatusMutation: () => [vi.fn(), {}],
}));
vi.mock("../features/api/courseApi", () => ({ useGetAdminManageableCoursesQuery: vi.fn() }));
const user = { _id: "user-one", name: "Test Member", email: "member@example.test", role: "student", status: "active", enrolledCourses: [] };
const result = ({ page }) => ({ currentData: { page, users: [user], total: 37, totalPages: 2 }, isLoading: false, isFetching: false });
function Navigation() { const location = useLocation(), navigate = useNavigate(); return <><output data-testid="location">{location.search}</output><button onClick={() => navigate(-1)}>History back</button></>; }
function show(url) {
  return render(<LanguageContext.Provider value={{ language: "en", t: key => ({ previousPage: "Previous", nextPage: "Next", pageLabel: "Page" }[key] || key) }}><MemoryRouter initialEntries={[url]}><UsersManagement /><Navigation /></MemoryRouter></LanguageContext.Provider>);
}
beforeEach(() => {
  vi.clearAllMocks(); useGetAdminUsersQuery.mockImplementation(result);
  useGetAdminManageableCoursesQuery.mockReturnValue({ data: { courses: [] } });
});
describe("admin user pages", () => {
  it("loads a bookmarked filtered page and preserves its filters across navigation", () => {
    show("/admin/users?q=Member&role=student&status=suspended&page=2");
    expect(useGetAdminUsersQuery).toHaveBeenLastCalledWith({ page: 2, limit: 20, q: "Member", role: "student", status: "suspended" });
    expect(screen.getByText("37")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByTestId("location").textContent).toBe("?q=Member&role=student&status=suspended");
    fireEvent.click(screen.getByRole("button", { name: "History back" }));
    expect(useGetAdminUsersQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, q: "Member" }));
  });
  it("submits server search and resets the page without losing the role filter", () => {
    show("/admin/users?role=student&page=2");
    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "  someone@example.test  " } });
    fireEvent.click(screen.getByRole("button", { name: "Search users" }));
    expect(useGetAdminUsersQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, q: "someone@example.test", role: "student" }));
    fireEvent.click(screen.getByRole("button", { name: "Instructors" }));
    expect(useGetAdminUsersQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, q: "someone@example.test", role: "instructor" }));
  });
  it("clears all filters and recovers an obsolete page link", () => {
    useGetAdminUsersQuery.mockImplementation(args => result({ page: Math.min(args.page, 2) }));
    show("/admin/users?q=Member&role=student&status=suspended&page=999");
    expect(screen.getByTestId("location").textContent).toContain("page=2");
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByTestId("location").textContent).toBe("");
    expect(screen.getByLabelText("Search users")).toHaveValue("");
    expect(useGetAdminUsersQuery).toHaveBeenLastCalledWith({ page: 1, limit: 20, q: "", role: "all", status: "all" });
  });
  it("defers course loading until course access is opened", () => {
    show("/admin/users");
    expect(useGetAdminManageableCoursesQuery).toHaveBeenLastCalledWith(undefined, { skip: true });
    fireEvent.click(screen.getByRole("button", { name: "Manage Course Access" }));
    expect(useGetAdminManageableCoursesQuery).toHaveBeenLastCalledWith(undefined, { skip: false });
  });
});
