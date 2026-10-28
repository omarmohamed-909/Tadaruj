import { vi, describe, it, expect, beforeEach } from "vitest";
vi.mock("../utils/directUploads.js", () => ({ verifyDirectUpload: vi.fn() }));
import { verifyDirectUpload } from "../utils/directUploads.js";

vi.mock("../models/course.model.js", () => ({
    Course: {
        create: vi.fn(),
        find: vi.fn(),
        findById: vi.fn(),
        findByIdAndDelete: vi.fn(),
        findByIdAndUpdate: vi.fn(),
        updateOne: vi.fn(),
        countDocuments: vi.fn(),
        distinct: vi.fn(),
    },
}));

vi.mock("../models/lecture.model.js", () => ({
    Lecture: {
        create: vi.fn(),
        findById: vi.fn(),
        findByIdAndDelete: vi.fn(),
        deleteMany: vi.fn(),
    },
}));

vi.mock("../models/coursePurchase.model.js", () => ({
    CoursePurchase: {
        findOne: vi.fn(),
        deleteMany: vi.fn(),
        exists: vi.fn(),
    },
}));

vi.mock("../models/user.model.js", () => ({
    User: {
        findById: vi.fn(),
        updateMany: vi.fn(),
    },
}));

vi.mock("../models/courseProgress.js", () => ({
    CourseProgress: {
        deleteMany: vi.fn(),
    },
}));

vi.mock("../models/lectureComment.model.js", () => ({
    LectureComment: {
        deleteMany: vi.fn(),
    },
}));

vi.mock("../models/notification.model.js", () => ({
    Notification: {
        deleteMany: vi.fn(),
    },
}));

vi.mock("../models/quizResult.model.js", () => ({
    QuizResult: {
        deleteMany: vi.fn(),
    },
}));

vi.mock("../models/auditLog.model.js", () => ({
    AuditLog: { create: vi.fn().mockResolvedValue({}) },
}));

vi.mock("../utils/cloudinary.js", () => ({
    uploadMedia: vi.fn(),
    deleteMediaFromCloudinary: vi.fn(),
    deleteVideoFromCloudinary: vi.fn(),
    extractPublicIdFromUrl: vi.fn(),
    getProtectedMediaUrl: vi.fn((url) => url),
}));

import { Course } from "../models/course.model.js";
import { CourseProgress } from "../models/courseProgress.js";
import { Lecture } from "../models/lecture.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { LectureComment } from "../models/lectureComment.model.js";
import { Notification } from "../models/notification.model.js";
import { QuizResult } from "../models/quizResult.model.js";
import { User } from "../models/user.model.js";
import {
    deleteMediaFromCloudinary,
    deleteVideoFromCloudinary,
    extractPublicIdFromUrl,
    getProtectedMediaUrl,
    uploadMedia,
} from "../utils/cloudinary.js";
import {
    createCourse,
    editCourse,
    deleteCourse,
    searchCourse,
    getPublishedCourse,
    getCourseFilters,
    getCreatorCourses,
    getCourseById,
    getPublicCourseById,
    createLecture,
    editLecture,
    removeLecture,
    getLectureById,
    togglePublishCourse,
    reorderLecture,
    updateLectureQuiz,
    getCourseLecture,
} from "../controllers/course.controller.js";

beforeEach(() => {
    vi.clearAllMocks();
    CoursePurchase.exists.mockResolvedValue(null);
    Course.countDocuments.mockResolvedValue(0);
});

const mockCoursePage = (courses = []) => {
    const cursor = {
        select: vi.fn().mockReturnThis(), populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(), skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(courses),
    };
    Course.find.mockReturnValue(cursor);
    Course.countDocuments.mockResolvedValue(courses.length);
    return cursor;
};

const makeReq = (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    id: "user1",
    user: { role: "instructor" },
    file: null,
    ...overrides,
});

const makeRes = () => ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
});

// ─── createCourse ─────────────────────────────────────────────────────────────

