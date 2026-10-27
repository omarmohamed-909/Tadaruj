import { useUiText } from "@/components/useUiText";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileVideo, FilePenLine } from "lucide-react";
import React from "react";
import { Link, useParams } from "react-router-dom";
import LectureTab from "./LectureTab";
import { useWorkspacePath } from "@/lib/useWorkspacePath";

const EditLecture = () => {
  const ui = useUiText();
  const params = useParams();
  const courseId = params.courseId;
  const workspacePath = useWorkspacePath();
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 rounded-[24px] border border-border/80 bg-card p-4 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] dark:border-border dark:bg-card sm:rounded-[30px] sm:p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to={workspacePath(`/course/${courseId}/lecture`)}>
            <Button
              size="icon"
              variant="outline"
              className="rounded-full border-border bg-card/80 hover:bg-muted dark:border-border dark:bg-card dark:hover:bg-secondary"
            >
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-accent-foreground dark:bg-accent/10 dark:text-accent-foreground">
              <FilePenLine className="h-3.5 w-3.5" />{" "}{ui("Lecture editor")}{" "}</div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground dark:text-foreground sm:text-2xl">{" "}{ui("Update Your Lecture")}{" "}</h1>
          </div>
        </div>
        <div className="inline-flex w-full items-center gap-2 rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm font-medium text-muted-foreground dark:border-border dark:bg-card/70 dark:text-muted-foreground sm:w-auto">
          <FileVideo className="h-4 w-4 text-accent-foreground dark:text-accent-foreground" />{" "}{ui("Manage title, preview access, uploads, and YouTube links")}{" "}</div>
      </div>
      <LectureTab />
    </div>
  );
};

export default EditLecture;
