import { describe, it, expect } from "vitest";
import { validateCurriculum, canonicalLectureOrder } from "../utils/curriculum.js";
const body = () => ({ revision: 0, unassignedLectureIds: ["a"], units: [{ title: " Motion ", lectureIds: ["c", "b"] }] });
describe("curriculum validation", () => {
  it("preserves each lesson once and normalizes unit titles", () => {
    expect(validateCurriculum(body(), ["a", "b", "c"])).toEqual({ units: [{ title: "Motion", lectureIds: ["c", "b"] }], lectures: ["a", "c", "b"] });
  });
  it.each([
    { ...body(), unassignedLectureIds: ["a", "b"] },
    { ...body(), unassignedLectureIds: [] },
    { ...body(), unassignedLectureIds: ["foreign"] },
    { ...body(), units: [{ title: " ", lectureIds: ["b", "c"] }] },
    { ...body(), revision: -1 },
    null,
  ])("rejects invalid, missing, foreign or repeated content", input => {
    expect(validateCurriculum(input, ["a", "b", "c"])).toBeNull();
  });
  it("keeps newly created unassigned lessons before organized units", () => {
    expect(canonicalLectureOrder(["a", "b", "new"], [{ lectureIds: ["b", "gone"] }])).toEqual(["a", "new", "b"]);
  });
});
