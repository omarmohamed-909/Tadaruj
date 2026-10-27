import { describe, it, expect } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import authReducer, { userLoggedIn, userloggedout } from "../features/authSlice";

// Build a minimal store for isolated slice tests
const makeStore = (preloadedState) =>
    configureStore({
        reducer: { auth: authReducer },
        preloadedState,
    });

describe("authSlice", () => {
    it("has a default initial state of unauthenticated with no user", () => {
        // Clear localStorage to ensure default state
        localStorage.clear();
        const store = makeStore();
        const state = store.getState().auth;

        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
    });

    it("userLoggedIn sets user and marks isAuthenticated true", () => {
        const store = makeStore();
        const fakeUser = { _id: "u1", name: "Alice", role: "student" };

        store.dispatch(userLoggedIn({ user: fakeUser }));

        const state = store.getState().auth;
        expect(state.isAuthenticated).toBe(true);
        expect(state.user).toEqual(fakeUser);
    });

    it("userloggedout clears user and sets isAuthenticated to false", () => {
        const store = makeStore({
            auth: { user: { _id: "u1", name: "Alice" }, isAuthenticated: true },
        });

        store.dispatch(userloggedout());

        const state = store.getState().auth;
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
    });

    it("dispatching userLoggedIn then userloggedout returns to unauthenticated", () => {
        const store = makeStore();
        const fakeUser = { _id: "u2", name: "Bob" };

        store.dispatch(userLoggedIn({ user: fakeUser }));
        expect(store.getState().auth.isAuthenticated).toBe(true);

        store.dispatch(userloggedout());
        expect(store.getState().auth.isAuthenticated).toBe(false);
        expect(store.getState().auth.user).toBeNull();
    });

    it("userLoggedIn with different users updates state to the latest user", () => {
        const store = makeStore();
        const user1 = { _id: "u1", name: "Alice" };
        const user2 = { _id: "u2", name: "Bob" };

        store.dispatch(userLoggedIn({ user: user1 }));
        store.dispatch(userLoggedIn({ user: user2 }));

        const state = store.getState().auth;
        expect(state.user).toEqual(user2);
        expect(state.isAuthenticated).toBe(true);
    });

    it("multiple logout dispatches do not throw and stay unauthenticated", () => {
        const store = makeStore();

        store.dispatch(userloggedout());
        store.dispatch(userloggedout());

        const state = store.getState().auth;
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
    });
});
