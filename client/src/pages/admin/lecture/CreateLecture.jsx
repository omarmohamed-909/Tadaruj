import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/PageSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateLectureMutation,
  useGetCourseLectureQuery,
  useReorderLectureMutation,
} from "@/features/api/courseApi";
import { BookOpen, PlusCircle } from "lucide-react";
import BrandedLoader from "@/components/BrandedLoader";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useWorkspacePath } from "@/lib/useWorkspacePath";
import Lecture from "./Lecture";

const CreateLecture = () => {
  const [lectureTitle, setLectureTitle] = useState("");
  const params = useParams();
  const courseId = params.courseId;
  const navigate = useNavigate();
  const workspacePath = useWorkspacePath();

  const [createLecture, { data, isLoading, isSuccess, error }] =
    useCreateLectureMutation();
  const [reorderLecture, { isLoading: isReordering }] = useReorderLectureMutation();

  const {
    data: lectureData,
    isLoading: lectureLoading,
    isError: lectureError,
    refetch,
  } = useGetCourseLectureQuery(courseId);

  const createLectureHandler = async () => {
    await createLecture({ lectureTitle, courseId });
  };

  useEffect(() => {
    if (isSuccess) {
      refetch();
      toast.success(data?.message);
      setLectureTitle("");
    }
    if (error) {
      toast.error(error?.data?.message);
    }
  }, [isSuccess, error, data, refetch]);

  const reorderLectureHandler = async (lectureId, direction) => {
    try {
      const response = await reorderLecture({ courseId, lectureId, direction }).unwrap();
      toast.success(response?.message);
      refetch();
    } catch (reorderError) {
      toast.error(reorderError?.data?.message || "Failed to reorder lecture.");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:border-border dark:bg-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:bg-secondary dark:text-foreground">
              Lecture Management
            </div>
            <h1 className="text-2xl font-bold text-foreground dark:text-foreground">
              Add and organize your course lectures
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground dark:text-muted-foreground">
              Create a new lecture, then open it to upload its video or add a YouTube link, control preview access,
              and manage what students can see before purchase.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:w-auto">
            <div className="rounded-xl border border-border bg-muted px-4 py-3 text-center dark:border-border dark:bg-secondary/70">
              <p className="text-xs uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">Lectures</p>
              <p className="mt-1 text-xl font-bold text-foreground dark:text-foreground">
                {lectureData?.lectures?.length ?? 0}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted px-4 py-3 text-center dark:border-border dark:bg-secondary/70">
              <p className="text-xs uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">Course</p>
              <p className="mt-1 text-sm font-semibold text-foreground dark:text-foreground">
                Ready to edit
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card className="border-border shadow-sm dark:border-border">
        <CardHeader>
          <CardTitle className="text-xl">Create a new lecture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label>Lecture title</Label>
            <Input
              type="text"
              name="courseTitle"
              value={lectureTitle}
              onChange={(e) => setLectureTitle(e.target.value)}
              placeholder="Example: Introduction to Docker"
              className="mt-2"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(workspacePath(`/course/${courseId}`))}
            >
              Back to Course
            </Button>
            <Button disabled={isLoading || !lectureTitle.trim()} onClick={createLectureHandler}>
              {isLoading ? (
                <>
                  <BrandedLoader variant="tiny" className="mr-2" />
                  Please wait
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Lecture
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm dark:border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5" />
            Existing lectures
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lectureLoading ? (
            <ListSkeleton items={5} />
          ) : lectureError ? (
            <p className="text-sm text-red-600 dark:text-red-400">Failed to load lectures.</p>
          ) : lectureData.lectures.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted px-5 py-8 text-center dark:border-border dark:bg-secondary/50">
              <p className="font-medium text-foreground dark:text-foreground">No lectures added yet</p>
              <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
                Create your first lecture to start building the course structure.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {lectureData?.lectures?.map((lecture, index) => {
              // لو الـ lecture نفسه object نستخدم _id، لو مجرد string نستخدمه زي ما هو
              const key = typeof lecture === "string" ? lecture : lecture._id;

              return (
                <Lecture
                  key={key || index}
                  lecture={
                    typeof lecture === "string" ? { _id: lecture } : lecture
                  }
                  index={index}
                  totalLectures={lectureData?.lectures?.length || 0}
                  isReordering={isReordering}
                  onReorder={reorderLectureHandler}
                />
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateLecture;
