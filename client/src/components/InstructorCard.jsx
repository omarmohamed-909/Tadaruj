import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "./languageContext";
import DeferredImage from "./DeferredImage";

const InstructorCard = ({ instructor, featured = false }) => {
  const { t } = useLanguage();
  return (
    <Link
      to={`/instructors/${instructor._id}`}
      className={`group overflow-hidden border border-[#d5e0d9] bg-white transition duration-200 motion-safe:hover:-translate-y-1 hover:border-teal-700 hover:shadow-[0_18px_38px_-28px_rgba(18,56,58,.55)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 dark:border-slate-700 dark:bg-[#172e31] dark:hover:border-teal-300 ${featured ? "md:grid md:grid-cols-[minmax(16rem,0.75fr)_1fr]" : "flex h-full flex-col"}`}
    >
      <div className={`relative flex shrink-0 items-center justify-center overflow-hidden border-t-[3px] border-[#e7b96d] bg-[#12383a] ${featured ? "min-h-60 md:min-h-72" : "h-40"}`}>
        <span className="absolute start-6 top-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#d9e7e0]">{t("instructor")}</span>
        <DeferredImage
          src={instructor.photoUrl || "/default-avatar.webp"}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(event) => { if (!event.currentTarget.src.endsWith("/default-avatar.webp")) event.currentTarget.src = "/default-avatar.webp"; }}
          className={`${featured ? "h-36 w-36 md:h-44 md:w-44" : "h-28 w-28"} rounded-full border-[5px] border-[#e7b96d] bg-white object-cover transition-transform duration-300 motion-safe:group-hover:scale-105`}
        />
      </div>
      <div className={`flex flex-1 flex-col ${featured ? "p-7 md:p-10" : "p-6"}`}>
        <h3 className={`${featured ? "text-3xl md:text-4xl" : "text-2xl"} font-semibold tracking-tight text-[#102c2f] dark:text-white`}>{instructor.name}</h3>
        {instructor.instructorSubjects?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {instructor.instructorSubjects.slice(0, 3).map((subject) => <span key={subject} className="border border-[#c9dcd2] px-2.5 py-1 text-xs font-medium text-teal-900 dark:border-teal-300/30 dark:text-teal-100">{subject}</span>)}
          </div>
        )}
        <p className={`mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300 ${featured ? "max-w-xl" : "line-clamp-2"}`}>
          {instructor.instructorBio || t("instructorProfileHint")}
        </p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#e4ebe5] pt-5 text-sm dark:border-white/10">
          <span className="text-slate-500 dark:text-slate-400">{instructor.courseCount ? `${instructor.courseCount} ${t("instructorCourses")}` : t("instructorNoCourses")}</span>
          <span className="font-semibold text-teal-900 underline decoration-[#d5a85e] underline-offset-4 group-hover:decoration-2 dark:text-teal-200">{t("viewInstructorProfile")}</span>
        </div>
      </div>
    </Link>
  );
};

export default InstructorCard;
