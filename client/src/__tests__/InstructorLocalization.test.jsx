import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "../components/LanguageProvider";
import { useLanguage } from "../components/languageContext";
import AddCourse from "../pages/admin/course/AddCourse";
import { notificationText } from "../lib/notificationText";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("../features/api/courseApi", () => ({ useCreateCourseMutation: () => [create, {}] }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
function SwitchLanguage() {
  const { language, setLanguage } = useLanguage();
  return <button onClick={() => setLanguage(language === "ar" ? "en" : "ar")}>Switch language</button>;
}
beforeEach(() => { localStorage.setItem("tadaruj_language", "ar"); create.mockReset(); create.mockReturnValue({ unwrap: () => Promise.resolve({}) }); });

it("preserves instructor content and request values when the interface language changes", async () => {
  const user = userEvent.setup();
  render(<LanguageProvider><MemoryRouter initialEntries={["/instructor/course/create"]}><SwitchLanguage /><Routes>
    <Route path="/instructor/course/create" element={<AddCourse />} />
    <Route path="/instructor/course" element={<h1>Course destination</h1>} />
  </Routes></MemoryRouter></LanguageProvider>);
  fireEvent.change(screen.getByLabelText("العنوان"), { target: { value: " Biology basics " } });
  fireEvent.change(screen.getByLabelText("المادة"), { target: { value: " Science " } });
  await user.click(screen.getByRole("button", { name: "Switch language" }));
  expect(screen.getByLabelText("Title")).toHaveValue(" Biology basics ");
  await user.click(screen.getByRole("button", { name: "Create" }));
  expect(create).toHaveBeenCalledWith({ courseTitle: "Biology basics", subject: "Science", gradeLevel: "" });
  expect(await screen.findByRole("heading", { name: "Course destination" })).toBeInTheDocument();
});

it("localizes system notifications while keeping course names and user messages intact", () => {
  const order = { type: "manual-order-approved", message: "Your payment for Biology basics was confirmed. Course access is now available." };
  expect(notificationText(order, "ar")).toBe("تم تأكيد دفع كورس Biology basics. الكورس متاح ليك دلوقتي.");
  expect(notificationText(order, "en")).toBe(order.message);
  expect(notificationText({ type: "unknown", message: "An instructor's own message" }, "ar")).toBe("An instructor's own message");
});
