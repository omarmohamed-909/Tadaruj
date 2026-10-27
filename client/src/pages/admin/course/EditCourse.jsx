import { Button } from "@/components/ui/button";
import { BookOpenCheck, Settings2 } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import CourseTab from "./CourseTab";

const EditCourse = () => {
  return (
    <div className="flex-1 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 rounded-[24px] border border-border/80 bg-card p-4 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] dark:border-border dark:bg-card sm:rounded-[30px] sm:p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent-foreground dark:bg-accent/10 dark:text-accent-foreground">
            <Settings2 className="h-3.5 w-3.5" />
            Course setup
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground dark:text-foreground sm:text-3xl">
            Add detail information regarding course
          </h1>
        </div>
        <Link to="lecture" className="w-full sm:w-auto">
          <Button className="h-11 w-full rounded-2xl px-5 font-semibold sm:w-auto" variant="outline">
            <BookOpenCheck className="mr-2 h-4 w-4" />
            Go to lecture page
          </Button>
        </Link>
      </div>
      <div className="max-w-5xl py-1 sm:py-2">
      <CourseTab/>
      </div>
    </div>
  );
};

export default EditCourse;
