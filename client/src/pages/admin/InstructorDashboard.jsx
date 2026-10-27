import React from "react";
import { Link } from "react-router-dom";
import { useGetCreatorCourseQuery } from "@/features/api/courseApi";
import PageSkeleton from "@/components/PageSkeleton";
import { useLoadUserQuery } from "@/features/api/authApi";
import { useLanguage } from "@/components/languageContext";

const InstructorDashboard = () => {
  const { data, isLoading, isError } = useGetCreatorCourseQuery();
  const { data: profileData } = useLoadUserQuery();
  const { language, t } = useLanguage();
  if (isLoading) return <PageSkeleton variant="dashboard" />;
  const courses = data?.courses ?? [];
  return (
    <div className="space-y-8">
      <header className="border-b border-border pb-6 dark:border-border">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#126252] dark:text-teal-300">{t("instructorWorkspace")}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#102c2f] dark:text-white">{t("instructorDashboardTitle")}</h1>
        <p className="mt-2 text-muted-foreground dark:text-muted-foreground">{t("instructorDashboardBody")}</p>
      </header>
      {profileData?.user && !profileData.user.instructorWhatsapp && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-semibold">{language === "ar" ? "أضف رقم واتساب لتستقبل طلبات كورساتك المدفوعة" : "Add your WhatsApp number to receive paid-course orders"}</p>
          <p className="mt-1 text-sm">{language === "ar" ? "الفلوس هتوصلك مباشرة، والكورس هيتفتح للطالب بعد ما تؤكد الدفع." : "Students pay you directly; access opens only after you confirm payment."}</p>
          <Link className="mt-3 inline-block text-sm font-semibold underline" to="/profile">{language === "ar" ? "تعديل البروفايل" : "Edit profile"}</Link>
        </div>
      )}
      {isError ? <p role="alert" className="border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">{t("couldNotLoadCourses")}</p> : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 dark:border-border dark:bg-secondary"><p className="text-sm text-muted-foreground dark:text-muted-foreground">{t("yourCourses")}</p><p className="mt-2 text-3xl font-bold text-[#102c2f] dark:text-white">{courses.length}</p></div>
          <div className="rounded-2xl border border-border bg-card p-5 dark:border-border dark:bg-secondary"><p className="text-sm text-muted-foreground dark:text-muted-foreground">{t("published")}</p><p className="mt-2 text-3xl font-bold text-[#126252] dark:text-teal-200">{courses.filter((course) => course.isPublished).length}</p></div>
          <div className="rounded-2xl border border-border bg-card p-5 dark:border-border dark:bg-secondary"><p className="text-sm text-muted-foreground dark:text-muted-foreground">{t("drafts")}</p><p className="mt-2 text-3xl font-bold text-[#b5863f] dark:text-[#e7b96d]">{courses.filter((course) => !course.isPublished).length}</p></div>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Link className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90" to="/instructor/course">{t("manageCourses")}</Link>
        <Link className="rounded-lg border border-border px-5 py-3 font-semibold text-primary hover:bg-accent dark:border-border dark:text-teal-100 dark:hover:bg-secondary" to="/instructor/orders">{language === "ar" ? "راجع الطلبات" : "Review orders"}</Link>
        <Link className="rounded-lg border border-border px-5 py-3 font-semibold text-primary hover:bg-accent dark:border-border dark:text-teal-100 dark:hover:bg-secondary" to="/instructor/quiz-dashboard">{t("reviewQuizResults")}</Link>
      </div>
    </div>
  );
};

export default InstructorDashboard;
