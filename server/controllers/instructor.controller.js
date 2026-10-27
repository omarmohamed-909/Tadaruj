import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import { readCoursePagination, readPublicCoursePage } from "../utils/courseListing.js";

const publicFields = "name photoUrl instructorBio instructorSubjects";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const listPublicInstructors = async (req, res) => {
  try {
    const rawPage = req.query?.page ?? "1";
    const rawLimit = req.query?.limit ?? "12";
    const search = req.query?.q ?? "";
    const subject = req.query?.subject ?? "";
    if (![rawPage, rawLimit, search, subject].every((value) => typeof value === "string") ||
        !/^\d+$/.test(rawPage) || !/^\d+$/.test(rawLimit) || search.length > 100 || subject.length > 60) {
      return res.status(400).json({ message: "Invalid instructor filters." });
    }

    const page = Math.max(1, Math.min(Number(rawPage), 100000));
    const limit = Math.max(1, Math.min(Number(rawLimit), 24));
    const criteria = { role: "instructor", status: "active" };
    if (search.trim()) {
      const pattern = new RegExp(escapeRegex(search.trim()), "i");
      criteria.$or = [{ name: pattern }, { instructorSubjects: pattern }];
    }
    if (subject.trim()) criteria.instructorSubjects = subject.trim();

    const [instructors, total, allSubjects] = await Promise.all([
      User.find(criteria)
      .select(publicFields)
      .sort({ name: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
      User.countDocuments(criteria),
      User.distinct("instructorSubjects", { role: "instructor", status: "active" }),
    ]);

    const courseCounts = instructors.length
      ? await Course.aggregate([
          { $match: { isPublished: true, creator: { $in: instructors.map((item) => item._id) } } },
          { $group: { _id: "$creator", courseCount: { $sum: 1 } } },
        ])
      : [];
    const countById = new Map(courseCounts.map((item) => [String(item._id), item.courseCount]));

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      subjects: allSubjects.filter((item) => typeof item === "string" && item.trim()).sort((a, b) => a.localeCompare(b)),
      instructors: instructors.map((item) => ({
        _id: item._id,
        name: item.name,
        photoUrl: item.photoUrl || "",
        instructorBio: item.instructorBio || "",
        instructorSubjects: item.instructorSubjects || [],
        courseCount: countById.get(String(item._id)) || 0,
      })),
    });
  } catch (error) {
    console.error("Failed to load instructors:", error);
    return res.status(500).json({ message: "Could not load instructors." });
  }
};

export const getPublicInstructor = async (req, res) => {
  try {
    const pagination = readCoursePagination(req.query);
    if (!pagination) return res.status(400).json({ message: "Invalid course pagination." });
    const { instructorId } = req.params;
    if (!mongoose.isValidObjectId(instructorId)) {
      return res.status(404).json({ message: "Instructor not found." });
    }
    const instructor = await User.findOne({ _id: instructorId, role: "instructor", status: "active" })
      .select(publicFields)
      .lean();
    if (!instructor) {
      return res.status(404).json({ message: "Instructor not found." });
    }

    const result = await readPublicCoursePage({ creator: instructor._id, isPublished: true }, pagination);

    return res.status(200).json({
      instructor: {
        _id: instructor._id,
        name: instructor.name,
        photoUrl: instructor.photoUrl || "",
        instructorBio: instructor.instructorBio || "",
        instructorSubjects: instructor.instructorSubjects || [],
        courseCount: result.total,
      },
      ...result,
      courses: result.courses.map((course) => ({
        ...course,
        creator: { _id: instructor._id, name: instructor.name, photoUrl: instructor.photoUrl || "" },
      })),
    });
  } catch (error) {
    console.error("Failed to load instructor profile:", error);
    return res.status(500).json({ message: "Could not load instructor profile." });
  }
};
