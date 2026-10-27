import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { courseApi } from "./courseApi";
import { userLoggedIn, userloggedout } from "../authSlice";

import { API_BASE_URL } from "@/lib/apiBaseUrl";
const USER_API = `${API_BASE_URL}/api/v1/user/`;
const AUTH_TOKEN_KEY = "lms_auth_token";
const AUTH_USER_KEY = "lms_auth_user";

const getStoredToken = () => {
    if (typeof window === "undefined") {
        return "";
    }

    return window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
};

const storeToken = (token) => {
    if (typeof window === "undefined") {
        return;
    }

    if (token) {
        window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
};

const getStoredUser = () => {
    if (typeof window === "undefined") {
        return null;
    }

    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const storeUser = (user) => {
    if (typeof window === "undefined") {
        return;
    }

    if (user) {
        window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
        window.localStorage.removeItem(AUTH_USER_KEY);
    }
};

const getManageableCourseById = (state, courseId) => {
    const manageableCourses =
        courseApi.endpoints.getAdminManageableCourses.select()(state)?.data?.courses ?? [];

    return manageableCourses.find((course) => course._id === courseId) ?? null;
};

export const authApi = createApi({
    reducerPath: "authApi",
    tagTypes: ["CurrentUser", "AdminUsers", "PublicInstructors"],
    baseQuery: fetchBaseQuery({
        baseUrl: USER_API,
        credentials: "include",
        prepareHeaders: (headers, { endpoint }) => {
            if (endpoint === "getPublicInstructors" || endpoint === "getPublicInstructor") return headers;
            const token = getStoredToken();

            if (token) {
                headers.set("Authorization", `Bearer ${token}`);
            }

            return headers;
        },
    }),
    endpoints: (builder) => ({
        getGoogleAuthConfig: builder.query({
            query: () => ({ url: "google/config", method: "GET" }),
        }),
        startGoogleSignIn: builder.mutation({
            query: () => ({ url: "google/challenge", method: "POST", body: {} }),
        }),
        googleSignIn: builder.mutation({
            query: (body) => ({ url: "google", method: "POST", body }),
            async onQueryStarted(_, { queryFulfilled, dispatch }) {
                try {
                    const { data } = await queryFulfilled;
                    if (data.token && data.user) {
                        storeToken(data.token);
                        storeUser(data.user);
                        dispatch(userLoggedIn({ user: data.user }));
                    }
                } catch { /* The sign-in component displays translated errors. */ }
            },
        }),
        registerUser: builder.mutation({
            query: (inputData) => ({
                url: "register",
                method: "POST",
                body: inputData,
            }),
        }),
        loginUser: builder.mutation({
            query: (inputData) => ({
                url: "login",
                method: "POST",
                body: inputData,
            }),
            async onQueryStarted(_, { queryFulfilled, dispatch }) {
                try {
                    const result = await queryFulfilled;
                    storeToken(result?.data?.token);
                    storeUser(result?.data?.user);
                    dispatch(userLoggedIn({ user: result.data.user }));
                } catch (error) {
                    console.log(error);
                }
            },
        }),
        logoutUser: builder.mutation({
            query: () => ({
                url: "logout",
                method: "GET",
            }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                    storeToken("");
                    storeUser(null);
                    dispatch(userloggedout());
                } catch (error) {
                    console.log(error);
                }
            },
        }),
        loadUser: builder.query({
            query: () => ({
                url: "profile",
                method: "GET",
            }),
            providesTags: ["CurrentUser"],
            async onQueryStarted(_, { queryFulfilled, dispatch }) {
                try {
                    const result = await queryFulfilled;
                    if (result?.data?.token) {
                        storeToken(result.data.token);
                    }
                    storeUser(result?.data?.user);
                    dispatch(userLoggedIn({ user: result.data.user }));
                } catch (error) {
                    const status = error?.error?.status;
                    // Only clear persisted auth when backend confirms token is invalid.
                    if (status === 401 || status === 403) {
                        storeToken("");
                        storeUser(null);
                        dispatch(userloggedout());
                    } else {
                        const savedUser = getStoredUser();
                        const savedToken = getStoredToken();
                        if (savedUser && savedToken) {
                            dispatch(userLoggedIn({ user: savedUser }));
                        } else {
                            storeToken("");
                            storeUser(null);
                            dispatch(userloggedout());
                        }
                    }
                    console.log(error);
                }
            },
        }),
        updateUser: builder.mutation({
            query: (formData) => ({
                url: "profile/update",
                method: "PUT",
                body: formData,
                credentials: "include",
            }),
            invalidatesTags: ["CurrentUser", "PublicInstructors"],
        }),
        getPublicInstructors: builder.query({
            query: ({ page = 1, limit = 12, q = "", subject = "" } = {}) => ({
                url: "instructors",
                method: "GET",
                params: { page, limit, ...(q ? { q } : {}), ...(subject ? { subject } : {}) },
                credentials: "omit",
            }),
            providesTags: ["PublicInstructors"],
        }),
        getPublicInstructor: builder.query({
            query: ({ instructorId, page = 1, limit = 12 }) => ({ url: `instructors/${instructorId}`, params: { page, limit }, method: "GET", credentials: "omit" }),
            providesTags: ["PublicInstructors"],
        }),
        forgotPassword: builder.mutation({
            query: (email) => ({
                url: "forgot-password",
                method: "POST",
                body: { email },
            }),
        }),
        resetPassword: builder.mutation({
            query: ({ token, password }) => ({
                url: `reset-password/${token}`,
                method: "POST",
                body: { password },
            }),
        }),
        verifyEmail: builder.mutation({
            query: (token) => ({
                url: `verify-email/${token}`,
                method: "POST",
            }),
        }),
        resendVerificationEmail: builder.mutation({
            query: (email) => ({
                url: "verify-email/resend",
                method: "POST",
                body: { email },
            }),
        }),
        createAdminInvitation: builder.mutation({
            query: (email) => ({
                url: `${API_BASE_URL}/api/v1/admin/invitations`,
                method: "POST",
                body: { email },
            }),
        }),
        acceptAdminInvitation: builder.mutation({
            query: (token) => ({
                url: `${API_BASE_URL}/api/v1/admin/invitations/${token}/accept`,
                method: "POST",
            }),
            async onQueryStarted(_, { queryFulfilled, dispatch }) {
                try {
                    const { data } = await queryFulfilled;
                    storeUser(data.user);
                    dispatch(userLoggedIn({ user: data.user }));
                } catch { /* The component shows the error. */ }
            },
        }),
        getAdminUsers: builder.query({
            query: () => ({
                url: "admin/users",
                method: "GET",
            }),
            providesTags: ["AdminUsers"],
        }),
        updateUserRole: builder.mutation({
            query: ({ userId, role }) => ({
                url: `admin/users/${userId}/role`,
                method: "PATCH",
                body: { role },
            }),
            async onQueryStarted({ userId, role }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    authApi.util.updateQueryData("getAdminUsers", undefined, (draft) => {
                        const user = draft?.users?.find((item) => item._id === userId);

                        if (user) {
                            user.role = role;
                        }
                    })
                );

                try {
                    await queryFulfilled;
                } catch (error) {
                    patchResult.undo();
                    console.log(error);
                }
            },
            invalidatesTags: ["AdminUsers"],
        }),
        updateUserStatus: builder.mutation({
            query: ({ userId, status }) => ({
                url: `admin/users/${userId}/status`,
                method: "PATCH",
                body: { status },
            }),
            invalidatesTags: ["AdminUsers"],
        }),
        getAuditLogs: builder.query({
            query: (page = 1) => ({
                url: `${API_BASE_URL}/api/v1/admin/audit-logs?page=${page}`,
                method: "GET",
            }),
        }),
        deleteAdminUser: builder.mutation({
            query: ({ userId }) => ({
                url: `admin/users/${userId}`,
                method: "DELETE",
            }),
            async onQueryStarted({ userId }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    authApi.util.updateQueryData("getAdminUsers", undefined, (draft) => {
                        if (draft?.users) {
                            draft.users = draft.users.filter((item) => item._id !== userId);
                        }
                    })
                );

                try {
                    await queryFulfilled;
                } catch (error) {
                    patchResult.undo();
                    console.log(error);
                }
            },
            invalidatesTags: ["AdminUsers"],
        }),
        updateUserCourseAccess: builder.mutation({
            query: ({ userId, courseId, action }) => ({
                url: `admin/users/${userId}/course-access`,
                method: "PATCH",
                body: { courseId, action },
            }),
            async onQueryStarted({ userId, courseId, action }, { dispatch, getState, queryFulfilled }) {
                const course = getManageableCourseById(getState(), courseId);
                const patchResult = dispatch(
                    authApi.util.updateQueryData("getAdminUsers", undefined, (draft) => {
                        const user = draft?.users?.find((item) => item._id === userId);

                        if (!user) {
                            return;
                        }

                        if (!Array.isArray(user.enrolledCourses)) {
                            user.enrolledCourses = [];
                        }

                        if (action === "grant") {
                            const alreadyGranted = user.enrolledCourses.some(
                                (enrolledCourse) => enrolledCourse._id === courseId
                            );

                            if (!alreadyGranted) {
                                user.enrolledCourses.unshift(
                                    course ?? {
                                        _id: courseId,
                                        courseTitle: "Course access",
                                        creator: null,
                                        isPublished: false,
                                    }
                                );
                            }
                        }

                        if (action === "revoke") {
                            user.enrolledCourses = user.enrolledCourses.filter(
                                (enrolledCourse) => enrolledCourse._id !== courseId
                            );
                        }
                    })
                );

                try {
                    await queryFulfilled;
                } catch (error) {
                    patchResult.undo();
                    console.log(error);
                }
            },
            invalidatesTags: ["AdminUsers"],
        }),
    }),
});

export const {
    useGetGoogleAuthConfigQuery,
    useStartGoogleSignInMutation,
    useGoogleSignInMutation,
    useRegisterUserMutation,
    useLoginUserMutation,
    useLogoutUserMutation,
    useLoadUserQuery,
    useUpdateUserMutation,
    useGetPublicInstructorsQuery,
    useGetPublicInstructorQuery,
    useForgotPasswordMutation,
    useResetPasswordMutation,
    useVerifyEmailMutation,
    useResendVerificationEmailMutation,
    useGetAdminUsersQuery,
    useDeleteAdminUserMutation,
    useUpdateUserRoleMutation,
    useUpdateUserCourseAccessMutation,
    useCreateAdminInvitationMutation,
    useAcceptAdminInvitationMutation,
    useUpdateUserStatusMutation,
    useGetAuditLogsQuery,
} = authApi;
