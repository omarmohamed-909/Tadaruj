import { useUiText, useFeedbackText } from "@/components/useUiText";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetCreatorCourseQuery, useGetAdminManageableCoursesQuery } from "@/features/api/courseApi";
import { Edit, PlusCircle, SquareLibrary, Wallet } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getCourseGradeLevel, getCourseSubject } from "@/lib/courseTaxonomy";
import BrandedLoader from "@/components/BrandedLoader";

const CourseTable = () => {
  const ui = useUiText();
  const feedback = useFeedbackText();
  const isAdmin = useSelector((state) => state.auth.user?.role === "admin");
  const creatorQuery = useGetCreatorCourseQuery(undefined, { skip: isAdmin });
  const adminQuery = useGetAdminManageableCoursesQuery(undefined, { skip: !isAdmin });
  const { data, isLoading, isError, error } = isAdmin ? adminQuery : creatorQuery;
  const navigate = useNavigate();
  const courses = data?.courses ?? [];
  const publishedCourses = courses.filter((course) => course?.isPublished).length;
  const draftCourses = courses.length - publishedCourses;
  const totalCourseValue = courses.reduce(
    (total, course) => total + (Number(course?.coursePrice) || 0),
    0
  );

  if (isLoading) {
    return <BrandedLoader variant="page" />;
  }

  if (isError) {
    return (
      <div className="space-y-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
        <h1 className="text-lg font-semibold">{ui("Failed to load courses")}</h1>
        <p className="text-sm">
          {feedback(error?.data?.message, ui("Something went wrong while fetching your courses."))}
        </p>
        <Button onClick={() => navigate("create")}>{ui("Create a new course")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 rounded-[24px] border border-border/80 bg-card p-4 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] dark:border-border dark:bg-card sm:rounded-[30px] sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent-foreground dark:bg-accent/10 dark:text-accent-foreground">
            <SquareLibrary className="h-3.5 w-3.5" />{" "}{ui("Course Manager")}{" "}</div>
          <div>
            <h1 className="text-[2rem] font-extrabold tracking-tight text-foreground dark:text-foreground sm:text-3xl">{" "}{ui("Your courses")}{" "}</h1>
            <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">{" "}{ui("Manage published and draft courses from one place.")}{" "}</p>
          </div>
        </div>
        <Button
          onClick={() => navigate("create")}
          className="h-11 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:h-12 sm:text-base"
        >
          <PlusCircle className="mr-2 h-4 w-4" />{" "}{ui("Create a new course")}{" "}</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm dark:border-border dark:bg-card sm:rounded-3xl sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:text-muted-foreground">{" "}{ui("Total courses")}{" "}</p>
          <h2 className="mt-2 text-2xl font-extrabold text-foreground dark:text-foreground sm:mt-3 sm:text-3xl">
            {courses.length}
          </h2>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm dark:border-border dark:bg-card sm:rounded-3xl sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:text-muted-foreground">{" "}{ui("Published / Draft")}{" "}</p>
          <h2 className="mt-2 text-2xl font-extrabold text-foreground dark:text-foreground sm:mt-3 sm:text-3xl">
            {publishedCourses} / {draftCourses}
          </h2>
        </div>
        <div className="col-span-2 rounded-2xl border border-border/80 bg-card p-4 shadow-sm dark:border-border dark:bg-card sm:rounded-3xl sm:p-5 md:col-span-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" />{" "}{ui("Total value")}{" "}</div>
          <h2 className="mt-2 text-2xl font-extrabold text-foreground dark:text-foreground sm:mt-3 sm:text-3xl">
            {totalCourseValue}{" "}{ui("EGP")}{" "}</h2>
        </div>
      </div>

      <div className="overflow-hidden rounded-[30px] border border-border/80 bg-card shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] dark:border-border dark:bg-card">
        <div className="border-b border-border/70 px-6 py-5 dark:border-border">
          <h2 className="text-xl font-bold text-foreground dark:text-foreground">{ui("Course list")}</h2>
          <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">{" "}{ui("A quick view of pricing, status, and edit actions.")}{" "}</p>
        </div>

        <div className="space-y-3 px-3 pb-4 pt-3 md:hidden">
          {courses.length === 0 ? (
            <div className="rounded-2xl border border-border bg-muted p-6 text-center text-sm text-muted-foreground dark:border-border dark:bg-secondary dark:text-muted-foreground">{" "}{ui("No courses found yet.")}{" "}</div>
          ) : (
            courses.map((course) => (
              <div
                key={course._id}
                className="rounded-2xl border border-border bg-muted p-3.5 dark:border-border dark:bg-secondary"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-6 text-foreground dark:text-foreground">
                    {course.courseTitle}
                  </p>
                  <Badge
                    className={
                      course.isPublished
                        ? "shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300"
                        : "shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300"
                    }
                  >
                    {course.isPublished ? ui("Published") : ui("Draft")}
                  </Badge>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">{getCourseSubject(course) || ui("Subject not set")}{getCourseGradeLevel(course) ? ` · ${getCourseGradeLevel(course)}` : ""}</p>

                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground dark:text-foreground">
                    {course?.coursePrice ? ui("{0} EGP", course.coursePrice) : "NA"}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-xl border-border bg-card px-3 text-xs font-semibold hover:bg-muted dark:border-border dark:bg-card dark:hover:bg-secondary"
                    onClick={() => navigate(`${course._id}`)}
                  >
                    <Edit className="mr-1.5 h-3.5 w-3.5" />{" "}{ui("Edit")}{" "}</Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden px-2 pb-3 pt-1 md:block md:px-4">
          <Table>
            <TableCaption className="pb-4">{ui("A list of your recent courses.")}</TableCaption>
            <TableHeader>
              <TableRow className="border-border dark:border-border">
                <TableHead className="w-[140px] px-4 py-4">{ui("Price")}</TableHead>
                <TableHead className="px-4 py-4">{ui("Status")}</TableHead>
                <TableHead className="px-4 py-4">{ui("Title")}</TableHead>
                <TableHead className="px-4 py-4">{ui("Subject / stage")}</TableHead>
                <TableHead className="px-4 py-4 text-right">{ui("Action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course._id} className="border-border dark:border-border">
                  <TableCell className="px-4 py-4 font-semibold text-foreground dark:text-foreground">
                    {course?.coursePrice ? ui("{0} EGP", course.coursePrice) : "NA"}
                  </TableCell>
                  <TableCell className="px-4 py-4">
                    <Badge
                      className={
                        course.isPublished
                          ? "rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300"
                          : "rounded-full bg-amber-100 px-3 py-1 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300"
                      }
                    >
                      {course.isPublished ? ui("Published") : ui("Draft")}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-4 font-medium text-muted-foreground dark:text-foreground">
                    {course.courseTitle}
                  </TableCell>
                  <TableCell className="px-4 py-4 text-sm text-muted-foreground dark:text-muted-foreground">{getCourseSubject(course) || ui("Subject not set")}{getCourseGradeLevel(course) ? ` · ${getCourseGradeLevel(course)}` : ""}</TableCell>
                  <TableCell className="px-4 py-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-border bg-card hover:bg-muted dark:border-border dark:bg-card dark:hover:bg-secondary"
                      onClick={() => navigate(`${course._id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {courses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">{" "}{ui("No courses found yet.")}{" "}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default CourseTable;
