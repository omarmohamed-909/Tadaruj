import React from "react";
import { Link } from "react-router-dom";
import { useGetPublicInstructorsQuery } from "@/features/api/authApi";
import { useLanguage } from "@/components/languageContext";
import InstructorCard from "@/components/InstructorCard";
import BrandedLoader from "@/components/BrandedLoader";

const InstructorsSection = () => {
  const { t } = useLanguage();
  const { data, isLoading, isError, refetch } = useGetPublicInstructorsQuery({ page: 1, limit: 6 });
  const instructors = data?.instructors || [];

  return (
    <section id="instructors" className="scroll-mt-20 bg-[#f4f7f5] px-6 py-16 dark:bg-slate-950 md:px-10 md:py-24" aria-labelledby="instructors-title">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-5 border-b border-[#cad9d2] pb-7 dark:border-slate-800 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-teal-800 dark:text-teal-300">{t("instructorsEyebrow")}</p>
            <h2 id="instructors-title" className="text-3xl font-semibold tracking-tight text-[#102c2f] dark:text-white md:text-5xl">{t("instructorsTitle")}</h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-slate-600 dark:text-slate-300">{t("instructorsBody")}</p>
        </div>

        {isLoading ? (
          <BrandedLoader />
        ) : isError ? (
          <div role="alert" className="rounded-2xl border border-teal-900/15 bg-white p-6 text-slate-700 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
            <p>{t("instructorsLoadFailed")}</p>
            <button type="button" onClick={refetch} className="mt-3 font-semibold text-teal-800 underline dark:text-teal-300">{t("retry")}</button>
          </div>
        ) : instructors.length ? (
          <div className={`grid gap-5 ${instructors.length === 1 ? "mx-auto max-w-5xl" : instructors.length === 2 ? "mx-auto max-w-4xl sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {instructors.map((instructor) => (
              <InstructorCard key={instructor._id} instructor={instructor} featured={instructors.length === 1} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{t("instructorEmpty")}</p>
        )}
        {!isError && !isLoading && instructors.length > 0 && (
          <div className="mt-10 flex justify-center">
            <Link to="/instructors" className="inline-flex min-h-12 items-center justify-center border border-[#12383a] px-7 py-3 text-sm font-semibold text-[#12383a] transition hover:bg-[#12383a] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 dark:border-teal-200 dark:text-teal-100 dark:hover:bg-teal-200 dark:hover:text-[#12383a]">{t("viewAllInstructors")}</Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default InstructorsSection;
