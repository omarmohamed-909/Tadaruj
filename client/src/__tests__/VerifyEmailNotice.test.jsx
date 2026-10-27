import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageContext } from "../components/languageContext";
import VerifyEmailNotice from "../pages/VerifyEmailNotice";

const { resend, error } = vi.hoisted(() => ({ resend: vi.fn(), error: vi.fn() }));
vi.mock("../features/api/authApi", () => ({ useResendVerificationEmailMutation: () => [resend, { isLoading: false }] }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error } }));
const show = (state = {}, language = "en") => render(
  <LanguageContext.Provider value={{ language }}>
    <MemoryRouter initialEntries={[{ pathname: "/verify-email-notice", search: "?email=student@example.test", state }]}><VerifyEmailNotice /></MemoryRouter>
  </LanguageContext.Provider>
);
beforeEach(() => vi.clearAllMocks());
describe("verification delivery status", () => {
  it("does not claim mail was sent if delivery failed", () => {
    show({ emailSent: false });
    expect(screen.getByRole("alert")).toHaveTextContent("email delivery failed");
    expect(screen.queryByText("Verification email sent to")).not.toBeInTheDocument();
  });
  it("shows sent only after confirmed delivery", () => {
    show({ emailSent: true });
    expect(screen.getByText("Verification email sent to")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("does not assume delivery when opened without navigation state", () => {
    show();
    expect(screen.getByText("Email address to verify")).toBeInTheDocument();
    expect(screen.queryByText("Verification email sent to")).not.toBeInTheDocument();
  });
  it("updates failed delivery after resending rather than showing success", async () => {
    resend.mockReturnValue({ unwrap: () => Promise.resolve({ emailSent: false }) });
    show();
    fireEvent.click(screen.getByRole("button", { name: "Resend verification email" }));
    await waitFor(() => expect(error).toHaveBeenCalledWith("Verification email could not be sent"));
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
  it("does not expose an external verification shortcut", () => {
    show({ verificationPath: "https://example.com/fake" });
    expect(screen.queryByRole("link", { name: "Open verification page" })).not.toBeInTheDocument();
  });
  it("shows delivery errors in Arabic", () => {
    show({ emailSent: false }, "ar");
    expect(screen.getByText("تعذّر إرسال رسالة التفعيل")).toBeInTheDocument();
  });
});
