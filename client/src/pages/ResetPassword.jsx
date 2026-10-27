import { useUiText, useFeedbackText } from "@/components/useUiText";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPasswordMutation } from "@/features/api/authApi";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import BrandedLoader from "@/components/BrandedLoader";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const ResetPassword = () => {
  const feedback = useFeedbackText();
  const ui = useUiText();
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLoading) return;
    if (!password || !confirmPassword) {
      toast.error(ui("Please fill in all password fields."));
      return;
    }

    if (password.length < 8) {
      toast.error(ui("Password must be at least 8 characters."));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(ui("Passwords do not match."));
      return;
    }

    try {
      const response = await resetPassword({ token, password }).unwrap();
      toast.success(feedback(response?.message || ui("Password reset successfully."), ui("Password reset successfully.")));
      navigate("/login");
    } catch (error) {
      toast.error(feedback(error?.data?.message || ui("Failed to reset password."), ui("Failed to reset password.")));
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-7xl items-center justify-center px-4 py-10 md:px-8">
      <Card className="w-full max-w-[480px] rounded-[30px] border border-border bg-card text-card-foreground shadow-sm">
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <CardHeader className="space-y-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent-foreground">
            <LockKeyhole className="h-3.5 w-3.5" />{" "}{ui("Reset password")}{" "}</div>
          <CardTitle role="heading" aria-level={1} className="text-2xl">{ui("Create a new password")}</CardTitle>
          <CardDescription className="text-sm leading-6">{" "}{ui("Choose a new password for your account and continue to login.")}{" "}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3">
            <Label htmlFor="reset-password">{ui("New password")}</Label>
            <div className="relative">
              <Input
                id="reset-password"
                name="password"
                autoComplete="new-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={ui("Enter a new password")}
                className="h-12 rounded-2xl border-input bg-muted pr-12"
              />
              <button
                type="button"
                aria-label={showPassword ? ui("Hide password") : ui("Show password")}
                aria-controls="reset-password"
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="reset-password-confirm">{ui("Confirm password")}</Label>
            <div className="relative">
              <Input
                id="reset-password-confirm"
                name="confirmPassword"
                autoComplete="new-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={ui("Re-enter the new password")}
                className="h-12 rounded-2xl border-input bg-muted pr-12"
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? ui("Hide password") : ui("Show password")}
                aria-controls="reset-password-confirm"
                aria-pressed={showConfirmPassword}
                onClick={() => setShowConfirmPassword((current) => !current)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={isLoading}
            className="h-12 w-full rounded-2xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <BrandedLoader variant="tiny" className="mr-2" />{" "}{ui("Please wait")}{" "}</>
            ) : (
              ui("Reset password")
            )}
          </Button>
        </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
