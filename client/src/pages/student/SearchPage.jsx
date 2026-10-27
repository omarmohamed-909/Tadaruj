import React from "react";
import Filter from "./Filter";
import SearchResult from "./SearchResult";
import BrandedLoader from "@/components/BrandedLoader";
import { useGetSearchCourseQuery } from "@/features/api/courseApi";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/languageContext";
import CoursePagination from "@/components/CoursePagination";
import { useCoursePage, useCanonicalCoursePage } from "@/components/useCoursePage";
import { COURSE_PAGE_SIZE } from "@/lib/coursePagination";

const SearchPage = () => {
  const { t } = useLanguage();
  const { page, searchParams, setSearchParams, goToPage } = useCoursePage();
  const query = searchParams.get("query");
  const selectedSubjects = searchParams.getAll("subjects");
  const selectedGrades = searchParams.getAll("grades");
  const sortByPrice = searchParams.get("sortByPrice") || "";

  const { data, isLoading, isFetching, isError, refetch } = useGetSearchCourseQuery({
    query: query ?? "",
    subjects: selectedSubjects,
    grades: selectedGrades,
    sortByPrice, page, limit: COURSE_PAGE_SIZE,
  });
  const busy = isLoading || isFetching;
  useCanonicalCoursePage(data?.page, busy, page, setSearchParams);

  const isEmpty = !busy && data?.courses?.length === 0;

  const handleFilterChange = (subjects, grades, price) => {
    const next = new URLSearchParams(searchParams);
    ["subjects", "grades", "sortByPrice", "page"].forEach((key) => next.delete(key));
    subjects.forEach((subject) => next.append("subjects", subject));
    grades.forEach((grade) => next.append("grades", grade));
    if (price) next.set("sortByPrice", price);
    setSearchParams(next);
  }
  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-8">
      <div className="mb-7 border-b border-border pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("searchResults")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{query ? `“${query}”` : t("browseAll")}</h1>
        {!busy && !isError && <p className="mt-2 text-sm text-muted-foreground" aria-live="polite">{data?.total ?? 0} {t("resultsCount")}</p>}
      </div>
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
        <Filter handleFilterChange={handleFilterChange} selectedSubjects={selectedSubjects} selectedGrades={selectedGrades} sortByPrice={sortByPrice} />
        <div className="flex-1 space-y-4">
          {isError ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"><p>{t("searchFailed")}</p><Button type="button" variant="outline" onClick={refetch} className="mt-3">{t("retry")}</Button></div>
          ) : busy ? (
            <BrandedLoader />
          ) : isEmpty ? (
            <CourseNotFound />
          ) : (
            data?.courses?.map((course) => <SearchResult key={course._id} course={course}/>)
          )}
          {!isError && <CoursePagination page={data?.page ?? page} totalPages={data?.totalPages ?? 0} busy={busy} onPageChange={goToPage} />}
        </div>
      </div>
    </div>
  );
};
export default SearchPage;

const CourseNotFound = () => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center min-h-32 p-6">
      <AlertCircle className="text-red-500 h-16 w-16 mb-4" />
      <h1 className="font-bold text-2xl md:text-4xl text-foreground mb-2">
        {t("noResults")}
      </h1>
      <p className="text-lg text-muted-foreground mb-4">
        {t("noResultsBody")}
      </p>
      <Link to="/courses" className="italic">
        <Button variant="link">{t("browseAll")}</Button>
      </Link>
    </div>
  );
};
