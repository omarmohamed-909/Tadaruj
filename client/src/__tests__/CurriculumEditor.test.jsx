import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import CurriculumEditor from "../pages/admin/lecture/CurriculumEditor";
import { groupCurriculum } from "../lib/curriculum";
const { save, dirty } = vi.hoisted(() => ({ save: vi.fn(), dirty: vi.fn() }));
vi.mock("../features/api/courseApi", () => ({ useUpdateCurriculumMutation: () => [save, { isLoading: false }] }));
vi.mock("../components/languageContext", () => ({ useLanguage: () => ({ language: "en" }) }));
const data = { revision: 2, lectures: [{ _id: "a", lectureTitle: "Introduction" }, { _id: "b", lectureTitle: "Motion" }], units: [{ _id: "u1", title: "Basics", lectureIds: ["b"] }] };
const show = () => render(<RouterProvider router={createMemoryRouter([{ path: "*", element: <CurriculumEditor courseId="c1" data={data} onDirtyChange={dirty} onReload={async () => data} /> }])} />);
beforeEach(() => { save.mockReset(); save.mockReturnValue({ unwrap: () => Promise.resolve({}) }); });
describe("course structure editor", () => {
  it("removes a unit without deleting its lessons and saves the complete ordering", async () => {
    show(); fireEvent.click(screen.getByRole("button", { name: "Remove unit" }));
    expect(screen.getByText("Motion")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Save structure" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ courseId: "c1", revision: 2, units: [], unassignedLectureIds: ["a", "b"] }));
  });
  it("moves lessons between units, and prevents overwriting a concurrent save", async () => {
    save.mockReturnValue({ unwrap: () => Promise.reject({ status: 409 }) });
    show(); fireEvent.change(screen.getByLabelText("Unit for Introduction"), { target: { value: "u1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save structure" }));
    await screen.findByText(/Content changed elsewhere/);
    expect(screen.getByRole("button", { name: "Save structure" })).toBeDisabled();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ units: [{ _id: "u1", title: "Basics", lectureIds: ["b", "a"] }], unassignedLectureIds: [] }));
  });
  it("asks before navigating away from an unsaved lesson move", async () => {
    show(); fireEvent.change(screen.getByLabelText("Unit for Introduction"), { target: { value: "u1" } });
    fireEvent.click(screen.getAllByRole("link", { name: "Edit lesson" })[0]);
    expect(await screen.findByRole("dialog")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save structure" })).toBeEnabled();
  });
  it("keeps the canonical lesson numbers when grouping and ignores stale references", () => {
    const groups = groupCurriculum(data.lectures, [{ _id: "u1", title: "Basics", lectureIds: ["b", "gone", "b"] }]);
    expect(groups.map(group => group.lessons.map(item => item.index))).toEqual([[0], [1]]);
  });
});
