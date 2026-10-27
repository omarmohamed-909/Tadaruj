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
import { useForgotPasswordMutation } from "@/features/api/authApi";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import BrandedLoader from "@/components/BrandedLoader";
import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const ForgotPassword = () => {
  const feedback = useFeedbackText();
  const ui = useUiText();
  const [email, setEmail] = React.useState("");
  const [requested, setRequested] = React.useState(false);
  const [resetPath, setResetPath] = React.useState("");
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const localResetPath = import.meta.env.DEV
    && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
    && /^\/reset-password\/[A-Za-z0-9_.-]+$/.test(resetPath) ? resetPath : "";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isLoading) return;
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      toast.error(ui("Enter a valid email address."));
      return;
    }
    try {
      const response = await forgotPassword(normalizedEmail).unwrap();
      setResetPath(response?.resetPath || "");
      setRequested(true);
      toast.success(ui("If an account exists for this email, a reset link will be sent."));
    } catch (error) {
      toast.error(feedback(error?.data?.message || ui("Failed to generate reset link."), ui("Failed to generate reset link.")));
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-7xl items-center justify-center px-4 py-10 md:px-8">
      <Card className="w-full max-w-[480px] rounded-[30px] border border-border bg-card text-card-foreground shadow-sm">
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <CardHeader className="space-y-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />{" "}{ui("Recovery")}{" "}</div>
          <CardTitle role="heading" aria-level={1} className="text-2xl">{ui("Forgot password")}</CardTitle>
          <CardDescription className="text-sm leading-6">{" "}{ui("Enter your account email to generate a password reset link.")}{" "}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3">
            <Label htmlFor="recovery-email">{ui("Email")}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="recovery-email"
                name="email"
                dir="ltr"
                autoComplete="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="h-12 rounded-2xl border-input bg-muted pl-11"
              />
            </div>
          </div>

          {requested && <p role="status" className="rounded-xl border border-border bg-accent p-4 text-sm leading-7 text-accent-foreground">{ui("If an account exists for this email, a reset link will be sent.")}</p>}
          {localResetPath && (
            <div className="rounded-3xl border border-border bg-accent p-4">
              <p className="text-sm font-semibold text-accent-foreground">{" "}{ui("Reset link ready")}{" "}</p>
              <p className="mt-1 text-sm text-muted-foreground">{" "}{ui("Local development mode returns the reset link directly.")}{" "}</p>
              <Button
                asChild
                className="mt-4 h-11 rounded-2xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
              ><Link to={localResetPath}>{ui("Open reset page")}</Link></Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button
            type="submit"
            disabled={isLoading}
            className="h-12 rounded-2xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <BrandedLoader variant="tiny" className="mr-2" />{" "}{ui("Please wait")}{" "}</>
            ) : (
              ui("Generate reset link")
            )}
          </Button>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />{" "}{ui("Back to login")}{" "}</Link>
        </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ForgotPassword;
