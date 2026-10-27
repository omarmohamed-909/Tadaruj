import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { userLoggedIn, userloggedout } from "../features/authSlice";
import { authApi } from "../features/api/authApi";
import { courseApi } from "../features/api/courseApi";
import { purchaseApi } from "../features/api/purchaseApi";
import { courseProgressApi } from "../features/api/courseProgressApi";

export function createSessionListener() {
  const listener = createListenerMiddleware();
  listener.startListening({
    matcher: isAnyOf(userLoggedIn, userloggedout),
    effect: (_, api) => {
      const previousId = api.getOriginalState().auth.user?._id || null;
      const currentId = api.getState().auth.user?._id || null;
      if (previousId === currentId) return;
      // Never carry profile, private media, purchase status or results across accounts.
      for (const endpoint of [authApi, courseApi, purchaseApi, courseProgressApi]) {
        api.dispatch(endpoint.util.resetApiState());
      }
    },
  });
  return listener;
}
