import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QuizAttemptSummary from "../components/QuizAttemptSummary";
import QuizSettings from "../pages/admin/lecture/QuizSettings";
import QuestionInbox from "../pages/admin/QuestionInbox";
const { save, reply, inbox } = vi.hoisted(() => ({ save: vi.fn(), reply: vi.fn(), inbox: vi.fn() }));
vi.mock("../components/languageContext", () => ({ useLanguage: () => ({ language: "en" }) }));
vi.mock("react-redux", () => ({ useSelector: fn => fn({ auth: { user: { role: "instructor" } } }) }));
vi.mock("../features/api/courseApi", () => ({ useGetCreatorCourseQuery: () => ({ data: { courses: [] } }), useGetAdminManageableCoursesQuery: () => ({}) }));
vi.mock("../features/api/courseProgressApi", () => ({ useUpdateQuizSettingsMutation: () => [save, { isLoading: false }], useAddLectureCommentMutation: () => [reply, { isLoading: false }], useResolveQuestionMutation: () => [vi.fn(), { isLoading: false }], useGetQuestionInboxQuery: inbox }));
beforeEach(() => { save.mockReset(); reply.mockReset(); inbox.mockReset(); });
describe("teaching and assessment UI", () => {
  it("keeps historical pass decisions separate from a changed current pass mark", () => {
    render(<QuizAttemptSummary maxAttempts={2} passPercentage={90} result={{ bestPercentage: 80, attemptsCount: 2, history: [{ score: 4, totalQuestions: 5, percentage: 80, passPercentage: 60, passed: true, submittedAt: "2026-10-01" }] }} />);
    expect(screen.getByText("Your best score has not reached the current pass mark yet.")).toBeInTheDocument();
    expect(screen.getByText("Best score: 80% · Remaining attempts: 0")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Attempt history"));
    expect(screen.getByText("Passed")).toBeVisible();
  });
  it("rejects invalid attempt limits and retains settings after a failed save", async () => {
    save.mockReturnValue({ unwrap: () => Promise.reject({ status: 500 }) });
    render(<QuizSettings lecture={{}} courseId="c" lectureId="l" />);
    fireEvent.change(screen.getByLabelText("Allowed attempts"), { target: { value: "11" } });
    expect(screen.getByRole("button", { name: "Save quiz settings" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Allowed attempts"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Save quiz settings" }));
    await screen.findByText("Could not save. Try again.");
    expect(screen.getByLabelText("Allowed attempts")).toHaveValue(5);
    expect(save).toHaveBeenCalledWith({ courseId: "c", lectureId: "l", quizMaxAttempts: 5, quizPassPercentage: 60 });
  });
  it("shows an inbox failure with a retry instead of an empty inbox", () => {
    const refetch = vi.fn(); inbox.mockReturnValue({ isError: true, refetch });
    render(<MemoryRouter><QuestionInbox /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
    expect(screen.queryByText("No questions match these filters.")).not.toBeInTheDocument();
  });
  it("retains the teacher reply draft when delivery fails", async () => {
    reply.mockReturnValue({ unwrap: () => Promise.reject({ status: 503 }) });
    inbox.mockReturnValue({ currentData: { page: 1, totalPages: 1, total: 1, rows: [{ _id: "q", courseId: "c", lectureId: "l", student: { name: "Student" }, course: { courseTitle: "Physics" }, lecture: { lectureTitle: "Motion" }, text: "Why?", createdAt: "2026-10-01", replies: [] }] } });
    render(<MemoryRouter><QuestionInbox /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText("Your reply"), { target: { value: "Here is why." } });
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));
    await screen.findByText("Could not send. Your draft is preserved; try again.");
    expect(screen.getByLabelText("Your reply")).toHaveValue("Here is why.");
  });
});
