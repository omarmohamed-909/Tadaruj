import { Course } from "../models/course.model.js";

export const PUBLIC_COURSE_FIELDS = "courseTitle subTitle courseThumbnail coursePrice subject gradeLevel category courseLevel creator createdAt updatedAt";

export function readCoursePagination(query = {}) {
  const { page = "1", limit = "12" } = query;
  if (![page, limit].every((value) => typeof value === "string" && /^[1-9]\d{0,5}$/.test(value))) return null;
  return { page: Math.min(Number(page), 100000), limit: Math.min(Number(limit), 24) };
}

export async function readPublicCoursePage(criteria, pagination, sort = { createdAt: -1, _id: -1 }) {
  const total = await Course.countDocuments(criteria);
  const totalPages = Math.ceil(total / pagination.limit);
  const page = Math.min(pagination.page, Math.max(1, totalPages));
  const courses = await Course.find(criteria)
    .select(PUBLIC_COURSE_FIELDS)
    .populate({ path: "creator", select: "name photoUrl" })
    .sort(sort)
    .skip((page - 1) * pagination.limit)
    .limit(pagination.limit)
    .lean();
  return { courses, page, limit: pagination.limit, total, totalPages };
}
