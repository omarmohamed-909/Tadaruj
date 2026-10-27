import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import GoogleSignIn from "../components/GoogleSignIn";
import { LanguageContext } from "../components/languageContext";

const mocks = vi.hoisted(() => ({ config: { enabled: true }, configError: false, start: vi.fn(), signIn: vi.fn(), load: vi.fn(), initialize: vi.fn(), renderButton: vi.fn(), callback: null }));
vi.mock("../features/api/authApi", () => ({
  useGetGoogleAuthConfigQuery: () => ({ data: mocks.config, isError: mocks.configError, refetch: vi.fn() }),
  useStartGoogleSignInMutation: () => [mocks.start],
  useGoogleSignInMutation: () => [mocks.signIn],
}));
vi.mock("../lib/googleIdentity", () => ({ loadGoogleIdentity: mocks.load }));

const nonce = "a".repeat(64);
const success = vi.fn(), verification = vi.fn();
const renderGoogle = (props = {}, language = "en") => render(<LanguageContext.Provider value={{ language, t: (key) => key }}><GoogleSignIn onSuccess={success} onVerification={verification} {...props} /></LanguageContext.Provider>);
const sendCredential = async () => {
  await waitFor(() => expect(mocks.initialize).toHaveBeenCalled());
  await act(async () => { await mocks.callback({ credential: "signed-google-token" }); });
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.config = { enabled: true }; mocks.configError = false;
  mocks.start.mockReturnValue({ unwrap: () => Promise.resolve({ nonce, clientId: "123-test.apps.googleusercontent.com" }) });
  mocks.signIn.mockReturnValue({ unwrap: () => Promise.resolve({ token: "app-session", user: { name: "Student" } }) });
  mocks.initialize.mockImplementation((options) => { mocks.callback = options.callback; });
  mocks.renderButton.mockImplementation((target) => {
    const button = document.createElement("button"); button.textContent = "Continue with Google"; target.appendChild(button);
  });
  mocks.load.mockResolvedValue({ initialize: mocks.initialize, renderButton: mocks.renderButton });
});

describe("Google sign-in", () => {
  it("does not show a non-working button or load Google's script when disabled", () => {
    mocks.config = { enabled: false }; renderGoogle();
    expect(screen.queryByText("googleOrEmail")).not.toBeInTheDocument();
    expect(mocks.load).not.toHaveBeenCalled();
  });
  it("uses the official button, a server nonce and an explicit account chooser", async () => {
    renderGoogle(); await sendCredential();
    expect(mocks.initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: "123-test.apps.googleusercontent.com", nonce, auto_select: false, button_auto_select: false, ux_mode: "popup" }));
    expect(mocks.signIn).toHaveBeenCalledWith({ credential: "signed-google-token", nonce });
    await waitFor(() => expect(success).toHaveBeenCalledOnce());
  });
  it("renders the button in Arabic without reissuing the challenge", async () => {
    renderGoogle({}, "ar"); await waitFor(() => expect(mocks.renderButton).toHaveBeenCalled());
    expect(mocks.renderButton).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ locale: "ar", text: "continue_with" }));
    expect(mocks.start).toHaveBeenCalledTimes(1);
  });
  it("routes third-party mailboxes to verification without treating them as signed in", async () => {
    const details = { requiresEmailVerification: true, email: "student@example.test", emailSent: false };
    mocks.signIn.mockReturnValue({ unwrap: () => Promise.resolve(details) }); renderGoogle(); await sendCredential();
    await waitFor(() => expect(verification).toHaveBeenCalledWith(details));
    expect(success).not.toHaveBeenCalled();
  });
  it("requires explicit password confirmation before connecting an existing account", async () => {
    mocks.signIn.mockReturnValueOnce({ unwrap: () => Promise.reject({ data: { code: "GOOGLE_LINK_REQUIRED" } }) })
      .mockReturnValueOnce({ unwrap: () => Promise.resolve({ token: "app-session" }) });
    renderGoogle(); await sendCredential();
    const input = await screen.findByLabelText("googleExistingPassword");
    expect(success).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "googleLinkConfirm" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "existing-password" } });
    fireEvent.submit(input.closest("form"));
    await waitFor(() => expect(success).toHaveBeenCalledOnce());
    expect(mocks.signIn).toHaveBeenLastCalledWith({ credential: "signed-google-token", nonce, password: "existing-password" });
    expect(window.localStorage.getItem("google-credential")).toBeNull();
  });
  it("shows translated password errors and allows another confirmation", async () => {
    mocks.signIn.mockReturnValueOnce({ unwrap: () => Promise.reject({ data: { code: "GOOGLE_LINK_REQUIRED" } }) })
      .mockReturnValueOnce({ unwrap: () => Promise.reject({ data: { code: "GOOGLE_LINK_PASSWORD_INVALID" } }) });
    renderGoogle(); await sendCredential();
    const input = await screen.findByLabelText("googleExistingPassword");
    fireEvent.change(input, { target: { value: "wrong" } }); fireEvent.submit(input.closest("form"));
    expect(await screen.findByText("googleWrongPassword")).toBeInTheDocument();
    expect(screen.getByLabelText("googleExistingPassword")).toBeInTheDocument();
    expect(success).not.toHaveBeenCalled();
  });
  it("clears a retained credential when cancelling the link", async () => {
    mocks.signIn.mockReturnValueOnce({ unwrap: () => Promise.reject({ data: { code: "GOOGLE_LINK_REQUIRED" } }) });
    renderGoogle(); await sendCredential();
    fireEvent.click(await screen.findByRole("button", { name: "googleCancel" }));
    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(2));
    expect(screen.queryByLabelText("googleExistingPassword")).not.toBeInTheDocument();
  });
  it("offers a fresh attempt when the nonce expired", async () => {
    mocks.signIn.mockReturnValueOnce({ unwrap: () => Promise.reject({ data: { code: "GOOGLE_EXPIRED" } }) });
    renderGoogle(); await sendCredential();
    expect(await screen.findByText("googleExpired")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "retry" }));
    await waitFor(() => expect(mocks.start).toHaveBeenCalledTimes(2));
  });
  it("keeps password authentication available when the Google SDK fails", async () => {
    mocks.load.mockRejectedValue(new Error("offline")); renderGoogle();
    expect(await screen.findByText("googleUnavailable")).toBeInTheDocument();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(success).not.toHaveBeenCalled();
  });
  it("does not submit a Google credential while another authentication request is running", async () => {
    renderGoogle({ disabled: true }); await sendCredential();
    expect(mocks.signIn).not.toHaveBeenCalled();
  });
});
