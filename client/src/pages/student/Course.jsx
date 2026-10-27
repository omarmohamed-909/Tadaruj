import { useUiText } from "@/components/useUiText";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { secureMediaUrl } from "@/lib/secureMediaUrl";
import { getCourseGradeLevel, getCourseSubject, getGradeLabel } from "@/lib/courseTaxonomy";
import { ArrowUpRight, CircleDollarSign, Layers3 } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/components/languageContext";

const Course = ({course}) => {
  const ui = useUiText();
  const { t, language } = useLanguage();
  const priceLabel =
    typeof course?.coursePrice === "number" && course.coursePrice > 0
      ? ui("{0} EGP", course.coursePrice)
      : t("free");

  return (
    <Link to={`/course-detail/${course._id}`} className="block h-full">
    <Card className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative overflow-hidden">
        <img
          src={secureMediaUrl(course.courseThumbnail) || "/brand-mark.webp"}
          alt={course.courseTitle}
          loading="lazy"
          decoding="async"
          className={`block h-40 w-full bg-muted transition-transform duration-500 group-hover:scale-105 ${course.courseThumbnail ? "object-cover" : "object-contain p-8"}`}
        />
        {course.courseThumbnail && <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/45 to-transparent" />}
        <div className="absolute right-3 top-3 rounded-full bg-card p-2 text-foreground shadow-sm transition-transform group-hover:translate-x-1 group-hover:-translate-y-1">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </div>
      </div>
      <CardContent className="flex flex-1 flex-col space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="line-clamp-2 min-h-12 text-base font-bold leading-6 text-foreground transition-colors group-hover:text-primary">
            {course.courseTitle}
          </h1>
          <Badge className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-accent">
            {getCourseSubject(course) || t("subjectPending")}
          </Badge>
        </div>
        {getCourseGradeLevel(course) && <p className="text-xs font-medium text-muted-foreground">{getGradeLabel(getCourseGradeLevel(course), language)}</p>}
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 ring-2 ring-border">
            <AvatarImage src={ course?.creator?.photoUrl ||"/default-avatar.webp"} alt={ui("creator avatar")} />
            <AvatarFallback>{course.creator?.name?.trim()?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("instructor")}</p>
            <h1 className="line-clamp-1 text-sm font-semibold text-foreground">{course?.creator?.name || t("unknownInstructor")}</h1>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between rounded-2xl bg-muted px-3.5 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers3 className="h-3.5 w-3.5 text-primary" />
            {t("structuredLearning")}
          </div>
          <div className="flex items-center gap-1.5 text-base font-bold text-foreground">
            <CircleDollarSign className="h-3.5 w-3.5 text-primary" />
            <span>{priceLabel}</span>
          </div>
        </div>
      </CardContent>
    </Card>
    </Link>
  );
};

export default Course;
