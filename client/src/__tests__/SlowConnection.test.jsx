import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { createElement } from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SessionContext } from "../components/sessionContext";
import SessionBootstrap from "../components/SessionBootstrap";
import { ProtectedRoute, AdminRoute, AutheticatedUser } from "../components/ProtectedRoutes";
import PurchaseCourseProtectedRoute from "../components/PurchaseCourseProtectedRoute";
import { useLoadUserQuery } from "../features/api/authApi";
import { useGetCourseDetailWithStatusQuery } from "../features/api/purchaseApi";

vi.mock("../features/api/authApi", () => ({ useLoadUserQuery: vi.fn() }));
vi.mock("../features/api/purchaseApi", () => ({ useGetCourseDetailWithStatusQuery: vi.fn() }));

const retry = vi.fn();
const authenticated = { user: { _id: "cached-user", role: "admin" }, isAuthenticated: true };
function show(content, { session = {}, auth = authenticated } = {}) {
  const store = configureStore({ reducer: { auth: () => auth } });
  return render(<Provider store={store}><SessionContext.Provider value={{ checking: false, failed: false, rejected: false, retry, ...session }}><MemoryRouter><Routes>
    <Route path="/" element={content} /><Route path="/login" element={<p>Login destination</p>} />
    <Route path="/course-detail/*" element={<p>Course details</p>} />
  </Routes></MemoryRouter></SessionContext.Provider></Provider>);
}
beforeEach(() => { vi.clearAllMocks(); });

describe("slow connection session recovery", () => {
  it("renders public content while the session check is pending", () => {
    useLoadUserQuery.mockReturnValue({ isLoading: true, refetch: retry });
    render(<SessionBootstrap><h1>Public home</h1></SessionBootstrap>);
    expect(screen.getByRole("heading", { name: "Public home" })).toBeInTheDocument();
  });
  it.each([ProtectedRoute, AdminRoute])("does not trust a cached identity before server validation", Guard => {
    show(createElement(Guard, null, <p>Private content</p>), { session: { checking: true } });
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
  it("offers retry instead of treating an unavailable server as logout", () => {
    show(<ProtectedRoute><p>Private content</p></ProtectedRoute>, { session: { failed: true } });
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
    expect(screen.queryByText("Login destination")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it("rejects a stale cached identity when the server denies the session", () => {
    show(<AdminRoute><p>Private content</p></AdminRoute>, { session: { rejected: true } });
    expect(screen.getByText("Login destination")).toBeInTheDocument();
    expect(screen.queryByText("Private content")).not.toBeInTheDocument();
  });
  it("keeps the guest login form usable while checking for an existing session", () => {
    show(<AutheticatedUser><p>Login form</p></AutheticatedUser>, { session: { checking: true }, auth: { user: null, isAuthenticated: false } });
    expect(screen.getByText("Login form")).toBeInTheDocument();
  });
  it("keeps course access gated and retryable when its access check times out", () => {
    useGetCourseDetailWithStatusQuery.mockReturnValue({ isError: true, error: { status: "TIMEOUT_ERROR" }, refetch: retry });
    show(<PurchaseCourseProtectedRoute><p>Paid lesson</p></PurchaseCourseProtectedRoute>);
    expect(screen.queryByText("Paid lesson")).not.toBeInTheDocument();
    expect(screen.queryByText("Course details")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });
  it("still redirects an explicitly denied course purchase", () => {
    useGetCourseDetailWithStatusQuery.mockReturnValue({ isError: true, error: { status: 403 }, refetch: retry });
    show(<PurchaseCourseProtectedRoute><p>Paid lesson</p></PurchaseCourseProtectedRoute>);
    expect(screen.getByText("Course details")).toBeInTheDocument();
    expect(screen.queryByText("Paid lesson")).not.toBeInTheDocument();
  });
});
