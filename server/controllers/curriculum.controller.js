import { Course } from "../models/course.model.js";
import { validateCurriculum } from "../utils/curriculum.js";
import { reportError } from "../utils/logger.js";

// Router requires the course owner or an administrator before reaching this handler.
export async function updateCurriculum(req, res) {
  try {
    const course = await Course.findById(req.params.courseId).select("creator lectures units __v").lean();
    if (!course) return res.status(404).json({ message: "Course not found." });
    if (req.user?.role !== "admin" && (req.user?.role !== "instructor" || String(course.creator) !== req.id)) return res.status(403).json({ message: "You can only manage your own courses." });
    if (req.body?.revision !== course.__v) return res.status(409).json({ message: "Course content changed. Reload it before saving your structure." });
    const curriculum = validateCurriculum(req.body, course.lectures);
    if (!curriculum) return res.status(400).json({ message: "Use valid unit names and include every course lesson exactly once." });
    const saved = await Course.findOneAndUpdate({ _id: course._id, __v: req.body.revision }, { $set: curriculum, $inc: { __v: 1 } }, { new: true, runValidators: true }).select("units lectures __v");
    if (!saved) return res.status(409).json({ message: "Course content changed. Reload it before saving your structure." });
    return res.status(200).json({ units: saved.units, revision: saved.__v, message: "Course structure saved." });
  } catch (error) {
    reportError("course.curriculum.failed", error);
    return res.status(500).json({ message: "Could not save the course structure." });
  }
}
