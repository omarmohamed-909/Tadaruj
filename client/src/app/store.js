import {configureStore} from "@reduxjs/toolkit"
import rootReducer from "./rootReducer"
import { authApi } from "@/features/api/authApi"
import { courseApi } from "@/features/api/courseApi";
import { purchaseApi } from "@/features/api/purchaseApi";
import { courseProgressApi } from "@/features/api/courseProgressApi";
import { createSessionListener } from "./sessionListener";
import { setupListeners } from "@reduxjs/toolkit/query";

const sessionListener = createSessionListener();

export const appStore  =configureStore({
    reducer: rootReducer,
    middleware:(defaultMiddleware)=> defaultMiddleware().prepend(sessionListener.middleware).concat(authApi.middleware,courseApi.middleware, purchaseApi.middleware, courseProgressApi.middleware),
});
setupListeners(appStore.dispatch);
