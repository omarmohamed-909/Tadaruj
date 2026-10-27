import { describe, expect, it, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import authReducer, { userLoggedIn, userloggedout } from "../features/authSlice";
import { createSessionListener } from "../app/sessionListener";

vi.mock("../features/api/authApi", () => ({ authApi: { util: { resetApiState: () => ({ type: "authApi/resetApiState" }) } } }));
vi.mock("../features/api/courseApi", () => ({ courseApi: { util: { resetApiState: () => ({ type: "courseApi/resetApiState" }) } } }));
vi.mock("../features/api/purchaseApi", () => ({ purchaseApi: { util: { resetApiState: () => ({ type: "purchaseApi/resetApiState" }) } } }));
vi.mock("../features/api/courseProgressApi", () => ({ courseProgressApi: { util: { resetApiState: () => ({ type: "courseProgressApi/resetApiState" }) } } }));

const setup = (user) => {
  const actions = [];
  const listener = createSessionListener();
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { user, isAuthenticated: Boolean(user) } },
    middleware: (defaults) => defaults().prepend(listener.middleware).concat(() => (next) => (action) => { actions.push(action.type); return next(action); }),
  });
  return { store, resets: () => actions.filter((type) => type.endsWith("/resetApiState")) };
};
describe("session cache isolation", () => {
  it("clears every API cache when switching accounts", () => {
    const { store, resets } = setup({ _id: "teacher" });
    store.dispatch(userLoggedIn({ user: { _id: "student" } }));
    expect(resets()).toHaveLength(4);
  });
  it("clears every API cache after logout", () => {
    const { store, resets } = setup({ _id: "teacher" });
    store.dispatch(userloggedout());
    expect(resets()).toHaveLength(4);
  });
  it("does not clear caches in a loop when refreshing the same profile", () => {
    const { store, resets } = setup({ _id: "teacher" });
    store.dispatch(userLoggedIn({ user: { _id: "teacher", name: "Updated" } }));
    expect(resets()).toHaveLength(0);
  });
});
