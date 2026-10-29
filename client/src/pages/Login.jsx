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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useLoginUserMutation,
  useRegisterUserMutation,
} from "@/features/api/authApi";
import {
  Eye,
  EyeOff,
  Mail,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import BrandedLoader from "@/components/BrandedLoader";
import GoogleSignIn from "@/components/GoogleSignIn";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/components/languageContext";
import { useFeedbackText } from "@/components/useUiText";
import { legalLabel, legalNavigation } from "@/lib/legalNavigation";

const Login = () => {
  const feedback = useFeedbackText();
  const { t, language } = useLanguage();
  const [signupInput, setSignupInput] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [loginInput, setLoginInput] = useState({ email: "", password: "" });
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [searchParams] = useSearchParams();

  const [
    registerUser,
    {
      data: registerData,
      error: registerError,
      isLoading: registerIsLoading,
      isSuccess: registerIsSuccess,
    },
  ] = useRegisterUserMutation();
  const [
    loginUser,
    {
      data: loginData,
      error: loginError,
      isLoading: loginIsLoading,
      isSuccess: loginIsSuccess,
    },
  ] = useLoginUserMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = typeof location.state?.from === "string" && location.state.from.startsWith("/") && !location.state.from.startsWith("//") ? location.state.from : "/";
  const [activeTab, setActiveTab] = useState(() => searchParams.get("mode") === "login" ? "login" : "signup");

  useEffect(() => {
    setActiveTab(searchParams.get("mode") === "login" ? "login" : "signup");
  }, [searchParams]);

  const changeInputHandeler = (e, type) => {
    const { name, value } = e.target;
    if (type === "signup") {
      setSignupInput({ ...signupInput, [name]: value });
    } else {
      setLoginInput({ ...loginInput, [name]: value });
    }
  };

  const handlerRegistration = async (type) => {
    if (googleBusy || (type === "signup" ? registerIsLoading : loginIsLoading)) return;
    const rawInput = type === "signup" ? signupInput : loginInput;
    const inputData = { ...rawInput, email: rawInput.email.trim() };
    if (type === "signup") inputData.name = rawInput.name.trim();
    if (!inputData.email || !inputData.password.trim() || (type === "signup" && !inputData.name)) {
      toast.error(t("authFieldsRequired"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputData.email)) {
      toast.error(t("authInvalidEmail"));
      return;
    }
    if (type === "signup") {
      if (inputData.password.length < 8) {
        toast.error(t("passwordMinLength"));
        return;
      }
    }
    const action = type === "signup" ? registerUser : loginUser;
    await action(inputData);
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };
  useEffect(() => {
    if (registerIsSuccess && registerData) {
      toast.success(feedback(registerData.message, t("signupSuccess")));
      navigate(`/verify-email-notice?email=${encodeURIComponent(registerData.email || signupInput.email)}`, { replace: true, state: { verificationPath: registerData.verificationPath, emailSent: registerData.emailSent } });
    }
    if (registerError) {
      toast.error(feedback(registerError.data?.message, t("signupFailed")));
    }
    if (loginIsSuccess && loginData) {
      toast.success(feedback(loginData.message, t("loginSuccess")));
      navigate(returnTo, { replace: true });
    }
    if (loginError) {
      const errorMessage = loginError.data?.message || t("loginFailed");
      toast.error(feedback(errorMessage, t("loginFailed")));
      if (loginError.status === 403 && /verify your email/i.test(errorMessage)) {
        navigate(`/verify-email-notice?email=${encodeURIComponent(loginInput.email)}`);
      }
    }
  }, [
    loginData,
    registerData,
    loginError,
    registerError,
    loginIsSuccess,
    registerIsSuccess,
    navigate,
    returnTo,
    loginInput.email,
    signupInput.email,
    t,
    feedback,
  ]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center bg-[#f4f7f5] px-4 py-10 md:px-8 dark:bg-[#0d292b]">
      <div className="flex w-full justify-center">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-[440px]">
            <TabsList className="grid h-12 w-full grid-cols-2 rounded-2xl bg-[#dcebe4] p-1 dark:bg-[#163b3c]">
            <TabsTrigger value="signup">{t("signupTab")}</TabsTrigger>
            <TabsTrigger value="login">{t("loginTab")}</TabsTrigger>
          </TabsList>
          <GoogleSignIn disabled={registerIsLoading || loginIsLoading} onBusyChange={setGoogleBusy}
            onSuccess={() => { toast.success(t("loginSuccess")); navigate(returnTo, { replace: true }); }}
            onVerification={(data) => navigate(`/verify-email-notice?email=${encodeURIComponent(data.email)}`, { replace: true, state: { verificationPath: data.verificationPath, emailSent: data.emailSent } })} />
          <TabsContent value="signup">
            <form noValidate onSubmit={(event) => { event.preventDefault(); handlerRegistration("signup"); }}>
            <Card className="rounded-[30px] border border-[#c8ddd3] bg-white/95 shadow-[0_28px_80px_-40px_rgba(18,56,58,0.35)] dark:border-[#2a5552] dark:bg-[#102c2f]/95">
              <CardHeader className="space-y-3 pb-2">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#dff5eb] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#126252] dark:bg-teal-400/10 dark:text-teal-300">
                  <UserRoundPlus className="h-3.5 w-3.5" />
                  {t("newAccount")}
                </div>
                <CardTitle className="text-2xl">{t("signupTitle")}</CardTitle>
                <CardDescription className="text-sm leading-6">
                  {t("signupBody")}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="signup-name">{t("name")}</Label>
                  <Input
                    id="signup-name"
                    autoComplete="name"
                    type="text"
                    name="name"
                    value={signupInput.name}
                    onChange={(e) => changeInputHandeler(e, "signup")}
                    placeholder={t("namePlaceholder")}
                    required
                    className="h-12 rounded-2xl border-[#c8ddd3] bg-[#f4f8f5] dark:border-[#2a5552] dark:bg-[#15383a]"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="signup-email">{t("email")}</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="signup-email"
                      autoComplete="email"
                      type="email"
                      name="email"
                      value={signupInput.email}
                      onChange={(e) => changeInputHandeler(e, "signup")}
                      placeholder="name@example.com"
                      required
                      className="h-12 rounded-2xl border-[#c8ddd3] bg-[#f4f8f5] pl-11 dark:border-[#2a5552] dark:bg-[#15383a]"
                    />
                  </div>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="signup-password">{t("password")}</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      autoComplete="new-password"
                      type={showSignupPassword ? "text" : "password"}
                      name="password"
                      value={signupInput.password}
                      placeholder={t("passwordPlaceholder")}
                      onChange={(e) => changeInputHandeler(e, "signup")}
                      required
                      className="h-12 rounded-2xl border-[#c8ddd3] bg-[#f4f8f5] pr-12 dark:border-[#2a5552] dark:bg-[#15383a]"
                    />
                    <button
                      type="button"
                      aria-label={t(showSignupPassword ? "hidePassword" : "showPassword")}
                      onClick={() => setShowSignupPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      {showSignupPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{t("passwordMinLength")}</p>
                </div>
              </CardContent>
              <CardFooter className="flex-col items-stretch gap-3">
                <Button
                  disabled={registerIsLoading || googleBusy}
                  type="submit"
                  className="h-12 rounded-2xl bg-[#12383a] text-base font-semibold text-white hover:bg-[#0b2528] dark:bg-teal-200 dark:text-[#12383a] dark:hover:bg-teal-100"
                >
                  {registerIsLoading ? (
                    <>
                      <BrandedLoader variant="tiny" className="mr-2" /> {t("pleaseWait")}
                    </>
                  ) : (
                    t("signupTab")
                  )}
                </Button>
                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  {t("signupNote")}
                </p>
              </CardFooter>
            </Card>
            </form>
          </TabsContent>
          <TabsContent value="login">
            <form noValidate onSubmit={(event) => { event.preventDefault(); handlerRegistration("login"); }}>
            <Card className="rounded-[30px] border border-[#c8ddd3] bg-white/95 shadow-[0_28px_80px_-40px_rgba(18,56,58,0.35)] dark:border-[#2a5552] dark:bg-[#102c2f]/95">
              <CardHeader className="space-y-3 pb-2">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#dff5eb] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#126252] dark:bg-teal-400/10 dark:text-teal-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t("welcomeBack")}
                </div>
                <CardTitle className="text-2xl">{t("loginTab")}</CardTitle>
                <CardDescription className="text-sm leading-6">
                  {t("loginBody")}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="login-email">{t("email")}</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="login-email"
                      autoComplete="email"
                      type="email"
                      name="email"
                      value={loginInput.email}
                      onChange={(e) => changeInputHandeler(e, "login")}
                      placeholder="EX omar@gmail.com"
                      required
                      className="h-12 rounded-2xl border-[#c8ddd3] bg-[#f4f8f5] pl-11 dark:border-[#2a5552] dark:bg-[#15383a]"
                    />
                  </div>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="login-password">{t("password")}</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      autoComplete="current-password"
                      type={showLoginPassword ? "text" : "password"}
                      name="password"
                      value={loginInput.password}
                      onChange={(e) => changeInputHandeler(e, "login")}
                      placeholder={t("passwordPlaceholder")}
                      required
                      className="h-12 rounded-2xl border-[#c8ddd3] bg-[#f4f8f5] pr-12 dark:border-[#2a5552] dark:bg-[#15383a]"
                    />
                    <button
                      type="button"
                      aria-label={t(showLoginPassword ? "hidePassword" : "showPassword")}
                      onClick={() => setShowLoginPassword((current) => !current)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm font-medium text-[#126252] transition-colors hover:text-[#0b2528] dark:text-teal-300 dark:hover:text-teal-200"
                    >
                      {t("forgotPassword")}
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col items-stretch gap-3">
                <Button
                  disabled={loginIsLoading || googleBusy}
                  type="submit"
                  className="h-12 rounded-2xl bg-[#12383a] text-base font-semibold text-white hover:bg-[#0b2528] dark:bg-teal-200 dark:text-[#12383a] dark:hover:bg-teal-100"
                >
                  {loginIsLoading ? (
                    <>
                      <BrandedLoader variant="tiny" className="mr-2" /> {t("pleaseWait")}
                    </>
                  ) : (
                    t("loginTab")
                  )}
                </Button>
                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  {t("loginNote")}
                </p>
              </CardFooter>
            </Card>
            </form>
          </TabsContent>
          <nav aria-label={legalLabel(language)} className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 border-t border-[#c8ddd3] pt-4 text-center dark:border-[#2a5552]">
            {legalNavigation.map(item => <Link key={item.key} to={item.path} target="_blank" rel="noopener noreferrer" title={language === "ar" ? "يفتح في تبويب جديد" : "Opens in a new tab"} className="rounded-lg px-1 py-2 text-xs font-medium text-[#126252] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#126252] dark:text-teal-200 dark:focus-visible:outline-teal-200">{item[language === "ar" ? "ar" : "en"]}</Link>)}
          </nav>
        </Tabs>
      </div>
    </div>
  );
};
export default Login;
