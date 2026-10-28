import mongoose from "mongoose";
import { Course } from "../models/course.model.js";
import { User } from "../models/user.model.js";
import { escapeRegex } from "./courseTaxonomy.js";

export function readAdminCourseFilters(query = {}) {
    const { page = "1", limit = "12", q = "", status = "all", access = "all", userId = "" } = query;
    if (![page, limit].every(value => typeof value === "string" && /^[1-9]\d{0,5}$/.test(value)) ||
        typeof q !== "string" || q.length > 100 ||
        !["all", "published", "draft"].includes(status) ||
        !["all", "granted", "available"].includes(access) ||
        typeof userId !== "string" || !/^[a-f0-9]{24}$/i.test(userId)) return null;
    return { page: Math.min(Number(page), 100000), limit: Math.min(Number(limit), 24), q: q.trim(), status, access, userId };
}

export async function readAdminCoursePage(options) {
    let enrolledIds = [];
    if (options.userId) {
        const user = await User.findById(options.userId).select("enrolledCourses").lean();
        if (!user) return null;
        enrolledIds = (user.enrolledCourses || []).filter(id => mongoose.isValidObjectId(id)).map(id => new mongoose.Types.ObjectId(String(id)));
    }
    const filter = {};
    if (options.status !== "all") filter.isPublished = options.status === "published" ? true : { $ne: true };
    if (options.access !== "all") filter._id = { [options.access === "granted" ? "$in" : "$nin"]: enrolledIds };
    const creatorLookup = { $lookup: { from: User.collection.name, localField: "creator", foreignField: "_id", pipeline: [{ $project: { name: 1 } }], as: "creatorInfo" } };
    const search = options.q ? [creatorLookup, { $match: { $or: [{ courseTitle: new RegExp(escapeRegex(options.q), "i") }, { "creatorInfo.name": new RegExp(escapeRegex(options.q), "i") }] } }] : [];
    const base = [{ $match: filter }, ...search];
    const [counts, grantedTotal] = await Promise.all([
        Course.aggregate([...base, { $count: "total" }]),
        options.userId ? Course.countDocuments({ _id: { $in: enrolledIds } }) : 0,
    ]);
    const total = counts[0]?.total || 0;
    const totalPages = Math.ceil(total / options.limit);
    const page = Math.min(options.page, Math.max(1, totalPages));
    const courses = await Course.aggregate([
        ...base,
        { $set: { hasDirectAccess: { $in: ["$_id", enrolledIds] } } },
        { $sort: { hasDirectAccess: -1, createdAt: -1, _id: -1 } },
        { $skip: (page - 1) * options.limit }, { $limit: options.limit },
        ...(!options.q ? [creatorLookup] : []),
        { $project: { courseTitle: 1, isPublished: { $eq: ["$isPublished", true] }, hasDirectAccess: 1, creator: { $arrayElemAt: ["$creatorInfo", 0] } } },
    ]);
    return { courses, page, limit: options.limit, total, totalPages, grantedTotal };
}
