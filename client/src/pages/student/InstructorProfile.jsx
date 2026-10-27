import React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useGetPublicInstructorQuery } from "@/features/api/authApi";
import { useLanguage } from "@/components/languageContext";
import Course from "./Course";
import BrandedLoader from "@/components/BrandedLoader";

const InstructorProfile = () => {
  const { instructorId } = useParams();
  const { t } = useLanguage();
  const { data, isLoading, isError, refetch } = useGetPublicInstructorQuery(instructorId, { skip: !instructorId });
  const instructor = data?.instructor;
  const courses = data?.courses || [];

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#fbfaf7] px-6 py-12 dark:bg-slate-950 md:px-10 md:py-20">
      <div className="mx-auto max-w-7xl">
        <Link to="/" className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-teal-800 dark:text-teal-300"><ArrowLeft className="h-4 w-4" /> {t("home")}</Link>

        {isLoading ? <BrandedLoader /> : isError || !instructor ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
            <h1 className="text-xl font-bold text-slate-950 dark:text-white">{t("unknownInstructor")}</h1>
            {isError && <button type="button" onClick={refetch} className="mt-4 font-semibold text-teal-800 underline dark:text-teal-300">{t("retry")}</button>}
          </div>
        ) : (
          <>
            <section className="mb-12 rounded-[32px] bg-[#12383a] p-7 text-white md:p-10">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <img src={instructor.photoUrl || "/default-avatar.webp"} alt="" className="h-24 w-24 rounded-3xl object-cover ring-4 ring-[#e7b96d]/40" />
                <div><p className="text-sm font-semibold text-teal-200">{t("instructor")}</p><h1 className="mt-2 text-3xl font-black md:text-5xl">{instructor.name}</h1><p className="mt-3 text-slate-300">{instructor.courseCount ? `${instructor.courseCount} ${t("instructorCourses")}` : t("instructorNoCourses")}</p></div>
              </div>
              {instructor.instructorBio && <p className="mt-7 max-w-3xl whitespace-pre-line border-t border-white/15 pt-6 text-sm leading-7 text-slate-200 md:text-base">{instructor.instructorBio}</p>}
              {instructor.instructorSubjects?.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{instructor.instructorSubjects.map((subject) => <span key={subject} className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-teal-100">{subject}</span>)}</div>}
            </section>

            <div className="mb-7 flex items-center gap-3"><BookOpen className="h-5 w-5 text-teal-700 dark:text-teal-300" /><h2 className="text-2xl font-black text-slate-950 dark:text-white">{t("instructorPublishedCourses")}</h2></div>
            {courses.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{courses.map((course) => <Course key={course._id} course={course} />)}</div> : <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{t("instructorNoCoursesBody")}</p>}
          </>
        )}
      </div>
    </main>
  );
};

export default InstructorProfile;
