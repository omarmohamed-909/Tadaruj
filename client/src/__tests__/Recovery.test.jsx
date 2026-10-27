import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LanguageProvider } from "../components/LanguageProvider";
import { useLanguage } from "../components/languageContext";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import VerifyEmail from "../pages/VerifyEmail";

const { forgot, reset, verify, error } = vi.hoisted(() => ({ forgot: vi.fn(), reset: vi.fn(), verify: vi.fn(), error: vi.fn() }));
vi.mock("../features/api/authApi", () => ({
  useForgotPasswordMutation: () => [forgot, {}],
  useResetPasswordMutation: () => [reset, {}],
  useVerifyEmailMutation: () => [verify, {}],
}));
vi.mock("sonner", () => ({ toast: { error, success: vi.fn() } }));
function SwitchLanguage() {
  const { language, setLanguage } = useLanguage();
  return <button onClick={() => setLanguage(language === "ar" ? "en" : "ar")}>Switch language</button>;
}
function show(path, page) {
  return render(<LanguageProvider><MemoryRouter initialEntries={[path]}><SwitchLanguage /><Routes>
    <Route path={path.startsWith("/reset-password") ? "/reset-password/:token" : path.startsWith("/verify-email") ? "/verify-email/:token" : path} element={page} />
    <Route path="/login" element={<h1>Login destination</h1>} />
  </Routes></MemoryRouter></LanguageProvider>);
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("tadaruj_language", "ar");
  forgot.mockReturnValue({ unwrap: () => Promise.resolve({ message: "If an account exists, email was sent." }) });
  reset.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  verify.mockReturnValue({ unwrap: () => Promise.resolve({ message: "Email verified successfully. You can log in now." }) });
});

describe("localized account recovery", () => {
  it("blocks invalid email and submits a trimmed address with Enter", async () => {
    const user = userEvent.setup();
    show("/forgot-password", <ForgotPassword />);
    const email = screen.getByLabelText("البريد الإلكتروني");
    await user.type(email, "invalid{Enter}");
    expect(forgot).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("اكتب بريد إلكتروني صحيح.");
    await user.clear(email);
    await user.type(email, "student@example.test{Enter}");
    expect(forgot).toHaveBeenCalledWith("student@example.test");
    expect(await screen.findByRole("status")).toHaveTextContent("لو البريد ده مسجّل");
    expect(screen.queryByRole("link", { name: "افتح صفحة تغيير كلمة المرور" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Switch language" }));
    expect(screen.getByRole("heading", { name: "Forgot password" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("student@example.test");
    expect(forgot).toHaveBeenCalledTimes(1);
  });
  it("validates confirmation, labels visibility controls, and sends the reset token", async () => {
    const user = userEvent.setup();
    show("/reset-password/test-token", <ResetPassword />);
    const password = screen.getByLabelText("كلمة المرور الجديدة");
    const confirmation = screen.getByLabelText("تأكيد كلمة المرور");
    await user.type(password, "Test-password");
    await user.click(screen.getAllByRole("button", { name: "إظهار كلمة المرور" })[0]);
    expect(password).toHaveAttribute("type", "text");
    await user.type(confirmation, "Different-password{Enter}");
    expect(reset).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("كلمتا المرور مش متطابقتين.");
    await user.clear(confirmation);
    await user.type(confirmation, "Test-password{Enter}");
    expect(reset).toHaveBeenCalledWith({ token: "test-token", password: "Test-password" });
    expect(await screen.findByRole("heading", { name: "Login destination" })).toBeInTheDocument();
  });
  it("switches verification language without consuming the token a second time", async () => {
    const user = userEvent.setup();
    show("/verify-email/test-token", <VerifyEmail />);
    expect(await screen.findByRole("heading", { name: "تم تفعيل البريد" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Switch language" }));
    expect(screen.getByRole("heading", { name: "Email verified" })).toBeInTheDocument();
    expect(verify).toHaveBeenCalledTimes(1);
  });
});
