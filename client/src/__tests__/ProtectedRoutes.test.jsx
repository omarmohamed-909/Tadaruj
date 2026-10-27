import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/authSlice";
import {
    ProtectedRoute,
    AutheticatedUser,
    AdminRoute,
    InstructorRoute,
} from "../components/ProtectedRoutes";

// ─── Helper: build a minimal Redux store ────────────────────────────────────

const makeStore = (authState) =>
    configureStore({
        reducer: { auth: authReducer },
        preloadedState: { auth: authState },
    });

// ─── Helper: render component inside Router + Redux Provider ────────────────

const renderWithProviders = (ui, { store }) =>
    render(
        <Provider store={store}>
            <MemoryRouter>
                <Routes>
                    <Route path="/" element={ui} />
                    <Route path="/login" element={<div>Login Page</div>} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );

// ─── ProtectedRoute ──────────────────────────────────────────────────────────

describe("ProtectedRoute", () => {
    it("renders children when user is authenticated", () => {
        const store = makeStore({ user: { _id: "u1", role: "student" }, isAuthenticated: true });

        renderWithProviders(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>,
            { store }
        );

        expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });

    it("redirects to /login when user is not authenticated", () => {
        const store = makeStore({ user: null, isAuthenticated: false });

        renderWithProviders(
            <ProtectedRoute>
                <div>Protected Content</div>
            </ProtectedRoute>,
            { store }
        );

        expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
        expect(screen.getByText("Login Page")).toBeInTheDocument();
    });

    it("remembers the requested course after redirecting to login", () => {
        const store = makeStore({ user: null, isAuthenticated: false });
        const LoginLocation = () => {
            const location = useLocation();
            return <div>{location.state?.from}</div>;
        };
        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={["/course-progress/course-1"]}>
                    <Routes>
                        <Route path="/course-progress/:courseId" element={<ProtectedRoute><div>Private course</div></ProtectedRoute>} />
                        <Route path="/login" element={<LoginLocation />} />
                    </Routes>
                </MemoryRouter>
            </Provider>
        );
        expect(screen.getByText("/course-progress/course-1")).toBeInTheDocument();
    });
});

// ─── AutheticatedUser ────────────────────────────────────────────────────────

describe("AutheticatedUser", () => {
    it("renders children when user is NOT authenticated", () => {
        const store = makeStore({ user: null, isAuthenticated: false });

        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={["/login"]}>
                    <Routes>
                        <Route
                            path="/login"
                            element={
                                <AutheticatedUser>
                                    <div>Login Form</div>
                                </AutheticatedUser>
                            }
                        />
                        <Route path="/" element={<div>Home Page</div>} />
                    </Routes>
                </MemoryRouter>
            </Provider>
        );

        expect(screen.getByText("Login Form")).toBeInTheDocument();
    });

    it("redirects to / when user IS authenticated", () => {
        const store = makeStore({ user: { _id: "u1" }, isAuthenticated: true });

        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={["/login"]}>
                    <Routes>
                        <Route
                            path="/login"
                            element={
                                <AutheticatedUser>
                                    <div>Login Form</div>
                                </AutheticatedUser>
                            }
                        />
                        <Route path="/" element={<div>Home Page</div>} />
                    </Routes>
                </MemoryRouter>
            </Provider>
        );

        expect(screen.queryByText("Login Form")).not.toBeInTheDocument();
        expect(screen.getByText("Home Page")).toBeInTheDocument();
    });
});

// ─── AdminRoute ───────────────────────────────────────────────────────────────

const renderAdminRoute = (authState) =>
    render(
        <Provider store={makeStore(authState)}>
            <MemoryRouter initialEntries={["/admin"]}>
                <Routes>
                    <Route
                        path="/admin"
                        element={
                            <AdminRoute>
                                <div>Admin Dashboard</div>
                            </AdminRoute>
                        }
                    />
                    <Route path="/" element={<div>Home Page</div>} />
                    <Route path="/login" element={<div>Login Page</div>} />
                </Routes>
            </MemoryRouter>
        </Provider>
    );

describe("AdminRoute", () => {
    it("redirects to /login when user is not authenticated", () => {
        renderAdminRoute({ user: null, isAuthenticated: false });

        expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
        expect(screen.getByText("Login Page")).toBeInTheDocument();
    });

    it("redirects to / when authenticated user is not an admin", () => {
        renderAdminRoute({ user: { _id: "u1", role: "student" }, isAuthenticated: true });

        expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
        expect(screen.getByText("Home Page")).toBeInTheDocument();
    });

    it("renders children when authenticated user is an admin", () => {
        renderAdminRoute({ user: { _id: "u1", role: "admin" }, isAuthenticated: true });

        expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
    });

    it("keeps instructors out of the admin dashboard", () => {
        renderAdminRoute({ user: { _id: "u1", role: "instructor" }, isAuthenticated: true });
        expect(screen.getByText("Home Page")).toBeInTheDocument();
    });
});

describe("InstructorRoute", () => {
    it("allows instructors", () => {
        renderWithProviders(<InstructorRoute><div>Instructor Workspace</div></InstructorRoute>, {
            store: makeStore({ user: { _id: "u1", role: "instructor" }, isAuthenticated: true }),
        });
        expect(screen.getByText("Instructor Workspace")).toBeInTheDocument();
    });
});
