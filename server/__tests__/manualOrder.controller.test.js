import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";

vi.mock("../models/course.model.js", () => ({ Course: { findById: vi.fn(), findByIdAndUpdate: vi.fn() } }));
vi.mock("../models/user.model.js", () => ({ User: { findById: vi.fn(), findByIdAndUpdate: vi.fn() } }));
vi.mock("../models/coursePurchase.model.js", () => ({ CoursePurchase: { exists: vi.fn(), findOne: vi.fn(), find: vi.fn(), create: vi.fn(), findOneAndUpdate: vi.fn(), countDocuments: vi.fn() } }));
vi.mock("../models/auditLog.model.js", () => ({ AuditLog: { create: vi.fn() } }));
vi.mock("../models/notification.model.js", () => ({ Notification: { create: vi.fn() } }));

import { Course } from "../models/course.model.js";
import { User } from "../models/user.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { AuditLog } from "../models/auditLog.model.js";
import { Notification } from "../models/notification.model.js";
import { listManualOrders, requestManualOrder, reviewManualOrder } from "../controllers/manualOrder.controller.js";

const courseId = "507f1f77bcf86cd799439011";
const instructorId = "507f1f77bcf86cd799439012";
const studentId = "507f1f77bcf86cd799439013";
const orderId = "507f1f77bcf86cd799439014";
const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() });
const selected = (value) => ({ select: vi.fn().mockResolvedValue(value) });
const transactional = (value) => ({ session: vi.fn().mockResolvedValue(value) });
const session = { withTransaction: vi.fn(async (callback) => callback()), endSession: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  Course.findById.mockReturnValue(selected({ _id: courseId, courseTitle: "Physics", coursePrice: 250, creator: instructorId, isPublished: true }));
  User.findById.mockReturnValue(selected({ _id: instructorId, name: "Teacher", role: "instructor", status: "active", instructorWhatsapp: "+201001234567" }));
  CoursePurchase.exists.mockResolvedValue(false);
  CoursePurchase.findOne.mockResolvedValue(null);
  CoursePurchase.countDocuments.mockResolvedValue(0);
  Notification.create.mockResolvedValue({});
  vi.spyOn(mongoose, "startSession").mockResolvedValue(session);
});

describe("manual course orders", () => {
  it("paginates instructor orders and filters by status", async () => {
    const orders = [];
    const query = {
      select: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(orders),
    };
    CoursePurchase.find.mockReturnValue(query);
    CoursePurchase.countDocuments.mockResolvedValue(21);
    const res = response();
    await listManualOrders({ id: instructorId, user: { role: "instructor" }, query: { page: "2", limit: "10", status: "pending" } }, res);
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(CoursePurchase.find).toHaveBeenCalledWith({ paymentMethod: "manual", instructorId, status: "pending" });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 10, total: 21, totalPages: 3, orders: [] }));
  });

  it("records an order and directs the student to the course instructor", async () => {
    CoursePurchase.create.mockImplementation(async (data) => ({ ...data, _id: orderId }));
    const res = response();
    await requestManualOrder({ id: studentId, user: { name: "Student", enrolledCourses: [] }, body: { courseId } }, res);

    expect(CoursePurchase.create).toHaveBeenCalledWith(expect.objectContaining({ instructorId, paymentMethod: "manual", amount: 250, status: "pending" }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ whatsappUrl: expect.stringContaining("https://wa.me/201001234567?text=") }));
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("refuses a paid order when the instructor has no WhatsApp number", async () => {
    User.findById.mockReturnValue(selected({ role: "instructor", status: "active", instructorWhatsapp: "" }));
    const res = response();
    await requestManualOrder({ id: studentId, user: { name: "Student" }, body: { courseId } }, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(CoursePurchase.create).not.toHaveBeenCalled();
  });

  it("allows only the owner to approve, then grants access", async () => {
    const order = { _id: orderId, courseId, userId: studentId, instructorId, paymentMethod: "manual", status: "pending", amount: 250 };
    CoursePurchase.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(order).mockReturnValueOnce(transactional(order));
    const strangerResponse = response();
    await reviewManualOrder({ id: studentId, user: { role: "instructor" }, params: { orderId }, body: { decision: "approve" } }, strangerResponse);
    expect(strangerResponse.status).toHaveBeenCalledWith(404);

    Course.findById.mockReturnValue({ select: () => transactional({ creator: instructorId, isPublished: true }) });
    User.findById.mockReturnValue({ select: () => transactional({ status: "active" }) });
    CoursePurchase.findOneAndUpdate.mockResolvedValue({ ...order, status: "completed" });
    User.findByIdAndUpdate.mockResolvedValue({});
    Course.findByIdAndUpdate.mockResolvedValue({});
    AuditLog.create.mockResolvedValue({});
    const res = response();
    await reviewManualOrder({ id: instructorId, user: { role: "instructor" }, params: { orderId }, body: { decision: "approve" } }, res);
    expect(CoursePurchase.findOneAndUpdate).toHaveBeenCalledWith(expect.objectContaining({ instructorId, status: "pending" }), expect.objectContaining({ $set: expect.objectContaining({ status: "completed" }) }), { new: true, session });
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(studentId, { $addToSet: { enrolledCourses: courseId } }, { session });
    expect(Course.findByIdAndUpdate).toHaveBeenCalledWith(courseId, { $addToSet: { enrolledStudents: studentId } }, { session });
    expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ userId: studentId, type: "manual-order-approved" }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "completed" }));
  });

  it("does not let an admin confirm funds held by an instructor", async () => {
    const res = response();
    await reviewManualOrder({ id: studentId, user: { role: "admin" }, params: { orderId }, body: { decision: "approve" } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(CoursePurchase.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects a pending order without granting course access", async () => {
    const order = { _id: orderId, courseId, userId: studentId, instructorId, paymentMethod: "manual", status: "pending", amount: 250 };
    CoursePurchase.findOne.mockResolvedValueOnce(order).mockReturnValueOnce(transactional(order));
    Course.findById.mockReturnValue({ select: () => transactional({ creator: instructorId, isPublished: true }) });
    User.findById.mockReturnValue({ select: () => transactional({ status: "active" }) });
    CoursePurchase.findOneAndUpdate.mockResolvedValue({ ...order, status: "failed" });
    AuditLog.create.mockResolvedValue({});
    const res = response();
    await reviewManualOrder({ id: instructorId, user: { role: "instructor" }, params: { orderId }, body: { decision: "reject" } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: "failed" }));
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(Course.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("does not confirm the order when granting course access fails", async () => {
    const order = { _id: orderId, courseId, userId: studentId, instructorId, paymentMethod: "manual", status: "pending", amount: 250 };
    CoursePurchase.findOne.mockResolvedValueOnce(order).mockReturnValueOnce(transactional(order));
    Course.findById.mockReturnValue({ select: () => transactional({ creator: instructorId, isPublished: true, courseTitle: "Physics" }) });
    User.findById.mockReturnValue({ select: () => transactional({ status: "active" }) });
    User.findByIdAndUpdate.mockRejectedValue(new Error("Database write failed"));
    const res = response();

    await reviewManualOrder({ id: instructorId, user: { role: "instructor" }, params: { orderId }, body: { decision: "approve" } }, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(CoursePurchase.findOneAndUpdate).not.toHaveBeenCalled();
    expect(Notification.create).not.toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
  });
});