describe("createCourse", () => {
    it("returns 400 when subject is missing", async () => {
        const req = makeReq({ body: { courseTitle: "Math" } });
        const res = makeRes();

        await createCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Course title and subject are required." })
        );
    });

    it("creates a course and returns 201", async () => {
        const fakeCourse = { _id: "c1", courseTitle: "Math 101", category: "Mathematics" };
        const req = makeReq({ body: { courseTitle: "Math 101", category: "Mathematics" } });
        const res = makeRes();
        Course.create.mockResolvedValue(fakeCourse);

        await createCourse(req, res);

        expect(Course.create).toHaveBeenCalledWith({
            courseTitle: "Math 101",
            category: "Mathematics",
            subject: "Mathematics",
            gradeLevel: "",
            creator: "user1",
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ course: fakeCourse })
        );
    });

    it("stores subject and stage separately", async () => {
        const req = makeReq({ body: { courseTitle: "World History", subject: "History", gradeLevel: "Secondary 2" } });
        const res = makeRes();
        Course.create.mockResolvedValue({ _id: "c2" });
        await createCourse(req, res);
        expect(Course.create).toHaveBeenCalledWith({
            courseTitle: "World History", category: "", subject: "History", gradeLevel: "Secondary 2", creator: "user1",
        });
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("does not mistake an old grade category for a subject", async () => {
        const res = makeRes();
        await createCourse(makeReq({ body: { courseTitle: "Old course", category: "Grade 4" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

// ─── searchCourse ─────────────────────────────────────────────────────────────

describe("searchCourse", () => {
    it("returns matching published courses", async () => {
        const fakeCourses = [{ _id: "c1", courseTitle: "Algebra" }];
        const req = makeReq({ query: { query: "Algebra", categories: [], sortByPrice: "" } });
        const res = makeRes();
        mockCoursePage(fakeCourses);

        await searchCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, courses: fakeCourses })
        );
    });

    it("handles undefined query safely", async () => {
        const req = makeReq({ query: { query: "undefined" } });
        const res = makeRes();
        mockCoursePage();

        await searchCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        // 'undefined' query should be treated as empty string
        const findArg = Course.find.mock.calls[0][0];
        expect(findArg.$or).toBeUndefined();
    });

    it("sorts by price ascending when sortByPrice=low", async () => {
        const req = makeReq({ query: { query: "", sortByPrice: "low" } });
        const res = makeRes();
        const { sort: sortMock } = mockCoursePage();

        await searchCourse(req, res);

        expect(sortMock).toHaveBeenCalledWith({ coursePrice: 1, _id: 1 });
    });

    it("sorts by price descending when sortByPrice=high", async () => {
        const req = makeReq({ query: { query: "", sortByPrice: "high" } });
        const res = makeRes();
        const { sort: sortMock } = mockCoursePage();

        await searchCourse(req, res);

        expect(sortMock).toHaveBeenCalledWith({ coursePrice: -1, _id: -1 });
    });

    it("filters subjects and stages independently, including legacy categories", async () => {
        const req = makeReq({ query: { subjects: "History", grades: "Grade 4" } });
        const res = makeRes();
        mockCoursePage();

        await searchCourse(req, res);

        const criteria = Course.find.mock.calls[0][0];
        expect(criteria.isPublished).toBe(true);
        expect(criteria.$and).toHaveLength(2);
        expect(criteria.$and[0].$or[0].subject.$in[0].test("History")).toBe(true);
        expect(criteria.$and[1].$or[0].gradeLevel.$in[0].test("Grade 4")).toBe(true);
        expect(criteria.$and[0].$or[2].category.$in[0].test("History")).toBe(true);
    });

    it("treats search text as text, not regex syntax", async () => {
        const req = makeReq({ query: { query: ".*" } });
        const res = makeRes();
        mockCoursePage();
        await searchCourse(req, res);
        expect(Course.find.mock.calls[0][0].$or[0].courseTitle.$regex).toBe("\\.\\*");
    });
});

// ─── getPublishedCourse ───────────────────────────────────────────────────────

describe("getPublishedCourse", () => {
    it("returns a lightweight public page without loading lectures or enrollments", async () => {
        const cursor = mockCoursePage([{ _id: "c1", courseTitle: "Science" }]);
        const res = makeRes();
        await getPublishedCourse({}, res);
        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body).toMatchObject({ page: 1, limit: 12, total: 1, totalPages: 1 });
        expect(cursor.select.mock.calls[0][0]).not.toMatch(/lectures|enrolledStudents|description/);
        expect(cursor.populate).toHaveBeenCalledWith({ path: "creator", select: "name photoUrl" });
        expect(cursor.populate).toHaveBeenCalledTimes(1);
    });
    it("bounds page size, clamps obsolete page links, and uses a stable sort", async () => {
        const cursor = mockCoursePage();
        Course.countDocuments.mockResolvedValue(25);
        const res = makeRes();
        await getPublishedCourse(makeReq({ query: { page: "999", limit: "10" } }), res);
        expect(cursor.skip).toHaveBeenCalledWith(20);
        expect(cursor.limit).toHaveBeenCalledWith(10);
        expect(cursor.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
        expect(res.json.mock.calls[0][0]).toMatchObject({ page: 3, total: 25, totalPages: 3 });
        await getPublishedCourse(makeReq({ query: { limit: "999" } }), makeRes());
        expect(cursor.limit).toHaveBeenLastCalledWith(24);
    });
    it.each([{ page: ["1", "2"] }, { page: "-1" }, { page: "0" }, { limit: "all" }])("rejects malformed pagination: %j", async (query) => {
        const res = makeRes();
        await getPublishedCourse(makeReq({ query }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(Course.find).not.toHaveBeenCalled();
    });
});

describe("public course filter choices", () => {
    it("includes legacy subjects and stages without returning course records", async () => {
        Course.distinct.mockResolvedValueOnce(["Science", ""])
            .mockResolvedValueOnce(["University"])
            .mockResolvedValueOnce(["History", "Grade 3"])
            .mockResolvedValueOnce(["Grade 3", "Science"]);
        const res = makeRes();
        await getCourseFilters({}, res);
        expect(res.json).toHaveBeenCalledWith({ subjects: ["History", "Science"], grades: ["Grade 3", "University"] });
        expect(Course.find).not.toHaveBeenCalled();
        expect(Course.distinct.mock.calls.every(([, criteria]) => criteria.isPublished === true)).toBe(true);
    });
});

// ─── getCreatorCourses ────────────────────────────────────────────────────────

describe("getCreatorCourses", () => {
    it("returns courses for the requesting user", async () => {
        const fakeCourses = [{ _id: "c1" }];
        const req = makeReq({ id: "instructor1" });
        const res = makeRes();
        Course.find.mockResolvedValue(fakeCourses);

        await getCreatorCourses(req, res);

        expect(Course.find).toHaveBeenCalledWith({ creator: "instructor1" });
        expect(res.status).toHaveBeenCalledWith(200);
    });

});

// ─── deleteCourse ──────────────────────────────────────────────────────────────

describe("deleteCourse", () => {
    const courseId = "507f1f77bcf86cd799439011";

    it("returns 400 when course id is invalid", async () => {
        const req = makeReq({ params: { courseId: "invalid-id" } });
        const res = makeRes();

        await deleteCourse(req, res);

        expect(Course.findById).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "Invalid course id.",
        });
    });

    it("returns 404 when course is not found", async () => {
        const req = makeReq({ params: { courseId } });
        const res = makeRes();

        Course.findById.mockReturnValue({
            populate: vi.fn().mockResolvedValue(null),
        });

        await deleteCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Course not found!" })
        );
    });

    it("returns 403 when the requesting instructor does not own the course", async () => {
        const req = makeReq({ params: { courseId }, id: "instructor_1" });
        const res = makeRes();

        Course.findById.mockReturnValue({
            populate: vi.fn().mockResolvedValue({
                _id: courseId,
                creator: "another_instructor",
                lectures: [],
            }),
        });

        await deleteCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "You are not allowed to delete this course." })
        );
    });

    it("preserves courses with completed purchase history", async () => {
        const req = makeReq({ params: { courseId }, id: "instructor_1" });
        const res = makeRes();
        Course.findById.mockReturnValue({ populate: vi.fn().mockResolvedValue({ _id: courseId, creator: { toString: () => "instructor_1" }, lectures: [] }) });
        CoursePurchase.exists.mockResolvedValue({ _id: "purchase_1" });

        await deleteCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(Course.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it("deletes course media, related lecture data, and the course record", async () => {
        const req = makeReq({ params: { courseId }, id: "instructor_1" });
        const res = makeRes();
        const lectureOne = {
            _id: "lecture_1",
            publicId: "video_pub_1",
            attachmentPublicId: "attachment_pub_1",
            quizQuestions: [
                { questionImagePublicId: "quiz_img_1" },
                { questionImagePublicId: "quiz_img_2" },
            ],
        };
        const lectureTwo = {
            _id: "lecture_2",
            publicId: "video_pub_2",
            attachmentPublicId: "",
            quizQuestions: [{ questionImagePublicId: "quiz_img_2" }],
        };

        Course.findById.mockReturnValue({
            populate: vi.fn().mockResolvedValue({
                _id: courseId,
                creator: { toString: () => "instructor_1" },
                courseThumbnail: "https://res.cloudinary.com/demo/image/upload/v1/course-thumbnail.png",
                lectures: [lectureOne, lectureTwo],
            }),
        });
        extractPublicIdFromUrl.mockReturnValue("course_thumbnail_public_id");
        deleteMediaFromCloudinary.mockResolvedValue({});
        deleteVideoFromCloudinary.mockResolvedValue({});
        Lecture.deleteMany.mockResolvedValue({});
        LectureComment.deleteMany.mockResolvedValue({});
        QuizResult.deleteMany.mockResolvedValue({});
        CoursePurchase.deleteMany.mockResolvedValue({});
        CourseProgress.deleteMany.mockResolvedValue({});
        Notification.deleteMany.mockResolvedValue({});
        User.updateMany.mockResolvedValue({});
        Course.findByIdAndDelete.mockResolvedValue({});

        await deleteCourse(req, res);

        expect(extractPublicIdFromUrl).toHaveBeenCalledWith(
            "https://res.cloudinary.com/demo/image/upload/v1/course-thumbnail.png"
        );
        expect(deleteMediaFromCloudinary).toHaveBeenCalledWith("course_thumbnail_public_id", "image");
        expect(deleteVideoFromCloudinary).toHaveBeenCalledWith("video_pub_1");
        expect(deleteVideoFromCloudinary).toHaveBeenCalledWith("video_pub_2");
        expect(deleteMediaFromCloudinary).toHaveBeenCalledWith("attachment_pub_1", "raw");
        expect(deleteMediaFromCloudinary).toHaveBeenCalledWith("quiz_img_1", "image");
        expect(deleteMediaFromCloudinary).toHaveBeenCalledWith("quiz_img_2", "image");
        expect(Lecture.deleteMany).toHaveBeenCalledWith({
            _id: { $in: ["lecture_1", "lecture_2"] },
        });
        expect(LectureComment.deleteMany).toHaveBeenCalledWith({ courseId });
        expect(QuizResult.deleteMany).toHaveBeenCalledWith({ courseId });
        expect(CoursePurchase.deleteMany).toHaveBeenCalledWith({ courseId });
        expect(CourseProgress.deleteMany).toHaveBeenCalledWith({ courseId });

        const notificationDeleteFilter = Notification.deleteMany.mock.calls[0][0];
        expect(notificationDeleteFilter.link.$regex.test(`/course-progress/${courseId}?lectureId=lecture_1`)).toBe(true);

        expect(User.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({ enrolledCourses: expect.anything() }),
            expect.objectContaining({
                $pull: expect.objectContaining({ enrolledCourses: expect.anything() }),
            })
        );
        expect(Course.findByIdAndDelete.mock.calls[0][0].toString()).toBe(courseId);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Course deleted successfully." })
        );
    });

    it("ignores missing populated lecture references during deletion", async () => {
        const req = makeReq({ params: { courseId }, id: "instructor_1" });
        const res = makeRes();
        const lectureOne = {
            _id: "lecture_1",
            publicId: "video_pub_1",
            attachmentPublicId: "",
            quizQuestions: [],
        };

        Course.findById.mockReturnValue({
            populate: vi.fn().mockResolvedValue({
                _id: courseId,
                creator: { toString: () => "instructor_1" },
                courseThumbnail: "",
                lectures: [lectureOne, null],
            }),
        });
        deleteMediaFromCloudinary.mockResolvedValue({});
        deleteVideoFromCloudinary.mockResolvedValue({});
        Lecture.deleteMany.mockResolvedValue({});
        LectureComment.deleteMany.mockResolvedValue({});
        QuizResult.deleteMany.mockResolvedValue({});
        CoursePurchase.deleteMany.mockResolvedValue({});
        CourseProgress.deleteMany.mockResolvedValue({});
        Notification.deleteMany.mockResolvedValue({});
        User.updateMany.mockResolvedValue({});
        Course.findByIdAndDelete.mockResolvedValue({});

        await deleteCourse(req, res);

        expect(deleteVideoFromCloudinary).toHaveBeenCalledWith("video_pub_1");
        expect(Lecture.deleteMany).toHaveBeenCalledWith({
            _id: { $in: ["lecture_1"] },
        });
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

// ─── getCourseById ────────────────────────────────────────────────────────────

describe("getCourseById", () => {
    it("does not expose an unpublished course to public visitors", async () => {
        const res = makeRes();
        const populateMock = vi.fn().mockReturnThis();
        Course.findById.mockReturnValue({ populate: populateMock });
        populateMock.mockReturnValueOnce({ populate: vi.fn().mockResolvedValue({ isPublished: false }) });
        await getPublicCourseById(makeReq({ params: { courseId: "c1" } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("does not expose an unpublished course to another instructor", async () => {
        const res = makeRes();
        const populateMock = vi.fn().mockReturnThis();
        Course.findById.mockReturnValue({ populate: populateMock });
        populateMock.mockReturnValueOnce({ populate: vi.fn().mockResolvedValue({ isPublished: false, creator: { _id: "owner" } }) });
        await getCourseById(makeReq({ params: { courseId: "c1" }, id: "other" }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("hides non-preview videos and private assets in the public overview", async () => {
        const source = [
            { isPreviewFree: true, previewEnabledByAdmin: true, videoUrl: "preview", publicId: "p1", attachmentUrl: "private.pdf", quizQuestions: [{ questionText: "secret" }] },
            { isPreviewFree: true, previewEnabledByAdmin: false, videoUrl: "locked", publicId: "p2" },
        ];
        const course = {
            isPublished: true,
            lectures: source.map((lecture) => ({ ...lecture, toObject: () => ({ ...lecture }) })),
            toObject: () => ({ lectures: source }),
        };
        const populateMock = vi.fn().mockReturnThis();
        Course.findById.mockReturnValue({ populate: populateMock });
        populateMock.mockReturnValueOnce({ populate: vi.fn().mockResolvedValue(course) });
        const res = makeRes();
        await getPublicCourseById(makeReq({ params: { courseId: "c1" } }), res);
        const lectures = res.json.mock.calls[0][0].course.lectures;
        expect(lectures[0].videoUrl).toBe("preview");
        expect(lectures[0].attachmentUrl).toBeUndefined();
        expect(lectures[0].quizQuestions).toBeUndefined();
        expect(lectures[0].publicId).toBeUndefined();
        expect(lectures[1].videoUrl).toBeUndefined();
    });

    it("returns 404 when course is not found", async () => {
        const req = makeReq({ params: { courseId: "c999" } });
        const res = makeRes();
        const populateMock = vi.fn().mockReturnThis();
        Course.findById.mockReturnValue({ populate: populateMock });
        populateMock.mockReturnValueOnce({ populate: vi.fn().mockResolvedValue(null) });

        await getCourseById(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns course with preview lectures having videoUrl and non-preview without", async () => {
        const previewLecture = { _id: "l1", isPreviewFree: true, videoUrl: "http://v1", publicId: "p1", toObject: vi.fn().mockReturnValue({ _id: "l1", isPreviewFree: true, videoUrl: "http://v1", publicId: "p1" }) };
        const lockedLecture = { _id: "l2", isPreviewFree: false, videoUrl: "http://v2", publicId: "p2", toObject: vi.fn().mockReturnValue({ _id: "l2", isPreviewFree: false, videoUrl: "http://v2", publicId: "p2" }) };
        const fakeCourse = {
            _id: "c1",
            isPublished: true,
            lectures: [previewLecture, lockedLecture],
            toObject: vi.fn().mockReturnValue({
                _id: "c1",
                lectures: [
                    { _id: "l1", isPreviewFree: true, videoUrl: "http://v1", publicId: "p1" },
                    { _id: "l2", isPreviewFree: false, videoUrl: "http://v2", publicId: "p2" },
                ],
            }),
        };
        const req = makeReq({ params: { courseId: "c1" } });
        const res = makeRes();

        const populateMock = vi.fn().mockReturnThis();
        Course.findById.mockReturnValue({ populate: populateMock });
        populateMock.mockReturnValueOnce({ populate: vi.fn().mockResolvedValue(fakeCourse) });

        await getCourseById(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const { course } = res.json.mock.calls[0][0];
        // preview lecture keeps videoUrl
        expect(course.lectures[0].videoUrl).toBe("http://v1");
        // locked lecture loses videoUrl
        expect(course.lectures[1].videoUrl).toBeUndefined();
    });
});

// ─── createLecture ────────────────────────────────────────────────────────────

describe("createLecture", () => {
    it("returns 400 when lectureTitle is missing", async () => {
        const req = makeReq({ body: {}, params: { courseId: "c1" } });
        const res = makeRes();

        await createLecture(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("creates lecture and adds it to the course", async () => {
        const fakeLecture = { _id: "l1", lectureTitle: "Intro" };
        const fakeCourse = {
            lectures: [],
            save: vi.fn().mockResolvedValue(true),
        };
        const req = makeReq({
            body: { lectureTitle: "Intro" },
            params: { courseId: "c1" },
        });
        const res = makeRes();
        Lecture.create.mockResolvedValue(fakeLecture);
        Course.findById.mockResolvedValue(fakeCourse);

        await createLecture(req, res);

        expect(fakeCourse.lectures).toContain("l1");
        expect(res.status).toHaveBeenCalledWith(201);
    });
});

// ─── removeLecture ────────────────────────────────────────────────────────────

describe("removeLecture", () => {
    it("returns 404 when lecture is not found", async () => {
        const req = makeReq({ params: { lectureId: "l999" } });
        const res = makeRes();
        Lecture.findByIdAndDelete.mockResolvedValue(null);

        await removeLecture(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("removes lecture and its reference from the course", async () => {
        const req = makeReq({ params: { lectureId: "l1" } });
        const res = makeRes();
        Lecture.findByIdAndDelete.mockResolvedValue({ _id: "l1", publicId: null, quizQuestions: [] });
        Course.updateOne.mockResolvedValue({});

        await removeLecture(req, res);

        expect(Course.updateOne).toHaveBeenCalledWith(
            { lectures: "l1" },
            { $pull: { lectures: "l1" } }
        );
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("deletes quiz question images from Cloudinary when removing a lecture", async () => {
        const req = makeReq({ params: { lectureId: "l1" } });
        const res = makeRes();
        Lecture.findByIdAndDelete.mockResolvedValue({
            _id: "l1",
            publicId: null,
            quizQuestions: [
                { questionText: "Q1", questionImagePublicId: "img_pub_1" },
                { questionText: "Q2", questionImagePublicId: "" },
                { questionText: "Q3", questionImagePublicId: "img_pub_3" },
            ],
        });
        Course.updateOne.mockResolvedValue({});
        deleteMediaFromCloudinary.mockResolvedValue({});

        await removeLecture(req, res);

        expect(deleteMediaFromCloudinary).toHaveBeenCalledWith("img_pub_1", "image");
        expect(deleteMediaFromCloudinary).toHaveBeenCalledWith("img_pub_3", "image");
        expect(deleteMediaFromCloudinary).toHaveBeenCalledTimes(2);
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

// ─── getLectureById ───────────────────────────────────────────────────────────

describe("getLectureById", () => {
    it("returns 404 when lecture is not found", async () => {
        const req = makeReq({ params: { lectureId: "l999" } });
        const res = makeRes();
        Lecture.findById.mockResolvedValue(null);

        await getLectureById(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns lecture on success", async () => {
        const fakeLecture = { _id: "l1", lectureTitle: "Intro" };
        const req = makeReq({ params: { lectureId: "l1" } });
        const res = makeRes();
        Lecture.findById.mockResolvedValue(fakeLecture);

        await getLectureById(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ lecture: fakeLecture });
    });

    it("keeps the storage URL separate from the expiring manager preview URL", async () => {
        const storageUrl = "https://res.cloudinary.com/demo/video/authenticated/v1/lms/lectures/user1/a.mp4";
        getProtectedMediaUrl.mockReturnValueOnce("https://api.cloudinary.com/temporary-video");
        Lecture.findById.mockResolvedValue({ _id: "l1", videoUrl: storageUrl, publicId: "lms/lectures/user1/a" });
        const res = makeRes();
        await getLectureById(makeReq({ params: { lectureId: "l1" } }), res);
        expect(res.json.mock.calls[0][0].lecture).toEqual(expect.objectContaining({
            videoUrl: storageUrl,
            playbackUrl: "https://api.cloudinary.com/temporary-video",
        }));
    });
});

// ─── togglePublishCourse ──────────────────────────────────────────────────────

describe("togglePublishCourse", () => {
    it("requires the owner to provide WhatsApp before publishing a paid course", async () => {
        const fakeCourse = { _id: "c1", creator: "owner", coursePrice: 200, isPublished: false, subject: "History", lectures: ["l1"], save: vi.fn() };
        Course.findById.mockResolvedValue(fakeCourse);
        User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue({ status: "active", instructorWhatsapp: "" }) });
        const res = makeRes();
        await togglePublishCourse(makeReq({ params: { courseId: "c1" }, query: { publish: "true" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(fakeCourse.save).not.toHaveBeenCalled();
    });
    it("returns 404 when course is not found", async () => {
        const req = makeReq({ params: { courseId: "c999" }, query: { publish: "true" } });
        const res = makeRes();
        Course.findById.mockResolvedValue(null);

        await togglePublishCourse(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("publishes a course when publish=true", async () => {
        const fakeCourse = { _id: "c1", isPublished: false, subject: "History", lectures: ["l1"], save: vi.fn().mockResolvedValue(true) };
        const req = makeReq({ params: { courseId: "c1" }, query: { publish: "true" } });
        const res = makeRes();
        Course.findById.mockResolvedValue(fakeCourse);

        await togglePublishCourse(req, res);

        expect(fakeCourse.isPublished).toBe(true);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Course is Published" })
        );
    });

    it("unpublishes a course when publish=false", async () => {
        const fakeCourse = { _id: "c1", isPublished: true, save: vi.fn().mockResolvedValue(true) };
        const req = makeReq({ params: { courseId: "c1" }, query: { publish: "false" } });
        const res = makeRes();
        Course.findById.mockResolvedValue(fakeCourse);

        await togglePublishCourse(req, res);

        expect(fakeCourse.isPublished).toBe(false);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Course is Unpublished" })
        );
    });
});

// ─── reorderLecture ───────────────────────────────────────────────────────────

describe("reorderLecture", () => {
    it("returns 400 for invalid direction", async () => {
        const req = makeReq({ params: { courseId: "c1", lectureId: "l1" }, body: { direction: "left" } });
        const res = makeRes();

        await reorderLecture(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when course is not found", async () => {
        const req = makeReq({ params: { courseId: "c1", lectureId: "l1" }, body: { direction: "up" } });
        const res = makeRes();
        Course.findById.mockResolvedValue(null);

        await reorderLecture(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 404 when lecture is not in course", async () => {
        const fakeCourse = {
            lectures: [{ toString: () => "l2" }],
            save: vi.fn(),
        };
        const req = makeReq({ params: { courseId: "c1", lectureId: "l99" }, body: { direction: "up" } });
        const res = makeRes();
        Course.findById.mockResolvedValue(fakeCourse);

        await reorderLecture(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when moving first lecture up", async () => {
        const fakeCourse = {
            lectures: [{ toString: () => "l1" }, { toString: () => "l2" }],
            save: vi.fn(),
        };
        const req = makeReq({ params: { courseId: "c1", lectureId: "l1" }, body: { direction: "up" } });
        const res = makeRes();
        Course.findById.mockResolvedValue(fakeCourse);

        await reorderLecture(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("moves a lecture down successfully", async () => {
        const l1 = { toString: () => "l1" };
        const l2 = { toString: () => "l2" };
        const fakeCourse = {
            lectures: [l1, l2],
            save: vi.fn().mockResolvedValue(true),
        };
        const req = makeReq({ params: { courseId: "c1", lectureId: "l1" }, body: { direction: "down" } });
        const res = makeRes();
        Course.findById.mockResolvedValue(fakeCourse);

        await reorderLecture(req, res);

        expect(fakeCourse.lectures[0]).toBe(l2);
        expect(fakeCourse.lectures[1]).toBe(l1);
        expect(res.status).toHaveBeenCalledWith(200);
    });
});

// ─── updateLectureQuiz (tests sanitizeQuizQuestions indirectly) ───────────────

describe("updateLectureQuiz", () => {
    const validCourse = (lectureId) => ({
        _id: "c1",
        lectures: [{ toString: () => lectureId }],
    });

    it("returns 400 when quizQuestions is not an array", async () => {
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: { quizQuestions: "not-an-array" },
        });
        const res = makeRes();

        await updateLectureQuiz(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 404 when lecture is not found", async () => {
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l999" },
            body: { quizQuestions: [] },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue(null);

        await updateLectureQuiz(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 404 when lecture is not in course", async () => {
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: { quizQuestions: [] },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue({ _id: "l1" });
        Course.findById.mockResolvedValue({ lectures: [{ toString: () => "l99" }] });

        await updateLectureQuiz(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("returns 400 when a quiz question has no text or image", async () => {
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: {
                quizQuestions: [{ questionText: "", options: ["A", "B"], correctOptionIndex: 0 }],
            },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue({ _id: "l1" });
        Course.findById.mockResolvedValue(validCourse("l1"));

        await updateLectureQuiz(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Each quiz question must include text or image." })
        );
    });

    it("returns 400 when a quiz question has fewer than 2 options", async () => {
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: {
                quizQuestions: [{ questionText: "Q1", options: ["A"], correctOptionIndex: 0 }],
            },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue({ _id: "l1" });
        Course.findById.mockResolvedValue(validCourse("l1"));

        await updateLectureQuiz(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Each quiz question must include at least 2 options." })
        );
    });

    it("returns 400 when correctOptionIndex is out of range", async () => {
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: {
                quizQuestions: [{ questionText: "Q1", options: ["A", "B"], correctOptionIndex: 5 }],
            },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue({ _id: "l1" });
        Course.findById.mockResolvedValue(validCourse("l1"));

        await updateLectureQuiz(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Each quiz question must have a valid correct option." })
        );
    });

    it("saves valid quiz questions and returns 200", async () => {
        const fakeLecture = {
            _id: "l1",
            quizQuestions: [],
            save: vi.fn().mockResolvedValue(true),
        };
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: {
                quizQuestions: [
                    { questionText: "What is 2+2?", options: ["3", "4", "5"], correctOptionIndex: 1 },
                ],
            },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue(fakeLecture);
        Course.findById.mockResolvedValue(validCourse("l1"));

        await updateLectureQuiz(req, res);

        expect(fakeLecture.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Lecture quiz updated successfully." })
        );
    });

    it("saves empty quiz questions array (clearing quiz)", async () => {
        const fakeLecture = {
            _id: "l1",
            quizQuestions: [
                { questionText: "old1", questionImagePublicId: "img_clear_1", options: ["A", "B"], correctOptionIndex: 0 },
                { questionText: "old2", questionImagePublicId: "img_clear_2", options: ["A", "B"], correctOptionIndex: 0 },
            ],
            save: vi.fn().mockResolvedValue(true),
        };
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: { quizQuestions: [] },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue(fakeLecture);
        Course.findById.mockResolvedValue(validCourse("l1"));
        deleteMediaFromCloudinary.mockResolvedValue({});

        await updateLectureQuiz(req, res);

        expect(fakeLecture.quizQuestions).toEqual([]);
        expect(deleteMediaFromCloudinary).toHaveBeenCalledWith("img_clear_1", "image");
        expect(deleteMediaFromCloudinary).toHaveBeenCalledWith("img_clear_2", "image");
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("deletes stale question images from Cloudinary when questions are removed", async () => {
        const fakeLecture = {
            _id: "l1",
            quizQuestions: [
                { questionText: "Q1", questionImagePublicId: "img_old_1", options: ["A", "B"], correctOptionIndex: 0 },
                { questionText: "Q2", questionImagePublicId: "img_old_2", options: ["A", "B"], correctOptionIndex: 0 },
            ],
            save: vi.fn().mockResolvedValue(true),
        };
        // Only Q1 is kept; Q2 is removed
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: {
                quizQuestions: [
                    { questionText: "Q1", questionImagePublicId: "img_old_1", options: ["A", "B"], correctOptionIndex: 0 },
                ],
            },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue(fakeLecture);
        Course.findById.mockResolvedValue(validCourse("l1"));
        deleteMediaFromCloudinary.mockResolvedValue({});

        await updateLectureQuiz(req, res);

        expect(deleteMediaFromCloudinary).toHaveBeenCalledWith("img_old_2", "image");
        expect(deleteMediaFromCloudinary).not.toHaveBeenCalledWith("img_old_1", "image");
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("deletes replaced question image from Cloudinary when image is swapped", async () => {
        const fakeLecture = {
            _id: "l1",
            quizQuestions: [
                { questionText: "Q1", questionImagePublicId: "img_old", options: ["A", "B"], correctOptionIndex: 0 },
            ],
            save: vi.fn().mockResolvedValue(true),
        };
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: {
                quizQuestions: [
                    { questionText: "Q1", questionImageUrl: "https://res.cloudinary.com/demo/image/upload/v1/lms/quiz-questions/user1/img_new.jpg", questionImagePublicId: "lms/quiz-questions/user1/img_new", options: ["A", "B"], correctOptionIndex: 0 },
                ],
            },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue(fakeLecture);
        Course.findById.mockResolvedValue(validCourse("l1"));
        deleteMediaFromCloudinary.mockResolvedValue({});
        extractPublicIdFromUrl.mockReturnValue("lms/quiz-questions/user1/img_new");
        verifyDirectUpload.mockResolvedValue({ public_id: "lms/quiz-questions/user1/img_new", secure_url: "https://res.cloudinary.com/demo/image/upload/v1/lms/quiz-questions/user1/img_new.jpg" });

        await updateLectureQuiz(req, res);

        expect(deleteMediaFromCloudinary).toHaveBeenCalledWith("img_old", "image");
        expect(deleteMediaFromCloudinary).not.toHaveBeenCalledWith("lms/quiz-questions/user1/img_new", "image");
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("does not save quiz images when provider verification fails", async () => {
        const lecture = { _id: "l1", quizQuestions: [], save: vi.fn() };
        Lecture.findById.mockResolvedValue(lecture);
        Course.findById.mockResolvedValue(validCourse("l1"));
        const id = "lms/quiz-questions/user1/img_new";
        extractPublicIdFromUrl.mockReturnValue(id);
        verifyDirectUpload.mockRejectedValue(Object.assign(new Error("Invalid or unowned upload."), { uploadStatus: 400 }));
        const res = makeRes();
        await updateLectureQuiz(makeReq({ params: { courseId: "c1", lectureId: "l1" }, body: { quizQuestions: [{ questionText: "Q", questionImageUrl: `https://evil.test/image/upload/${id}.jpg`, questionImagePublicId: id, options: ["A", "B"], correctOptionIndex: 0 }] } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(lecture.save).not.toHaveBeenCalled();
    });

    it("rejects a quiz image that was uploaded outside the current instructor folder", async () => {
        const fakeLecture = { _id:"l1", quizQuestions:[], save:vi.fn() };
        Lecture.findById.mockResolvedValue(fakeLecture);
        Course.findById.mockResolvedValue(validCourse("l1"));
        extractPublicIdFromUrl.mockReturnValue("lms/quiz-questions/other-user/stolen");
        const res = makeRes();
        await updateLectureQuiz(makeReq({ params:{ courseId:"c1", lectureId:"l1" }, body:{ quizQuestions:[{
            questionText:"Q", questionImageUrl:"https://res.cloudinary.com/demo/image/upload/lms/quiz-questions/other-user/stolen.jpg",
            questionImagePublicId:"lms/quiz-questions/other-user/stolen", options:["A","B"], correctOptionIndex:0,
        }] } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(fakeLecture.save).not.toHaveBeenCalled();
    });
});

// ─── getCourseLecture ─────────────────────────────────────────────────────────

describe("getCourseLecture", () => {
    beforeEach(() => Course.findById.mockReset());
    it("returns 403 when non-instructor has not purchased or enrolled", async () => {
        const req = makeReq({
            params: { courseId: "c1" },
            id: "student1",
            user: { role: "student" },
        });
        const res = makeRes();
        CoursePurchase.findOne.mockResolvedValue(null);
        User.findById.mockReturnValue({
            select: vi.fn().mockResolvedValue({ enrolledCourses: [] }),
        });
        // First call: .select("coursePrice") for price check
        // Second call: .populate("lectures") for the actual course
        Course.findById
            .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ coursePrice: 50 }) })
            .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue({ lectures: [] }) });

        await getCourseLecture(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
    });

    it("allows instructor to access without checking purchase", async () => {
        const req = makeReq({
            params: { courseId: "c1" },
            id: "instructor1",
            user: { role: "instructor" },
        });
        const res = makeRes();
        const fakeCourse = {
            creator: { toString: () => "instructor1" },
            lectures: [{ _id: "l1" }],
        };
        Course.findById.mockReturnValue({
            select: vi.fn().mockResolvedValue(fakeCourse),
            populate: vi.fn().mockResolvedValue(fakeCourse),
        });

        await getCourseLecture(req, res);

        expect(CoursePurchase.findOne).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("refuses to publish a course without a subject", async () => {
        const res = makeRes();
        Course.findById.mockResolvedValue({ isPublished: false, category: "Grade 4", lectures: ["l1"] });
        await togglePublishCourse(makeReq({ params: { courseId: "c1" }, query: { publish: "true" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("refuses to publish an empty course", async () => {
        const res = makeRes();
        Course.findById.mockResolvedValue({ isPublished: false, subject: "History", lectures: [] });
        await togglePublishCourse(makeReq({ params: { courseId: "c1" }, query: { publish: "true" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it("does not grant an unrelated instructor access to a paid course", async () => {
        const req = makeReq({ params: { courseId: "c1" }, id: "other-instructor", user: { role: "instructor" } });
        const res = makeRes();
        Course.findById.mockReturnValue({ select: vi.fn().mockResolvedValue({ creator: { toString: () => "owner" }, coursePrice: 50 }) });
        CoursePurchase.findOne.mockResolvedValue(null);
        User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue({ enrolledCourses: [] }) });

        await getCourseLecture(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
    });

    it("returns 200 for free course without enrollment", async () => {
        const req = makeReq({
            params: { courseId: "c1" },
            id: "student1",
            user: { role: "student" },
        });
        const res = makeRes();
        CoursePurchase.findOne.mockResolvedValue(null);
        User.findById.mockReturnValue({
            select: vi.fn().mockResolvedValue({ enrolledCourses: [] }),
        });
        // Free course (price 0) — first call returns price info, second returns the course
        Course.findById
            .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ coursePrice: 0 }) })
            .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue({ lectures: [] }) });

        await getCourseLecture(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("does not send correct quiz answers to a student", async () => {
        const res = makeRes();
        CoursePurchase.findOne.mockResolvedValue(null);
        User.findById.mockReturnValue({ select: vi.fn().mockResolvedValue({ enrolledCourses: [] }) });
        Course.findById
            .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ creator: "owner", coursePrice: 0, isPublished: true }) })
            .mockReturnValueOnce({ populate: vi.fn().mockResolvedValue({ lectures: [{
                quizQuestions: [{ questionText: "Q", options: ["A", "B"], correctOptionIndex: 1 }],
            }] }) });
        await getCourseLecture(makeReq({ params: { courseId: "c1" }, id: "student1", user: { role: "student" } }), res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json.mock.calls[0][0].lectures[0].quizQuestions[0]).not.toHaveProperty("correctOptionIndex");
    });
});

// ─── editLecture ──────────────────────────────────────────────────────────────

describe("direct course thumbnail", () => {
    it("stores the provider-verified URL rather than a browser URL", async () => {
        Course.findById.mockResolvedValue({ creator: "u1" });
        Course.findByIdAndUpdate.mockResolvedValue({ _id: "c1" });
        verifyDirectUpload.mockResolvedValue({ public_id: "owned", secure_url: "verified-image-url" });
        const res = makeRes();
        await editCourse(makeReq({ id: "u1", params: { courseId: "c1" }, body: { thumbnailAssetId: "owned", courseThumbnail: "https://evil.test" } }), res);
        expect(verifyDirectUpload).toHaveBeenCalledWith("owned", "thumbnail", "u1");
        expect(Course.findByIdAndUpdate).toHaveBeenCalledWith("c1", expect.objectContaining({ $set: expect.objectContaining({ courseThumbnail: "verified-image-url" }) }), expect.any(Object));
        expect(uploadMedia).not.toHaveBeenCalled();
    });
    it("does not update a course when upload verification fails", async () => {
        Course.findById.mockResolvedValue({ creator: "u1" });
        verifyDirectUpload.mockRejectedValue(Object.assign(new Error("Invalid or unowned upload."), { uploadStatus: 400 }));
        const res = makeRes();
        await editCourse(makeReq({ id: "u1", params: { courseId: "c1" }, body: { thumbnailAssetId: "other" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(Course.findByIdAndUpdate).not.toHaveBeenCalled();
    });
});

describe("editLecture", () => {
    const makeLecture = (overrides = {}) => ({
        _id: "l1",
        lectureTitle: "Old Title",
        videoUrl: "",
        publicId: "",
        isPreviewFree: false,
        previewEnabledByAdmin: false,
        description: "",
        attachmentUrl: "",
        attachmentPublicId: "",
        save: vi.fn().mockResolvedValue(true),
        ...overrides,
    });

    it("saves a verified direct PDF before removing the previous attachment", async () => {
        const lecture = makeLecture({ attachmentUrl: "https://res.cloudinary.com/test/raw/authenticated/v1/old.pdf", attachmentPublicId: "old.pdf" });
        Lecture.findById.mockResolvedValue(lecture);
        Course.findById.mockResolvedValue({ lectures: ["l1"] });
        verifyDirectUpload.mockResolvedValue({ public_id: "new.pdf", secure_url: "verified-private-pdf" });
        const res = makeRes();
        await editLecture(makeReq({ id: "u1", params: { courseId: "c1", lectureId: "l1" }, body: { attachmentAssetId: "new.pdf" } }), res);
        expect(verifyDirectUpload).toHaveBeenCalledWith("new.pdf", "attachment", "u1");
        expect(lecture.attachmentUrl).toBe("verified-private-pdf");
        expect(lecture.save).toHaveBeenCalled();
        expect(deleteMediaFromCloudinary).toHaveBeenCalledWith("old.pdf", "raw", "authenticated");
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("keeps the original attachment when direct verification fails", async () => {
        const lecture = makeLecture({ attachmentPublicId: "original.pdf" });
        Lecture.findById.mockResolvedValue(lecture);
        verifyDirectUpload.mockRejectedValue(Object.assign(new Error("Invalid or unowned upload."), { uploadStatus: 400 }));
        const res = makeRes();
        await editLecture(makeReq({ id: "u1", params: { courseId: "c1", lectureId: "l1" }, body: { attachmentAssetId: "other.pdf" } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(lecture.save).not.toHaveBeenCalled();
        expect(deleteMediaFromCloudinary).not.toHaveBeenCalled();
    });

    it("returns 404 when lecture is not found", async () => {
        const req = makeReq({ params: { courseId: "c1", lectureId: "l999" }, body: {} });
        const res = makeRes();
        Lecture.findById.mockResolvedValue(null);

        await editLecture(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it("updates lecture title and returns 200", async () => {
        const fakeLecture = makeLecture();
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: { lectureTitle: "New Title" },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue(fakeLecture);
        // lecture._id "l1" is already in the array, so save won't be called
        Course.findById.mockResolvedValue({
            lectures: ["l1"],
            save: vi.fn().mockResolvedValue(true),
            _id: "c1",
        });

        await editLecture(req, res);

        expect(fakeLecture.lectureTitle).toBe("New Title");
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("parses JSON-stringified videoInfo from FormData", async () => {
        const fakeLecture = makeLecture();
        const videoInfo = { videoUrl: "https://res.cloudinary.com/demo/video/authenticated/v1/lms/lectures/user1/pid1.mp4", publicId: "lms/lectures/user1/pid1" };
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: { videoInfo: JSON.stringify(videoInfo) },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue(fakeLecture);
        Course.findById.mockResolvedValue({ lectures: [], save: vi.fn() });
        extractPublicIdFromUrl.mockReturnValue("lms/lectures/user1/pid1");

        await editLecture(req, res);

        expect(fakeLecture.videoUrl).toBe(videoInfo.videoUrl);
        expect(fakeLecture.publicId).toBe(videoInfo.publicId);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("rejects a video asset owned by another instructor", async () => {
        const fakeLecture = makeLecture();
        const res = makeRes();
        extractPublicIdFromUrl.mockReturnValue("lms/lectures/other-user/stolen");
        await editLecture(makeReq({ params:{ courseId:"c1", lectureId:"l1" }, body:{ videoInfo:JSON.stringify({
            videoUrl:"https://res.cloudinary.com/demo/video/authenticated/lms/lectures/other-user/stolen.mp4",
            publicId:"lms/lectures/other-user/stolen",
        }) } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(fakeLecture.save).not.toHaveBeenCalled();
    });

    it("rejects non-YouTube external video links", async () => {
        const fakeLecture = makeLecture();
        Lecture.findById.mockResolvedValue(fakeLecture);
        const res = makeRes();
        await editLecture(makeReq({ params: { courseId: "c1", lectureId: "l1" }, body: {
            videoInfo: { videoUrl: "https://example.com/video.mp4", publicId: "" },
        } }), res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(fakeLecture.save).not.toHaveBeenCalled();
    });

    it("handles malformed videoInfo JSON gracefully (no crash)", async () => {
        const fakeLecture = makeLecture();
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: { videoInfo: "not-valid-json" },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue(fakeLecture);
        Course.findById.mockResolvedValue({ lectures: [], save: vi.fn() });

        await editLecture(req, res);

        // videoUrl should remain unchanged since videoInfo is invalid
        expect(fakeLecture.videoUrl).toBe("");
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("updates description when provided", async () => {
        const fakeLecture = makeLecture();
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: { description: "<p>Hello world</p>" },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue(fakeLecture);
        Course.findById.mockResolvedValue({ lectures: [], save: vi.fn() });

        await editLecture(req, res);

        expect(fakeLecture.description).toBe("<p>Hello world</p>");
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 400 when uploaded file is not a PDF (wrong MIME)", async () => {
        const fakeLecture = makeLecture();
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: {},
            file: { mimetype: "image/png", buffer: Buffer.from("fake") },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue(fakeLecture);

        await editLecture(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Only PDF files are accepted as attachments." })
        );
        expect(uploadMedia).not.toHaveBeenCalled();
    });

    it("returns 400 when file has PDF MIME but fails magic-bytes check", async () => {
        const fakeLecture = makeLecture();
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: {},
            file: {
                mimetype: "application/pdf",
                buffer: Buffer.from("NOTAPDF_fake content"),
            },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue(fakeLecture);

        await editLecture(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: "Uploaded file does not appear to be a valid PDF." })
        );
        expect(uploadMedia).not.toHaveBeenCalled();
    });

    it("uploads new attachment before deleting old one", async () => {
        const fakeLecture = makeLecture({
            attachmentPublicId: "old_pub_id",
            attachmentUrl: "https://cloudinary.com/old.pdf",
        });
        const pdfBuffer = Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(10)]);
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: {},
            file: { mimetype: "application/pdf", buffer: pdfBuffer },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue(fakeLecture);
        Course.findById.mockResolvedValue({ lectures: [], save: vi.fn() });

        const callOrder = [];
        uploadMedia.mockImplementation(async () => {
            callOrder.push("upload");
            return { secure_url: "https://cloudinary.com/new.pdf", public_id: "new_pub_id" };
        });
        deleteMediaFromCloudinary.mockImplementation(async () => {
            callOrder.push("delete");
        });

        await editLecture(req, res);

        expect(callOrder).toEqual(["upload", "delete"]);
        expect(deleteMediaFromCloudinary).toHaveBeenCalledWith("old_pub_id", "raw");
        expect(fakeLecture.attachmentUrl).toBe("https://cloudinary.com/new.pdf");
        expect(fakeLecture.attachmentPublicId).toBe("new_pub_id");
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("does not delete old attachment when there is none", async () => {
        const fakeLecture = makeLecture({ attachmentPublicId: "", attachmentUrl: "" });
        const pdfBuffer = Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(10)]);
        const req = makeReq({
            params: { courseId: "c1", lectureId: "l1" },
            body: {},
            file: { mimetype: "application/pdf", buffer: pdfBuffer },
        });
        const res = makeRes();
        Lecture.findById.mockResolvedValue(fakeLecture);
        Course.findById.mockResolvedValue({ lectures: [], save: vi.fn() });
        uploadMedia.mockResolvedValue({ secure_url: "https://cloudinary.com/new.pdf", public_id: "new_pub_id" });

        await editLecture(req, res);

        expect(deleteMediaFromCloudinary).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
