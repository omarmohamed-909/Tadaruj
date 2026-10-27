import { configureStore } from "@reduxjs/toolkit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import authReducer from "../features/authSlice";
import { authApi } from "../features/api/authApi";
import { courseApi } from "../features/api/courseApi";
import { purchaseApi } from "../features/api/purchaseApi";
import { courseProgressApi } from "../features/api/courseProgressApi";
import { createSessionListener } from "../app/sessionListener";

const apis = [authApi, courseApi, purchaseApi, courseProgressApi];
const stores = [];
const store = () => {
  const listener = createSessionListener();
  const instance = configureStore({
    reducer: { auth: authReducer, ...Object.fromEntries(apis.map((api) => [api.reducerPath, api.reducer])) },
    preloadedState: { auth: { user: null, isAuthenticated: false } },
    middleware: (defaults) => defaults().prepend(listener.middleware).concat(apis.map((api) => api.middleware)),
  });
  stores.push(instance); return instance;
};
const reply = (data, status = 200) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } })));
const input = { credential: "google-token-for-test", nonce: "a".repeat(64) };
beforeEach(() => window.localStorage.clear());
afterEach(() => { for (const instance of stores.splice(0)) for (const api of apis) instance.dispatch(api.util.resetApiState()); vi.unstubAllGlobals(); window.localStorage.clear(); });

describe("Google application session", () => {
  it("persists only the app session and isolates caches after successful Google login", async () => {
    const user = { _id: "google-student", name: "Student", role: "student" };
    reply({ success: true, token: "application-session-token", user });
    const instance = store();
    const result = await instance.dispatch(authApi.endpoints.googleSignIn.initiate(input)).unwrap();
    expect(result.user).toEqual(user);
    await waitFor(() => expect(instance.getState().auth).toEqual({ user, isAuthenticated: true }));
    expect(window.localStorage.getItem("lms_auth_token")).toBe("application-session-token");
    expect(window.localStorage.getItem("lms_auth_user")).toBe(JSON.stringify(user));
    expect(JSON.stringify(window.localStorage)).not.toContain(input.credential);
    expect(JSON.stringify(window.localStorage)).not.toContain(input.nonce);
  });
  it("does not create an authenticated session before mailbox verification", async () => {
    reply({ success: true, requiresEmailVerification: true, email: "student@example.test", emailSent: false }, 201);
    const instance = store();
    await instance.dispatch(authApi.endpoints.googleSignIn.initiate(input)).unwrap();
    expect(instance.getState().auth.isAuthenticated).toBe(false);
    expect(window.localStorage.getItem("lms_auth_token")).toBeNull();
  });
  it("keeps linking challenges unauthenticated until password confirmation", async () => {
    reply({ success: false, code: "GOOGLE_LINK_REQUIRED" }, 409);
    const instance = store();
    await expect(instance.dispatch(authApi.endpoints.googleSignIn.initiate(input)).unwrap()).rejects.toMatchObject({ status: 409 });
    expect(instance.getState().auth.isAuthenticated).toBe(false);
    expect(window.localStorage.getItem("lms_auth_user")).toBeNull();
  });
});
