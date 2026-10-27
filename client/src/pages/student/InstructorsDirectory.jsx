import React from "react";
import { useSearchParams } from "react-router-dom";
import InstructorCard from "@/components/InstructorCard";
import BrandedLoader from "@/components/BrandedLoader";
import { useLanguage } from "@/components/languageContext";
import { useGetPublicInstructorsQuery } from "@/features/api/authApi";

const PAGE_SIZE = 12;

const InstructorsDirectory = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = Number(searchParams.get("page") || 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const q = searchParams.get("q") || "";
  const subject = searchParams.get("subject") || "";
  const { data, isFetching, isError, refetch } = useGetPublicInstructorsQuery({ page, limit: PAGE_SIZE, q, subject });
  const instructors = data?.instructors || [];

  const updateFilters = ({ search = q, nextSubject = subject, nextPage = 1 }) => {
    const next = new URLSearchParams();
    if (search) next.set("q", search);
    if (nextSubject) next.set("subject", nextSubject);
    if (nextPage > 1) next.set("page", String(nextPage));
    setSearchParams(next);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const search = String(new FormData(event.currentTarget).get("q") || "").trim();
    updateFilters({ search });
  };

  return (
    <main className="min-h-[70vh] bg-[#f4f7f5] px-6 py-14 dark:bg-slate-950 md:px-10 md:py-20">
      <div className="mx-auto max-w-7xl">
        <header className="max-w-3xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-teal-800 dark:text-teal-300">{t("directoryEyebrow")}</p>
          <h1 className="text-4xl font-semibold tracking-tight text-[#102c2f] dark:text-white md:text-6xl">{t("directoryTitle")}</h1>
          <p className="mt-5 text-base leading-8 text-slate-600 dark:text-slate-300">{t("directoryBody")}</p>
        </header>

        <div className="mt-10 flex flex-col gap-4 border-y border-[#cad9d2] py-6 dark:border-slate-800 md:flex-row md:items-end">
          <form onSubmit={handleSearch} role="search" className="flex min-w-0 flex-1 gap-2">
            <label htmlFor="instructor-search" className="sr-only">{t("instructorSearchPlaceholder")}</label>
            <input id="instructor-search" name="q" key={q} defaultValue={q} maxLength={100} placeholder={t("instructorSearchPlaceholder")} className="min-h-12 min-w-0 flex-1 border border-[#b9cfc4] bg-white px-4 text-[#102c2f] outline-none focus:border-teal-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:border-teal-300" />
            <button type="submit" className="min-h-12 shrink-0 bg-[#12383a] px-5 text-sm font-semibold text-white transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 dark:bg-teal-200 dark:text-[#12383a] dark:hover:bg-teal-100">{t("searchInstructors")}</button>
          </form>
          <div className="md:w-64">
            <label htmlFor="instructor-subject" className="sr-only">{t("subject")}</label>
            <select id="instructor-subject" value={subject} onChange={(event) => updateFilters({ nextSubject: event.target.value })} className="min-h-12 w-full border border-[#b9cfc4] bg-white px-4 text-[#102c2f] outline-none focus:border-teal-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:border-teal-300">
              <option value="">{t("allInstructorSubjects")}</option>
              {data?.subjects?.map((item) => <option value={item} key={item}>{item}</option>)}
              {subject && !data?.subjects?.includes(subject) && <option value={subject}>{subject}</option>}
            </select>
          </div>
        </div>

        {!isFetching && !isError && data && (
          <p className="my-6 text-sm font-medium text-slate-600 dark:text-slate-300" aria-live="polite">{data.total} {t("instructorsFound")}</p>
        )}

        {isFetching ? (
          <BrandedLoader className="mt-8" />
        ) : isError ? (
          <div role="alert" className="mt-8 border border-[#cad9d2] bg-white p-8 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <p>{t("instructorsLoadFailed")}</p>
            <button type="button" onClick={refetch} className="mt-4 font-semibold text-teal-800 underline dark:text-teal-300">{t("retry")}</button>
          </div>
        ) : instructors.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {instructors.map((instructor) => <InstructorCard key={instructor._id} instructor={instructor} />)}
          </div>
        ) : (
          <div className="mt-8 border border-dashed border-[#b9cfc4] bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-[#102c2f] dark:text-white">{q || subject ? t("directoryNoMatches") : t("instructorEmpty")}</h2>
            {(q || subject) && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t("directoryNoMatchesBody")}</p>}
            {(q || subject) && <button type="button" onClick={() => updateFilters({ search: "", nextSubject: "" })} className="mt-5 font-semibold text-teal-800 underline dark:text-teal-300">{t("clearFilters")}</button>}
          </div>
        )}

        {!isFetching && !isError && data?.totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-5" aria-label={t("pageLabel")}>
            <button type="button" disabled={page <= 1} onClick={() => updateFilters({ nextPage: page - 1 })} className="min-h-11 border border-[#b9cfc4] px-4 text-sm font-semibold text-[#12383a] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-teal-100">{t("previousPage")}</button>
            <span className="text-sm text-slate-600 dark:text-slate-300">{t("pageLabel")} {page} / {data.totalPages}</span>
            <button type="button" disabled={page >= data.totalPages} onClick={() => updateFilters({ nextPage: page + 1 })} className="min-h-11 border border-[#b9cfc4] px-4 text-sm font-semibold text-[#12383a] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-teal-100">{t("nextPage")}</button>
          </nav>
        )}
      </div>
    </main>
  );
};

export default InstructorsDirectory;
