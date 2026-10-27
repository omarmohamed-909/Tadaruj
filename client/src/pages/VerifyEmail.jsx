import PageSkeleton from "@/components/PageSkeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useVerifyEmailMutation } from "@/features/api/authApi";
import { AlertCircle, CheckCircle2, MailCheck } from "lucide-react";
import React from "react";
import { Link, useParams } from "react-router-dom";

const VerifyEmail = () => {
  const { token } = useParams();
  const [verifyEmail] = useVerifyEmailMutation();
  const [status, setStatus] = React.useState("loading");
  const [message, setMessage] = React.useState("Verifying your email...");

  React.useEffect(() => {
    let isMounted = true;

    const verify = async () => {
      if (!token) {
        if (isMounted) {
          setStatus("error");
          setMessage("Verification token is missing.");
        }
        return;
      }

      try {
        const response = await verifyEmail(token).unwrap();

        if (!isMounted) {
          return;
        }

        setStatus("success");
        setMessage(response?.message || "Email verified successfully. You can log in now.");
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStatus("error");
        setMessage(error?.data?.message || "Verification link is invalid or expired.");
      }
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [token, verifyEmail]);

  if (status === "loading") {
    return <PageSkeleton variant="form" />;
  }

  const isSuccess = status === "success";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-7xl items-center justify-center px-4 py-10 md:px-8">
      <Card className="w-full max-w-[520px] rounded-[30px] border border-slate-200/80 bg-white/95 shadow-[0_28px_80px_-40px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950/85">
        <CardHeader className="space-y-3">
          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
              isSuccess
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {isSuccess ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {isSuccess ? "Verified" : "Verification failed"}
          </div>
          <CardTitle className="text-2xl">
            {isSuccess ? "Email verified" : "Could not verify email"}
          </CardTitle>
          <CardDescription className="text-sm leading-6">{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 rounded-2xl p-2 ${
                  isSuccess
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                }`}
              >
                <MailCheck className="h-5 w-5" />
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                {isSuccess
                  ? "Your account is active now. You can log in and continue normally."
                  : "Request a new verification email from the verification notice page or sign up/login again with the same address."}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button
            asChild
            className="h-12 rounded-2xl bg-blue-600 text-base font-semibold hover:bg-blue-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
          >
            <Link to="/login?mode=login">Go to login</Link>
          </Button>
          {!isSuccess && (
            <Button asChild variant="outline" className="h-12 rounded-2xl">
              <Link to="/verify-email-notice">Open verification help</Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerifyEmail;
