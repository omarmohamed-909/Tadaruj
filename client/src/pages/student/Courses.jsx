import React from "react";
import BrandedLoader from "@/components/BrandedLoader";
import { Button } from "@/components/ui/button";
import Course from "./Course";
import { useGetPublishedCourseQuery } from "@/features/api/courseApi";
import { BookOpen, RefreshCw } from "lucide-react";
import { useLanguage } from "@/components/languageContext";

const COURSE_CACHE_KEY = "lms_published_courses_cache";

const getCachedCourses = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(COURSE_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveCachedCourses = (courses) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(COURSE_CACHE_KEY, JSON.stringify(courses));
  } catch {
    // Ignore storage failures.
  }
};


const Courses = () => {
  const { t } = useLanguage();
  const [cachedCourses, setCachedCourses] = React.useState(() => getCachedCourses());
  const retryAttemptsRef = React.useRef(0);
  const { data, isLoading, isError, refetch } = useGetPublishedCourseQuery();
  const liveCourses = React.useMemo(() => Array.isArray(data?.courses) ? data.courses : [], [data?.courses]);
  const courses = data ? liveCourses : cachedCourses;
  const isUsingCachedCourses = !data && cachedCourses.length > 0;

  React.useEffect(() => {
    if (data && Array.isArray(data.courses)) {
      setCachedCourses(liveCourses);
      saveCachedCourses(liveCourses);
    }
  }, [data, liveCourses]);

  React.useEffect(() => {
    if (!isError) {
      retryAttemptsRef.current = 0;
      return;
    }

    if (retryAttemptsRef.current >= 2) {
      return;
    }

    const timeoutId = setTimeout(() => {
      retryAttemptsRef.current += 1;
      refetch();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [isError, refetch]);

  if (isError && courses.length === 0) {
    return (
      <section className="bg-background py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-foreground dark:border-amber-800/50 dark:bg-amber-950/20">
            <RefreshCw className="h-6 w-6 text-amber-700 dark:text-amber-300" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-semibold">{t("searchFailed")}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t("catalogUnavailableBody")}</p>
            <Button
              type="button"
              onClick={refetch}
              className="mt-5 h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t("retry")}
            </Button>
          </div>
        </div>
      </section>
    );
  }


  return (
    <section className="bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center border-b border-border pb-1 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {t("featured")}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                {t("courseHeading")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                {t("courseIntro")}
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground shadow-sm">
            <BookOpen className="h-4 w-4 text-primary" />
            {courses.length} {t("available")}
          </div>
        </div>

        {isUsingCachedCourses && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {t("cachedCoursesNotice")}
          </div>
        )}

        {isLoading ? <BrandedLoader /> : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {courses.map((course) => <Course key={course._id} course={course} />)}
          </div>
        )}
        {!isLoading && !isError && courses.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <BookOpen className="mx-auto h-7 w-7 text-primary" aria-hidden="true" />
            <h3 className="mt-4 text-lg font-semibold">{t("catalogEmpty")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("catalogEmptyBody")}</p>
          </div>
        )}

      </div>
    </section>
  );
};

export default Courses;
