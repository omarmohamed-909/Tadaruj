import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { purchaseApi, useLiveCoursePurchaseStatus } from "../features/api/purchaseApi";

let store;
afterEach(() => {
  cleanup();
  store?.dispatch(purchaseApi.util.resetApiState());
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function Status() {
  const { data } = useLiveCoursePurchaseStatus("course-1");
  return <p>{data?.hasAccess ? "Unlocked" : data?.pendingManualOrder ? "Pending" : "Loading"}</p>;
}
describe("live manual-order status", () => {
  it("refreshes a pending order, then stops polling once access is granted", async () => {
    vi.useFakeTimers();
    let approved = false;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ hasAccess: approved, pendingManualOrder: approved ? null : { reference: "QA" } })));
    vi.stubGlobal("fetch", fetchMock);
    store = configureStore({ reducer: { [purchaseApi.reducerPath]: purchaseApi.reducer }, middleware: (defaults) => defaults().concat(purchaseApi.middleware) });
    render(<Provider store={store}><Status /></Provider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByText("Pending")).toBeInTheDocument();
    approved = true;
    await act(async () => { await vi.advanceTimersByTimeAsync(16000); });
    expect(screen.getByText("Unlocked")).toBeInTheDocument();
    const reads = fetchMock.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(fetchMock).toHaveBeenCalledTimes(reads);
  });
});
