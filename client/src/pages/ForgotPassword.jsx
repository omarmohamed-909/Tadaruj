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
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = React.useState("");
  const [resetLink, setResetLink] = React.useState("");
  const [resetPath, setResetPath] = React.useState("");
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      const response = await forgotPassword(email).unwrap();
      setResetLink(response?.resetUrl || "");
      setResetPath(response?.resetPath || "");
      toast.success(response?.message || "Reset link generated.");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to generate reset link.");
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-7xl items-center justify-center px-4 py-10 md:px-8">
      <Card className="w-full max-w-[480px] rounded-[30px] border border-border bg-card text-card-foreground shadow-sm">
        <CardHeader className="space-y-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Recovery
          </div>
          <CardTitle className="text-2xl">Forgot password</CardTitle>
          <CardDescription className="text-sm leading-6">
            Enter your account email to generate a password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Eg. omar@gmail.com"
                className="h-12 rounded-2xl border-input bg-muted pl-11"
              />
            </div>
          </div>

          {resetLink && (
            <div className="rounded-3xl border border-border bg-accent p-4">
              <p className="text-sm font-semibold text-accent-foreground">
                Reset link ready
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Local development mode returns the reset link directly.
              </p>
              {resetLink && (
                <p className="mt-2 break-all text-xs text-muted-foreground">
                  {resetLink}
                </p>
              )}
              <Button
                type="button"
                onClick={() => {
                  if (resetPath) {
                    navigate(resetPath);
                    return;
                  }

                  if (resetLink) {
                    window.location.assign(resetLink);
                  }
                }}
                className="mt-4 h-11 rounded-2xl bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Open reset page
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button
            type="button"
            disabled={isLoading}
            onClick={handleSubmit}
            className="h-12 rounded-2xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <BrandedLoader variant="tiny" className="mr-2" />
                Please wait
              </>
            ) : (
              "Generate reset link"
            )}
          </Button>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ForgotPassword;
