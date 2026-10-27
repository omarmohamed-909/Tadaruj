import { Badge } from "@/components/ui/badge";
import { secureMediaUrl } from "@/lib/secureMediaUrl";
import { getCourseGradeLevel, getCourseSubject, getGradeLabel } from "@/lib/courseTaxonomy";
import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/components/languageContext";

const SearchResult = ({ course }) => {
  const { t, language } = useLanguage();
  const priceLabel =
    typeof course?.coursePrice === "number" && course.coursePrice > 0
      ? `${course.coursePrice} EGP`
      : t("free");

  return (
    <div className="rounded-3xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md md:p-4">
      <Link
        to={`/course-detail/${course._id}`}
        className="flex w-full flex-col gap-4 md:flex-row"
      >
        <img
          src={secureMediaUrl(course.courseThumbnail) || "/brand-mark.webp"}
          alt={course.courseTitle}
          className={`h-40 w-full rounded-2xl bg-muted md:h-32 md:w-56 ${course.courseThumbnail ? "object-cover" : "object-contain p-6"}`}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <h1 className="line-clamp-2 text-lg font-bold text-foreground md:text-xl">
              {course.courseTitle}
            </h1>
            <h2 className="shrink-0 text-base font-bold text-foreground md:text-lg">
              {priceLabel}
            </h2>
          </div>

          <p className="line-clamp-2 text-sm text-muted-foreground">{course.subTitle}</p>
          <p className="text-sm text-muted-foreground">
            {t("instructor")}: <span className="font-bold">{course.creator?.name || t("unknownInstructor")}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2"><Badge>{getCourseSubject(course) || t("subjectPending")}</Badge>{getCourseGradeLevel(course) && <Badge variant="outline">{getGradeLabel(getCourseGradeLevel(course), language)}</Badge>}</div>
        </div>
      </Link>
    </div>
  );
};

export default SearchResult;
