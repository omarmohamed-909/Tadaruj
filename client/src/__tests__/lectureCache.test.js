import { afterEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { courseApi } from "../features/api/courseApi";

vi.mock("../features/api/purchaseApi", () => ({ purchaseApi: { util: { invalidateTags: () => ({ type: "test/invalidate" }) } } }));
let store;
afterEach(() => {
  store?.dispatch(courseApi.util.resetApiState());
  vi.unstubAllGlobals();
});

describe("lecture cache refresh", () => {
  it.each([true, false])("refreshes playback only after a successful lecture save (success=%s)", async (success) => {
    let saved = false;
    let reads = 0;
    vi.stubGlobal("fetch", vi.fn(async (request) => {
      if (request.method === "POST") {
        saved = success;
        return new Response(JSON.stringify({ message: success ? "Saved" : "Failed" }), { status: success ? 200 : 500 });
      }
      reads++;
      return new Response(JSON.stringify({ lecture: { _id: "lecture-1", playbackUrl: saved ? "signed-playback-url" : "" } }));
    }));
    store = configureStore({ reducer: { [courseApi.reducerPath]: courseApi.reducer }, middleware: (defaults) => defaults().concat(courseApi.middleware) });
    await store.dispatch(courseApi.endpoints.getLectureById.initiate("lecture-1"));
    expect(reads).toBe(1);
    await store.dispatch(courseApi.endpoints.editLecture.initiate({ courseId: "course-1", lectureId: "lecture-1", lectureTitle: "New title" }));
    if (success) {
      await waitFor(() => expect(courseApi.endpoints.getLectureById.select("lecture-1")(store.getState()).data.lecture.playbackUrl).toBe("signed-playback-url"));
      expect(reads).toBe(2);
    } else expect(reads).toBe(1);
  });
});
