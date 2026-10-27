import React, { useState } from "react";
import Filter from "./Filter";
import SearchResult from "./SearchResult";
import BrandedLoader from "@/components/BrandedLoader";
import { useGetSearchCourseQuery } from "@/features/api/courseApi";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/languageContext";

const SearchPage = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("query");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [sortByPrice, setSortByPrice] = useState("");

  const { data, isLoading, isError, refetch } = useGetSearchCourseQuery({
    query: query ?? "",
    subjects: selectedSubjects,
    grades: selectedGrades,
    sortByPrice
  });

  const isEmpty = !isLoading && data?.courses?.length === 0;

  const handleFilterChange = (subjects, grades, price) => {
    setSelectedSubjects(subjects);
    setSelectedGrades(grades);
    setSortByPrice(price);
  }
  return (
    <div className="mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-8">
      <div className="mb-7 border-b border-border pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("searchResults")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{query ? `“${query}”` : t("browseAll")}</h1>
        {!isLoading && !isError && <p className="mt-2 text-sm text-muted-foreground">{data?.courses?.length ?? 0} {t("resultsCount")}</p>}
      </div>
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-10">
        <Filter handleFilterChange={handleFilterChange}/>
        <div className="flex-1 space-y-4">
          {isError ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"><p>{t("searchFailed")}</p><Button type="button" variant="outline" onClick={refetch} className="mt-3">{t("retry")}</Button></div>
          ) : isLoading ? (
            <BrandedLoader />
          ) : isEmpty ? (
            <CourseNotFound />
          ) : (
            data?.courses?.map((course) => <SearchResult key={course._id} course={course}/>)
          )}
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
      <Link to="/" className="italic">
        <Button variant="link">{t("browseAll")}</Button>
      </Link>
    </div>
  );
};
