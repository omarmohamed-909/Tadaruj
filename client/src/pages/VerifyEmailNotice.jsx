import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useResendVerificationEmailMutation } from "@/features/api/authApi";
import { ArrowLeft, MailCheck, ShieldCheck } from "lucide-react";
import BrandedLoader from "@/components/BrandedLoader";
import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/components/languageContext";

const messages = {
  en: {
    label: "Email verification", title: "Verify your email address",
    body: "Activate your account before signing in.",
    sent: "Verification email sent to", failed: "Verification email could not be sent",
    unknown: "Email address to verify",
    failedBody: "Your account was created, but email delivery failed. Request another email or contact support if this continues.",
    missing: "Open this page from signup or login with your email.",
    inbox: "1. Open your inbox and check spam.", link: "2. Click the verification link.",
    login: "3. After verification, log in normally.",
    local: "Local development shortcut", localBody: "For local testing only. This shortcut is not available on the deployed platform.",
    open: "Open verification page", resend: "Resend verification email", wait: "Please wait",
    back: "Back to login", missingEmail: "Email is missing.", resendError: "Failed to resend verification email.",
  },
  ar: {
    label: "تفعيل البريد الإلكتروني", title: "فعّل بريدك الإلكتروني",
    body: "فعّل حسابك قبل تسجيل الدخول.",
    sent: "تم إرسال رسالة التفعيل إلى", failed: "تعذّر إرسال رسالة التفعيل",
    unknown: "البريد الإلكتروني المطلوب تفعيله",
    failedBody: "حسابك اتعمل، لكن إرسال البريد ما نجحش. اطلب رسالة جديدة أو تواصل مع الدعم لو المشكلة استمرت.",
    missing: "افتح الصفحة من التسجيل أو الدخول ببريدك الإلكتروني.",
    inbox: "١. افتح بريدك وراجع الرسائل غير المرغوب فيها.", link: "٢. اضغط على رابط التفعيل.",
    login: "٣. بعد التفعيل، سجّل دخولك بشكل طبيعي.",
    local: "اختصار للتجربة المحلية", localBody: "للاختبار المحلي فقط. الاختصار ده مش متاح على المنصة المنشورة.",
    open: "افتح صفحة التفعيل", resend: "إعادة إرسال رسالة التفعيل", wait: "انتظر لحظة",
    back: "رجوع لتسجيل الدخول", missingEmail: "البريد الإلكتروني غير موجود.", resendError: "تعذّرت إعادة إرسال رسالة التفعيل.",
  },
};

const VerifyEmailNotice = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const { language } = useLanguage();
  const copy = messages[language] || messages.en;
  const [emailSent, setEmailSent] = useState(location.state?.emailSent ?? null);
  const [verificationPath, setVerificationPath] = useState(location.state?.verificationPath || "");
  const [resendVerificationEmail, { isLoading }] = useResendVerificationEmailMutation();
  const localPath = import.meta.env.DEV
    && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
    && /^\/verify-email\/[A-Za-z0-9_.-]+$/.test(verificationPath)
    ? verificationPath : "";

  const handleResend = async () => {
    if (!email) { toast.error(copy.missingEmail); return; }
    try {
      const response = await resendVerificationEmail(email).unwrap();
      setVerificationPath(response?.verificationPath || "");
      const sent = response?.emailSent === true;
      setEmailSent(sent);
      if (sent) toast.success(copy.sent);
      else toast.error(copy.failed);
    } catch (error) {
      toast.error(error?.data?.message || copy.resendError);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f4f7f5] px-4 py-10 dark:bg-[#0d292b]">
      <Card className="w-full max-w-[520px] rounded-[30px] border-[#c8ddd3] bg-white dark:border-[#2a5552] dark:bg-[#102c2f]">
        <CardHeader className="space-y-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#126252] dark:text-teal-200"><ShieldCheck className="h-4 w-4" />{copy.label}</p>
          <CardTitle className="text-2xl">{copy.title}</CardTitle>
          <CardDescription>{copy.body}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-[#c8ddd3] bg-[#f4f8f5] p-4 dark:border-[#2a5552] dark:bg-[#15383a]">
            <MailCheck className="mt-1 h-5 w-5 shrink-0 text-[#126252] dark:text-teal-200" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{emailSent === true ? copy.sent : emailSent === false ? copy.failed : copy.unknown}</p>
              <p dir="ltr" className="mt-1 break-all text-sm text-slate-600 dark:text-slate-300">{email || copy.missing}</p>
            </div>
          </div>
          {emailSent === false && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">{copy.failedBody}</p>}
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300"><p>{copy.inbox}</p><p>{copy.link}</p><p>{copy.login}</p></div>
          {localPath && (
            <div className="rounded-2xl border border-[#c8ddd3] p-4 dark:border-[#2a5552]">
              <p className="text-sm font-semibold">{copy.local}</p>
              <p className="mt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">{copy.localBody}</p>
              <Button asChild variant="outline" className="mt-3"><Link to={localPath}>{copy.open}</Link></Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-3">
          <Button disabled={isLoading || !email} onClick={handleResend} className="h-12 rounded-2xl bg-[#126252] text-white hover:bg-[#0b4c3f] dark:bg-teal-200 dark:text-[#12383a] dark:hover:bg-teal-100">
            {isLoading ? <><BrandedLoader variant="tiny" />{copy.wait}</> : copy.resend}
          </Button>
          <Link to="/login?mode=login" className="inline-flex items-center justify-center gap-2 text-sm"><ArrowLeft className="h-4 w-4 rtl:rotate-180" />{copy.back}</Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerifyEmailNotice;
