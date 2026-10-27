import { useUiText, useFeedbackText } from "@/components/useUiText";
import Course from "./Course";
import BrandedLoader from "@/components/BrandedLoader";
import { useGetPublishedCourseQuery } from "@/features/api/courseApi";
import { BookOpen, Search } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/components/languageContext";
import CoursePagination from "@/components/CoursePagination";
import { useCoursePage, useCanonicalCoursePage } from "@/components/useCoursePage";
import { COURSE_PAGE_SIZE } from "@/lib/coursePagination";

const AllCourses = () => {
  const ui = useUiText();
  const feedback = useFeedbackText();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const { page, setSearchParams, goToPage } = useCoursePage();
  const { data, isLoading, isFetching, isError, error, refetch } = useGetPublishedCourseQuery({ page, limit: COURSE_PAGE_SIZE });
  const busy = isLoading || isFetching;
  useCanonicalCoursePage(data?.page, busy, page, setSearchParams);
  const courses = data?.courses ?? [];

  if (isError) {
    return (
      <section className="min-h-[calc(100vh-8rem)] bg-background px-6 py-16">
        <div className="mx-auto max-w-7xl rounded-[30px] border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <h1 className="text-xl font-bold">{t("searchFailed")}</h1>
          <p className="mt-2 text-sm">
            {feedback(error?.data?.message, ui("Something went wrong while fetching the courses."))}
          </p>
          <button type="button" onClick={() => refetch()} className="mt-4 rounded-lg border border-current px-4 py-2 font-semibold">{t("retry")}</button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100vh-8rem)] bg-background py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 rounded-4xl border border-border bg-card p-8 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold text-primary">{t("catalogLabel")}</p>
          <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
                {t("catalogTitle")}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
                {t("catalogBody")}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-muted px-4 py-3 text-sm font-medium text-muted-foreground">
              <BookOpen className="h-4 w-4 text-primary" />
              {data?.total ?? 0} {t("catalogCount")}
            </div>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); navigate(`/course/search?query=${encodeURIComponent(query.trim())}`); }} className="mt-7 flex max-w-xl items-center gap-2 rounded-xl border border-border bg-card p-2">
            <Search className="ms-2 h-5 w-5 text-primary" aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("catalogSearch")} aria-label={t("catalogSearch")} className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none" />
            <button type="submit" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">{t("search")}</button>
          </form>
        </div>

        {busy ? <BrandedLoader /> : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {courses.map((course) => <Course key={course._id} course={course} />)}
          </div>
        )}

        {!busy && courses.length === 0 && (
          <div className="mt-10 rounded-[28px] border border-dashed border-border bg-card px-6 py-12 text-center">
            <h2 className="text-xl font-bold text-foreground">{t("catalogEmpty")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("catalogEmptyBody")}
            </p>
          </div>
        )}
        <CoursePagination page={data?.page ?? page} totalPages={data?.totalPages ?? 0} busy={busy} onPageChange={goToPage} />
      </div>
    </section>
  );
};

export default AllCourses;
