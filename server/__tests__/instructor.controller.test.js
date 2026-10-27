import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../models/user.model.js", () => ({ User: { find: vi.fn(), findOne: vi.fn(), countDocuments: vi.fn(), distinct: vi.fn() } }));
vi.mock("../models/course.model.js", () => ({ Course: { aggregate: vi.fn(), find: vi.fn(), countDocuments: vi.fn() } }));

import { User } from "../models/user.model.js";
import { Course } from "../models/course.model.js";
import { getPublicInstructor, listPublicInstructors } from "../controllers/instructor.controller.js";

const instructorId = "507f1f77bcf86cd799439011";
const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() });

beforeEach(() => {
  vi.clearAllMocks();
  User.countDocuments.mockResolvedValue(1);
  User.distinct.mockResolvedValue(["Science"]);
  Course.countDocuments.mockResolvedValue(1);
});

const mockInstructorPage = (instructors) => {
  const cursor = {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(instructors),
  };
  User.find.mockReturnValue(cursor);
  return cursor;
};

describe("public instructors", () => {
  it("lists active instructors even without courses and excludes private fields", async () => {
    const instructor = { _id: instructorId, name: "Amal", email: "private@example.com", instructorBio: "Science teacher", instructorSubjects: ["Science"] };
    mockInstructorPage([instructor]);
    Course.aggregate.mockResolvedValue([]);
    const res = makeRes();

    await listPublicInstructors({}, res);

    expect(User.find).toHaveBeenCalledWith({ role: "instructor", status: "active" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].instructors[0]).toMatchObject({ name: "Amal", courseCount: 0 });
    expect(res.json.mock.calls[0][0].instructors[0].email).toBeUndefined();
  });

  it("paginates filtered instructors and treats search text literally", async () => {
    const cursor = mockInstructorPage([{ _id: instructorId, name: "Science.* teacher" }]);
    User.countDocuments.mockResolvedValue(13);
    Course.aggregate.mockResolvedValue([]);
    const res = makeRes();

    await listPublicInstructors({ query: { page: "2", limit: "6", q: "Science.*", subject: "Science" } }, res);

    expect(cursor.skip).toHaveBeenCalledWith(6);
    expect(cursor.limit).toHaveBeenCalledWith(6);
    const criteria = User.find.mock.calls[0][0];
    expect(criteria.instructorSubjects).toBe("Science");
    expect(criteria.$or[0].name.test("Science.* teacher")).toBe(true);
    expect(criteria.$or[0].name.test("Scienceabc teacher")).toBe(false);
    expect(res.json.mock.calls[0][0]).toMatchObject({ page: 2, limit: 6, total: 13, totalPages: 3, subjects: ["Science"] });
  });

  it("rejects malformed or excessive public filters", async () => {
    const res = makeRes();
    await listPublicInstructors({ query: { limit: "all" } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.find).not.toHaveBeenCalled();
  });

  it("returns only published courses on a public profile", async () => {
    const instructor = { _id: instructorId, name: "Amal", email: "private@example.com", instructorSubjects: ["Science"] };
    User.findOne.mockReturnValue({ select: () => ({ lean: async () => instructor }) });
    const cursor = { select: vi.fn().mockReturnThis(), populate: vi.fn().mockReturnThis(), sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([{ _id: "c1", courseTitle: "Biology" }]) };
    Course.find.mockReturnValue(cursor);
    const res = makeRes();

    await getPublicInstructor({ params: { instructorId } }, res);

    expect(Course.find).toHaveBeenCalledWith({ creator: instructorId, isPublished: true });
    const body = res.json.mock.calls[0][0];
    expect(body.instructor.email).toBeUndefined();
    expect(body.instructor.courseCount).toBe(1);
    expect(body.courses[0].creator.name).toBe("Amal");
  });

  it("does not expose invalid or unavailable instructor profiles", async () => {
    const invalid = makeRes();
    await getPublicInstructor({ params: { instructorId: "invalid" } }, invalid);
    expect(invalid.status).toHaveBeenCalledWith(404);
    expect(User.findOne).not.toHaveBeenCalled();

    User.findOne.mockReturnValue({ select: () => ({ lean: async () => null }) });
    const missing = makeRes();
    await getPublicInstructor({ params: { instructorId } }, missing);
    expect(missing.status).toHaveBeenCalledWith(404);
  });
});
