import crypto from "node:crypto";
import mongoose from "mongoose";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { User } from "../models/user.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { Notification } from "../models/notification.model.js";

const referenceOf = (order) => order.paymentId.replace(/^manual-/, "").slice(0, 12).toUpperCase();

export const requestManualOrder = async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!mongoose.isValidObjectId(courseId)) return res.status(400).json({ message: "Invalid course." });
    const course = await Course.findById(courseId).select("courseTitle coursePrice creator isPublished");
    if (!course?.isPublished) return res.status(404).json({ message: "Course not found." });
    if (!(Number(course.coursePrice) > 0)) return res.status(400).json({ message: "This course is free." });
    if (String(course.creator) === String(req.id)) return res.status(400).json({ message: "You own this course." });
    const instructor = await User.findById(course.creator).select("name role status instructorWhatsapp");
    if (instructor?.role !== "instructor" || instructor.status === "suspended" || !/^\+[1-9]\d{7,14}$/.test(instructor.instructorWhatsapp || "")) {
      return res.status(409).json({ message: "This instructor has not enabled WhatsApp orders yet." });
    }
    const alreadyEnrolled = req.user?.enrolledCourses?.some((id) => String(id) === String(courseId));
    const completed = await CoursePurchase.exists({ courseId, userId: req.id, status: "completed" });
    if (alreadyEnrolled || completed) return res.status(409).json({ message: "You already have access to this course." });

    let order = await CoursePurchase.findOne({ courseId, userId: req.id, paymentMethod: "manual", status: "pending" });
    if (!order) {
      try {
        order = await CoursePurchase.create({
          courseId, userId: req.id, instructorId: instructor._id,
          amount: course.coursePrice, status: "pending", paymentMethod: "manual",
          paymentId: `manual-${crypto.randomUUID()}`,
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        order = await CoursePurchase.findOne({ courseId, userId: req.id, paymentMethod: "manual", status: "pending" });
        if (!order) throw error;
      }
    }
    const reference = referenceOf(order);
    const message = `السلام عليكم، أريد الاشتراك في كورس ${course.courseTitle}.\nرقم الطلب: ${reference}\nالاسم: ${req.user.name}\nالسعر: ${order.amount} جنيه.\nأرجو إرسال طريقة الدفع.`;
    const whatsappUrl = `https://wa.me/${instructor.instructorWhatsapp.slice(1)}?text=${encodeURIComponent(message)}`;
    return res.json({ order: { _id: order._id, reference, status: order.status, amount: order.amount }, whatsappUrl });
  } catch (error) {
    console.error("Failed to create manual order:", error);
    return res.status(500).json({ message: "Could not create the order." });
  }
};

