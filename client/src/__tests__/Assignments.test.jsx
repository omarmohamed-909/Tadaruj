import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, Link, MemoryRouter } from "react-router-dom";
import StudentSubmission from "../pages/assignments/StudentSubmission";
import AssignmentReviews from "../pages/assignments/AssignmentReviews";
import AssignmentForm from "../pages/assignments/AssignmentForm";
import { notificationText } from "../lib/notificationText";
const { send, review, create, detail } = vi.hoisted(() => ({ send: vi.fn(), review: vi.fn(), create: vi.fn(), detail: vi.fn() }));
vi.mock("../components/languageContext", () => ({ useLanguage: () => ({ language: "en" }) }));
vi.mock("../features/api/assignmentsApi", () => ({
  useSubmitAssignmentMutation: () => [send, { isLoading: false }],
  useReviewAssignmentSubmissionMutation: () => [review, { isLoading: false }],
  useCreateAssignmentMutation: () => [create, { isLoading: false }],
  useUpdateAssignmentMutation: () => [create, { isLoading: false }],
  useGetAssignmentSubmissionQuery: detail,
  useGetAssignmentSubmissionsQuery: () => ({ currentData: { rows: [{ _id: "s", studentId: { name: "Learner" }, status: "submitted", revision: 1 }], page: 1, totalPages: 1, total: 1 } }),
}));
const assignment = { _id: "a", title: "Task", published: true, closed: false, maxScore: 20 };
const pending = { _id: "s", revision: 1, attemptCount: 1, status: "submitted", attempts: [{ text: "Answer", submittedAt: "2026-11-04" }] };
beforeEach(() => { vi.clearAllMocks(); detail.mockReturnValue({ currentData: { submission: pending } }); });
const renderStudent = submission => render(<RouterProvider router={createMemoryRouter([{ path: "/", element: <><Link to="/other">Other page</Link><StudentSubmission assignment={assignment} courseId="c" submission={submission} onReload={vi.fn()}/></> }, { path: "/other", element: <p>Destination</p> }])}/>);
describe("assignment recovery and review", () => {
  it("retains an answer after a failed request and guards navigation", async () => {
    send.mockReturnValue({ unwrap: () => Promise.reject({ status: 503 }) });
    renderStudent(null);
    fireEvent.change(screen.getByLabelText("Your answer"), { target: { value: "My unsent work" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit assignment" }));
    await screen.findByText("The request failed. Your input is preserved; try again.");
    expect(screen.getByLabelText("Your answer")).toHaveValue("My unsent work");
    fireEvent.click(screen.getByRole("link", { name: "Other page" }));
    await screen.findByRole("heading", { name: "Unsent answer" });
    fireEvent.click(screen.getByRole("button", { name: "Keep writing" }));
    expect(screen.getByLabelText("Your answer")).toHaveValue("My unsent work");
    expect(screen.getByRole("button", { name: "Refresh result" })).toBeDisabled();
  });
  it("blocks a new version for pending work", () => {
    renderStudent(pending);
    expect(screen.queryByLabelText("Your answer")).not.toBeInTheDocument();
    expect(screen.getByText("Answer")).toBeVisible();
  });
  it("allows zero points, rejects out-of-range grades and preserves feedback on conflict", async () => {
    review.mockReturnValue({ unwrap: () => Promise.reject({ data: { code: "STALE_SUBMISSION" } }) });
    render(<MemoryRouter><AssignmentReviews assignment={assignment} courseId="c"/></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "View and review" }));
    const score = screen.getByLabelText("Score / 20");
    fireEvent.change(score, { target: { value: "21" } });
    expect(screen.getByRole("button", { name: "Save grade" })).toBeDisabled();
    fireEvent.change(score, { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Teacher feedback"), { target: { value: "Review the example" } });
    fireEvent.click(screen.getByRole("button", { name: "Save grade" }));
    await screen.findByText("The submission changed or was already saved. Reload before trying again.");
    expect(review).toHaveBeenCalledWith(expect.objectContaining({ score: 0, revision: 1, feedback: "Review the example" }));
    expect(screen.getByLabelText("Teacher feedback")).toHaveValue("Review the example");
  });
  it("keeps rubric fields locked while permitting deadline changes after a submission", () => {
    render(<AssignmentForm courseId="c" assignment={{ ...assignment, instructions: "Explain", submissionCount: 1 }}/>);
    expect(screen.getByLabelText("Maximum score")).toBeDisabled();
    expect(screen.getByLabelText("Instructions")).toBeDisabled();
    expect(screen.getByLabelText("Publish to students")).toBeDisabled();
    expect(screen.getByLabelText("Due date in your local time")).toBeEnabled();
  });
  it("localizes review notifications without rewriting unknown messages", () => {
    expect(notificationText({ type: "assignment-review", message: "Your assignment has been graded." }, "ar")).toContain("تم تصحيح");
    expect(notificationText({ type: "assignment-review", message: "Your assignment needs a new submission." }, "ar")).toContain("إعادة التسليم");
    expect(notificationText({ type: "assignment-review", message: "Custom message" }, "ar")).toBe("Custom message");
  });
});
