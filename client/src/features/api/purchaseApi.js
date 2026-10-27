import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { API_BASE_URL } from "@/lib/apiBaseUrl";
const COURSE_PURCHASE_API = `${API_BASE_URL}/api/v1/purchase`;
const AUTH_TOKEN_KEY = "lms_auth_token";

const getStoredToken = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY) || "";
};

export const purchaseApi = createApi({
  reducerPath: "purchaseApi",
  tagTypes: ["PurchaseStatus", "ManualOrders"],
  baseQuery: fetchBaseQuery({
    baseUrl: COURSE_PURCHASE_API,
    credentials: "include",
    prepareHeaders: (headers) => {
      const token = getStoredToken();

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),
  endpoints: (builder) => ({
    requestManualOrder: builder.mutation({
      query: (courseId) => ({ url: "/manual-orders", method: "POST", body: { courseId } }),
      invalidatesTags: ["ManualOrders", "PurchaseStatus"],
    }),
    getManualOrders: builder.query({
      query: ({ page = 1, limit = 20, status = "" } = {}) => ({
        url: "/manual-orders",
        params: { page, limit, ...(status ? { status } : {}) },
      }),
      providesTags: ["ManualOrders"],
    }),
    reviewManualOrder: builder.mutation({
      query: ({ orderId, decision }) => ({ url: `/manual-orders/${orderId}`, method: "PATCH", body: { decision } }),
      invalidatesTags: ["ManualOrders", "PurchaseStatus"],
    }),
    getCourseDetailWithStatus: builder.query({
      query: (courseId) => ({
        url: `/course/${courseId}/detail-with-status`,
        method: "GET",
      }),
      providesTags: (result, error, courseId) => [
        { type: "PurchaseStatus", id: courseId },
      ],
    }),
    verifyCheckoutSession: builder.mutation({
      query: ({ sessionId, courseId }) => ({
        url: "/checkout/verify-session",
        method: "POST",
        body: { sessionId, courseId },
      }),
      invalidatesTags: ["PurchaseStatus"],
    }),
    getPurchasedCourses: builder.query({
      query: () => ({
        url: "/",
        method: "GET",
      }),
    }),
  }),
});

export const {
  useRequestManualOrderMutation,
  useGetManualOrdersQuery,
  useReviewManualOrderMutation,
  useGetCourseDetailWithStatusQuery,
  useVerifyCheckoutSessionMutation,
  useGetPurchasedCoursesQuery,
} = purchaseApi;

// Poll only while an order is pending, so a teacher's approval on another device
// unlocks the page without the student having to reload it manually.
export const useLiveCoursePurchaseStatus = (courseId, { skip = false } = {}) => {
  const { data } = purchaseApi.endpoints.getCourseDetailWithStatus.useQueryState(courseId, { skip });
  return useGetCourseDetailWithStatusQuery(courseId, {
    skip,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    pollingInterval: data?.pendingManualOrder ? 15000 : 0,
    skipPollingIfUnfocused: true,
  });
};