export const listManualOrders = async (req, res) => {
  try {
    if (!["instructor", "admin"].includes(req.user.role)) return res.status(403).json({ message: "Forbidden." });
    const rawPage = req.query?.page ?? "1";
    const rawLimit = req.query?.limit ?? "20";
    const status = req.query?.status ?? "";
    if (![rawPage, rawLimit, status].every((value) => typeof value === "string") || !/^\d+$/.test(rawPage) || !/^\d+$/.test(rawLimit) || !["", "pending", "completed", "failed"].includes(status)) {
      return res.status(400).json({ message: "Invalid order filters." });
    }
    const page = Math.max(1, Math.min(Number(rawPage), 100000));
    const limit = Math.max(1, Math.min(Number(rawLimit), 50));
    const filter = { paymentMethod: "manual" };
    if (req.user.role === "instructor") filter.instructorId = req.id;
    if (status) filter.status = status;
    const [orders, total] = await Promise.all([
      CoursePurchase.find(filter)
      .select("courseId userId instructorId amount status paymentId createdAt reviewedAt")
      .populate("courseId", "courseTitle")
      .populate("userId", "name email")
      .populate("instructorId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
      CoursePurchase.countDocuments(filter),
    ]);
    return res.json({ page, limit, total, totalPages: Math.ceil(total / limit), orders: orders.map((order) => ({
      _id: order._id, course: order.courseId, student: order.userId, instructor: order.instructorId,
      amount: order.amount, status: order.status, reference: referenceOf(order),
      createdAt: order.createdAt, reviewedAt: order.reviewedAt,
    })) });
  } catch (error) {
    console.error("Failed to load manual orders:", error);
    return res.status(500).json({ message: "Could not load orders." });
  }
};

export const reviewManualOrder = async (req, res) => {
  let session;
  try {
    if (req.user.role !== "instructor") return res.status(403).json({ message: "Only the course instructor can confirm payment." });
    const { orderId } = req.params;
    const { decision } = req.body;
    if (!mongoose.isValidObjectId(orderId) || !["approve", "reject"].includes(decision)) {
      return res.status(400).json({ message: "Invalid order or decision." });
    }
    const existing = await CoursePurchase.findOne({ _id: orderId, instructorId: req.id, paymentMethod: "manual" });
    if (!existing) return res.status(404).json({ message: "Order not found." });
    if (existing.status === "failed") return res.status(409).json({ message: "This order was rejected." });
    if (existing.status === "completed" && decision === "reject") return res.status(409).json({ message: "Approved orders cannot be rejected." });
    if (existing.status === "completed") return res.json({ message: "Payment confirmed. Course access granted.", status: "completed" });

    session = await mongoose.startSession();
    let order;
    let courseTitle;
    await session.withTransaction(async () => {
      const current = await CoursePurchase.findOne({ _id: orderId, instructorId: req.id, paymentMethod: "manual", status: "pending" }).session(session);
      if (!current) throw Object.assign(new Error("Order was already reviewed."), { statusCode: 409 });
      const course = await Course.findById(current.courseId).select("creator isPublished courseTitle").session(session);
      // Order ownership remains mandatory for both decisions, even after unpublishing.
      if (course && String(course.creator) !== String(req.id)) {
        throw Object.assign(new Error("This course is no longer owned by you."), { statusCode: 409 });
      }
      courseTitle = course?.courseTitle || "the course";
      if (decision === "approve") {
        const student = await User.findById(current.userId).select("status").session(session);
        if (!course?.isPublished || !student || student.status === "suspended") {
          throw Object.assign(new Error("This course or student is no longer eligible."), { statusCode: 409 });
        }
        await User.findByIdAndUpdate(current.userId, { $addToSet: { enrolledCourses: current.courseId } }, { session });
        await Course.findByIdAndUpdate(current.courseId, { $addToSet: { enrolledStudents: current.userId } }, { session });
      }
      order = await CoursePurchase.findOneAndUpdate(
        { _id: orderId, instructorId: req.id, paymentMethod: "manual", status: "pending" },
        { $set: { status: decision === "approve" ? "completed" : "failed", reviewedBy: req.id, reviewedAt: new Date() } },
        { new: true, session }
      );
      if (!order) throw Object.assign(new Error("Order was already reviewed."), { statusCode: 409 });
    });
    await Notification.create({
      userId: order.userId,
      message: order.status === "completed"
        ? `Your payment for ${courseTitle} was confirmed. Course access is now available.`
        : `Your order for ${courseTitle} was rejected by the instructor.`,
      type: order.status === "completed" ? "manual-order-approved" : "manual-order-rejected",
      link: `/course-detail/${order.courseId}`,
    }).catch((notificationError) => console.error("Manual order notification failed:", notificationError));
    await AuditLog.create({ actor: req.id, action: decision === "approve" ? "manual_order.approved" : "manual_order.rejected", targetType: "CoursePurchase", targetId: String(orderId), metadata: { courseId: String(order.courseId), studentId: String(order.userId), amount: order.amount }, ip: req.ip }).catch((error) => console.error("Audit logging failed:", error));
    return res.json({ message: order.status === "completed" ? "Payment confirmed. Course access granted." : "Order rejected.", status: order.status });
  } catch (error) {
    console.error("Failed to review manual order:", error);
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : "Could not review the order." });
  } finally {
    await session?.endSession();
  }
};
