import { afterEach, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { authApi } from "../features/api/authApi";
let store;
afterEach(() => { store?.dispatch(authApi.util.resetApiState()); vi.unstubAllGlobals(); });
it("refreshes every subscribed user page after a role mutation", async () => {
  const reads = { 1: 0, 2: 0 };
  let changed = false;
  vi.stubGlobal("fetch", vi.fn(async request => {
    if (request.method === "PATCH") { changed = true; return new Response(JSON.stringify({ message: "Updated" })); }
    const page = Number(new URL(request.url).searchParams.get("page"));
    reads[page]++;
    return new Response(JSON.stringify({ page, users: [{ _id: "user-one", role: changed ? "instructor" : "student" }], total: 21, totalPages: 2 }));
  }));
  store = configureStore({ reducer: { [authApi.reducerPath]: authApi.reducer }, middleware: defaults => defaults().concat(authApi.middleware) });
  await Promise.all([1, 2].map(page => store.dispatch(authApi.endpoints.getAdminUsers.initiate({ page }))));
  await store.dispatch(authApi.endpoints.updateUserRole.initiate({ userId: "user-one", role: "instructor" }));
  await waitFor(() => {
    expect(authApi.endpoints.getAdminUsers.select({ page: 1 })(store.getState()).data.users[0].role).toBe("instructor");
    expect(authApi.endpoints.getAdminUsers.select({ page: 2 })(store.getState()).data.users[0].role).toBe("instructor");
  });
  expect(reads).toEqual({ 1: 2, 2: 2 });
});
