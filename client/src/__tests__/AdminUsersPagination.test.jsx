import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import UsersManagement from "../pages/admin/UsersManagement";
import UserCourseAccessDialog from "../pages/admin/UserCourseAccessDialog";
import { LanguageContext } from "../components/languageContext";
import { useGetAdminUsersQuery, useUpdateUserCourseAccessMutation } from "../features/api/authApi";
import { useGetAdminCourseAccessQuery } from "../features/api/courseApi";
vi.mock("../features/api/authApi", () => ({
  useGetAdminUsersQuery: vi.fn(),
  useDeleteAdminUserMutation: () => [vi.fn(), {}], useUpdateUserCourseAccessMutation: vi.fn(),
  useUpdateUserRoleMutation: () => [vi.fn(), {}], useCreateAdminInvitationMutation: () => [vi.fn(), {}], useUpdateUserStatusMutation: () => [vi.fn(), {}],
}));
vi.mock("../features/api/courseApi", () => ({ useGetAdminCourseAccessQuery: vi.fn() }));
const user = { _id: "user-one", name: "Test Member", email: "member@example.test", role: "student", status: "active", enrolledCourses: [] };
const result = ({ page }) => ({ currentData: { page, users: [user], total: 37, totalPages: 2 }, isLoading: false, isFetching: false });
function Navigation() { const location = useLocation(), navigate = useNavigate(); return <><output data-testid="location">{location.search}</output><button onClick={() => navigate(-1)}>History back</button></>; }
function show(url) {
  return render(<LanguageContext.Provider value={{ language: "en", t: key => ({ previousPage: "Previous", nextPage: "Next", pageLabel: "Page" }[key] || key) }}><MemoryRouter initialEntries={[url]}><UsersManagement /><Navigation /></MemoryRouter></LanguageContext.Provider>);
}
beforeEach(() => {
  vi.clearAllMocks(); useGetAdminUsersQuery.mockImplementation(result);
  useGetAdminCourseAccessQuery.mockReturnValue({ currentData: { courses: [], page: 1, total: 0, totalPages: 0, grantedTotal: 0 } });
  useUpdateUserCourseAccessMutation.mockReturnValue([vi.fn(() => ({ unwrap: async () => ({ message: "Course access updated." }) })), {}]);
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
    expect(useGetAdminCourseAccessQuery).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Manage Course Access" }));
    expect(useGetAdminCourseAccessQuery).toHaveBeenLastCalledWith({ userId: "user-one", page: 1, limit: 12, q: "", status: "all", access: "all" }, { refetchOnMountOrArgChange: true });
  });
});

const course = { _id: "course-one", courseTitle: "Physics", creator: { name: "Teacher One" }, isPublished: true, hasDirectAccess: true };
function showAccess() {
  return render(<LanguageContext.Provider value={{ language: "en", t: key => ({ previousPage: "Previous", nextPage: "Next", pageLabel: "Page" }[key] || key) }}><UserCourseAccessDialog user={user} onClose={vi.fn()} /></LanguageContext.Provider>);
}
describe("course access pages", () => {
  beforeEach(() => { useGetAdminCourseAccessQuery.mockImplementation(args => ({ currentData: { courses: [course], page: args.page, total: 27, totalPages: 3, grantedTotal: 15 }, isFetching: false })); });
  it("uses server access flags and global totals rather than the user-list snapshot", () => {
    showAccess();
    expect(screen.getByText("Matching courses: 27")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revoke" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Grant access" })).not.toBeInTheDocument();
  });
  it("searches on the server and resets pagination", () => {
    showAccess();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(useGetAdminCourseAccessQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }), expect.anything());
    fireEvent.change(screen.getByLabelText("Course search"), { target: { value: " Teacher Two " } });
    fireEvent.click(screen.getByRole("button", { name: "Search courses" }));
    expect(useGetAdminCourseAccessQuery).toHaveBeenLastCalledWith(expect.objectContaining({ userId: "user-one", page: 1, q: "Teacher Two" }), expect.anything());
  });
  it("shows a retryable error instead of reporting an empty catalog", () => {
    const retry = vi.fn();
    useGetAdminCourseAccessQuery.mockReturnValue({ isError: true, error: { data: { message: "Failed to load courses." } }, refetch: retry });
    showAccess();
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load courses.");
    expect(screen.queryByText("No matching courses found")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" })); expect(retry).toHaveBeenCalledOnce();
  });
  it("returns to the last available page when permissions reduce the result set", () => {
    let depleted = false;
    useGetAdminCourseAccessQuery.mockImplementation(args => {
      if (args.page === 2) depleted = true;
      return { currentData: { courses: [course], page: 1, totalPages: depleted ? 1 : 2 }, isFetching: false };
    });
    showAccess();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(useGetAdminCourseAccessQuery).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }), expect.anything());
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });
  it("disables access actions while results are being refreshed", () => {
    useGetAdminCourseAccessQuery.mockReturnValue({ currentData: { courses: [course], page: 1, totalPages: 3 }, isFetching: true });
    showAccess();
    expect(screen.getByRole("button", { name: "Revoke" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
  it("sends a revoke for the selected user's authoritative course", () => {
    const save = vi.fn(() => ({ unwrap: async () => ({ message: "Course access updated." }) }));
    useUpdateUserCourseAccessMutation.mockReturnValue([save, {}]);
    showAccess();
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }));
    expect(save).toHaveBeenCalledWith({ userId: "user-one", courseId: "course-one", action: "revoke" });
  });
});
