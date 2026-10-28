import { useLanguage } from "./languageContext";

export default function DeploymentNotice() {
  const { language } = useLanguage();
  if (import.meta.env.VITE_DEPLOYMENT_STAGE !== "demo") return null;
  return (
    <aside role="note" className="border-b border-border bg-accent px-5 py-3 text-center text-sm leading-6 text-accent-foreground">
      {language === "ar"
        ? "نسخة تجريبية — إرسال رسائل التفعيل واستعادة كلمة المرور متاح حاليًا لبريد الاختبار المصرّح به فقط، لحين تفعيل دومين البريد."
        : "Demo — verification and password recovery emails are currently limited to the authorized test mailbox until the email domain is activated."}
    </aside>
  );
}
