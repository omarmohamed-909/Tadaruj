import { describe, it, expect } from "vitest";
import { learningSummary } from "../utils/learningSummary.js";

describe("learning completion policy", () => {
  const lessons = [{ _id: "a", quizQuestions: [{}] }, { _id: "b", quizQuestions: [] }];
  it("does not complete an empty course or count deleted/duplicate lessons", () => {
    expect(learningSummary().completed).toBe(false);
    const summary = learningSummary(lessons, [{ lectureId: "old", viewed: true }, { lectureId: "b", viewed: true }, { lectureId: "b", viewed: true }]);
    expect(summary.percentage).toBe(50);
    expect(summary.completed).toBe(false);
  });
  it("requires viewing and a submitted quiz, without interpreting participation as passing", () => {
    const progress = lessons.map(item => ({ lectureId: item._id, viewed: true }));
    expect(learningSummary(lessons, progress).completed).toBe(false);
    expect(learningSummary(lessons, progress, [{ lectureId: "a", attemptsCount: 1, percentage: 0 }]).completed).toBe(true);
    expect(learningSummary(lessons, [], [{ lectureId: "a", attemptsCount: 1 }]).percentage).toBe(0);
  });
});
