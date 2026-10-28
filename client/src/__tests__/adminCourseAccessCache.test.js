import { afterEach, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { authApi } from "../features/api/authApi";
import { courseApi } from "../features/api/courseApi";
let store;
afterEach(() => { store?.dispatch(authApi.util.resetApiState()); store?.dispatch(courseApi.util.resetApiState()); vi.unstubAllGlobals(); });
it.each([200, 500])("refreshes all pages for the affected user after an access response (%s), without changing another user's cache", async status => {
  const reads = {};
  let changed = false;
  vi.stubGlobal("fetch", vi.fn(async request => {
    if (request.method === "PATCH") { changed = true; return new Response(JSON.stringify({ message: "Access update result" }), { status }); }
    const params = new URL(request.url).searchParams, userId = params.get("userId"), page = Number(params.get("page"));
    const key = `${userId}-${page}`; reads[key] = (reads[key] || 0) + 1;
    return new Response(JSON.stringify({ page, total: 27, totalPages: 3, courses: [{ _id: "course-one", hasDirectAccess: userId === "user-a" && changed }] }));
  }));
  store = configureStore({ reducer: { [authApi.reducerPath]: authApi.reducer, [courseApi.reducerPath]: courseApi.reducer }, middleware: defaults => defaults().concat(authApi.middleware, courseApi.middleware) });
  const first = { userId: "user-a", page: 1 }, second = { userId: "user-a", page: 2 }, other = { userId: "user-b", page: 1 };
  await Promise.all([first, second, other].map(args => store.dispatch(courseApi.endpoints.getAdminCourseAccess.initiate(args))));
  await store.dispatch(authApi.endpoints.updateUserCourseAccess.initiate({ userId: "user-a", courseId: "course-one", action: "grant" }));
  await waitFor(() => {
    for (const args of [first, second]) expect(courseApi.endpoints.getAdminCourseAccess.select(args)(store.getState()).data.courses[0].hasDirectAccess).toBe(true);
  });
  expect(reads).toEqual({ "user-a-1": 2, "user-a-2": 2, "user-b-1": 1 });
  expect(courseApi.endpoints.getAdminCourseAccess.select(other)(store.getState()).data.courses[0].hasDirectAccess).toBe(false);
});
