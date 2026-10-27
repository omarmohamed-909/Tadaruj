import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/course.model.js", () => ({
    Course: { findById: vi.fn(), findOne: vi.fn() },
}));

import { Course } from "../models/course.model.js";
import requireCourseManager from "../middlewares/requireCourseManager.js";

const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() });
const course = { creator: { toString: () => "owner" }, lectures: [{ toString: () => "lecture" }] };

beforeEach(() => vi.resetAllMocks());

describe("requireCourseManager", () => {
    it("rejects students before reading a course", async () => {
        const res = response();
        const next = vi.fn();
        await requireCourseManager({ user: { role: "student" }, params: { courseId: "c1" } }, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(Course.findById).not.toHaveBeenCalled();
    });

    it("rejects instructors who do not own the course", async () => {
        Course.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(course) });
        const res = response();
        const next = vi.fn();
        await requireCourseManager({ user: { role: "instructor" }, id: "other", params: { courseId: "c1" } }, res, next);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it("allows the owner and platform admin", async () => {
        Course.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(course) });
        for (const [role, id] of [["instructor", "owner"], ["admin", "admin"]]) {
            const res = response();
            const next = vi.fn();
            await requireCourseManager({ user: { role }, id, params: { courseId: "c1" } }, res, next);
            expect(next).toHaveBeenCalledOnce();
            expect(res.status).not.toHaveBeenCalled();
        }
    });

    it("rejects a lecture that is not part of the course", async () => {
        Course.findById.mockReturnValue({ select: vi.fn().mockResolvedValue(course) });
        const res = response();
        const next = vi.fn();
        await requireCourseManager({ user: { role: "admin" }, id: "admin", params: { courseId: "c1", lectureId: "different" } }, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(next).not.toHaveBeenCalled();
    });
});
