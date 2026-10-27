import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LanguageContext } from "../components/languageContext";
import Login from "../pages/Login";

const { register, login, error } = vi.hoisted(() => ({ register: vi.fn(), login: vi.fn(), error: vi.fn() }));
vi.mock("../features/api/authApi", () => ({
  useRegisterUserMutation: () => [register, {}],
  useLoginUserMutation: () => [login, {}],
}));
vi.mock("sonner", () => ({ toast: { error, success: vi.fn() } }));
vi.mock("../components/GoogleSignIn", () => ({ default: () => null }));
const show = (mode = "login") => render(
  <LanguageContext.Provider value={{ t: (key) => key }}>
    <MemoryRouter initialEntries={[`/login?mode=${mode}`]}><Login /></MemoryRouter>
  </LanguageContext.Provider>
);
beforeEach(() => vi.clearAllMocks());

describe("authentication form behavior", () => {
  it("opens the login tab from the URL and sends entered credentials", () => {
    show();
    fireEvent.change(screen.getByPlaceholderText("EX omar@gmail.com"), { target: { value: "student@example.test" } });
    fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "Test-password" } });
    fireEvent.click(screen.getByRole("button", { name: "loginTab" }));
    expect(login).toHaveBeenCalledWith({ email: "student@example.test", password: "Test-password" });
  });
  it("blocks a signup password shorter than eight characters", () => {
    show("signup");
    fireEvent.change(screen.getByLabelText("name"), { target: { value: "Student" } });
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "student@example.test" } });
    fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "signupTab" }));
    expect(register).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("passwordMinLength");
  });
  it("blocks empty login fields before calling the API", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "loginTab" }));
    expect(login).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("authFieldsRequired");
  });
  it("blocks invalid signup email before calling the API", () => {
    show("signup");
    fireEvent.change(screen.getByPlaceholderText("namePlaceholder"), { target: { value: "Student" } });
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByPlaceholderText("passwordPlaceholder"), { target: { value: "Test-password" } });
    fireEvent.click(screen.getByRole("button", { name: "signupTab" }));
    expect(register).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("authInvalidEmail");
  });
  it("blocks invalid login email", () => {
    show();
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "Test-password" } });
    fireEvent.click(screen.getByRole("button", { name: "loginTab" }));
    expect(login).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("authInvalidEmail");
  });
  it("blocks whitespace-only signup names", () => {
    show("signup");
    fireEvent.change(screen.getByLabelText("name"), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "student@example.test" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "Test-password" } });
    fireEvent.click(screen.getByRole("button", { name: "signupTab" }));
    expect(register).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("authFieldsRequired");
  });
  it("submits valid signup with trimmed name and email without changing the password", () => {
    show("signup");
    fireEvent.change(screen.getByLabelText("name"), { target: { value: " Student " } });
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "student@example.test" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: " Test-password " } });
    fireEvent.click(screen.getByRole("button", { name: "signupTab" }));
    expect(register).toHaveBeenCalledWith({ name: "Student", email: "student@example.test", password: " Test-password " });
  });
  it("supports Enter to submit login", async () => {
    const user = userEvent.setup();
    show();
    await user.type(screen.getByLabelText("email"), "student@example.test");
    await user.type(screen.getByLabelText("password"), "Test-password{Enter}");
    expect(login).toHaveBeenCalledTimes(1);
  });
  it("gives the password visibility control a descriptive name", () => {
    show();
    expect(screen.getByLabelText("password")).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "showPassword" }));
    expect(screen.getByLabelText("password")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "hidePassword" })).toBeInTheDocument();
  });
});
