import RichTextEditor from "@/components/RichTextEditor";
import PageSkeleton from "@/components/PageSkeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDeleteCourseMutation,
  useEditCourseMutation,
  useGetCourseByIdQuery,
  usePublishCourseMutation,
} from "@/features/api/courseApi";
import { AlertTriangle, BadgeCheck, ImageUp, LockOpen, Tag, Trash2, Wallet } from "lucide-react";
import BrandedLoader from "@/components/BrandedLoader";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkspacePath } from "@/lib/useWorkspacePath";
import { getCourseGradeLevel, getCourseSubject, getGradeLabel, gradeOptions, subjectSuggestions } from "@/lib/courseTaxonomy";
import { useLanguage } from "@/components/languageContext";
import { toast } from "sonner";

const CourseTab = () => {
  const { language } = useLanguage();
  const [input, setInput] = useState({
    courseTitle: "",
    subTitle: "",
    description: "",
    subject: "",
    gradeLevel: "",
    courseLevel: "",
    coursePrice: "",
    courseThumbnail: "",
  });
  const [existingThumbnail, setExistingThumbnail] = useState("");
  const [isFreeCourse, setIsFreeCourse] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const params = useParams();
  const courseId = params.courseId;
  const { data: courseByIdData, isLoading: courseByIdLoading,refetch } =
    useGetCourseByIdQuery(courseId,{refetchOnMountOrArgChange:true});

  const [publishCourse] = usePublishCourseMutation();
  const [deleteCourse, { isLoading: isDeletingCourse }] = useDeleteCourseMutation();


  useEffect(() => {
    if (courseByIdData?.course) {
      const course = courseByIdData.course;
      setInput({
        courseTitle: course.courseTitle || "",
        subTitle: course.subTitle || "",
        description: course.description || "",
        subject: getCourseSubject(course),
        gradeLevel: getCourseGradeLevel(course),
        courseLevel: course.courseLevel || "",
        coursePrice: course.coursePrice ?? 0,
        courseThumbnail: "",
      });
      setIsFreeCourse(!course.coursePrice || Number(course.coursePrice) <= 0);
      setExistingThumbnail(course.courseThumbnail || "");
      setPreviewThumbnail("");
    }
  }, [courseByIdData]);

  const [previewThumbnail, setPreviewThumbnail] = useState("");
  const navigate = useNavigate();
  const workspacePath = useWorkspacePath();

  const [editCourse, { data, isLoading, isSuccess, error }] =
    useEditCourseMutation();

  const changeEventHandeler = (e) => {
    const { name, value } = e.target;
    setInput({ ...input, [name]: value });
  };

  const selectCourseLevel = (value) => {
    setInput({ ...input, courseLevel: value });
  };

  const toggleFreeCourse = (checked) => {
    setIsFreeCourse(checked);
    setInput((current) => ({
      ...current,
      coursePrice: checked ? 0 : current.coursePrice || "",
    }));
  };
  //get file
  const selectThumbnail = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setInput({ ...input, courseThumbnail: file });
      const fileReader = new FileReader();
      fileReader.onloadend = () => setPreviewThumbnail(fileReader.result);
      fileReader.readAsDataURL(file);
    }
  };

  const updateCourseHandler = async () => {
    if (!input.courseTitle.trim() || !input.subject.trim()) {
      toast.error("A title and subject are required.");
      return;
    }
    const formData = new FormData();
    formData.append("courseTitle", input.courseTitle);
    formData.append("subTitle", input.subTitle);
    formData.append("description", input.description);
    formData.append("subject", input.subject.trim());
    formData.append("gradeLevel", input.gradeLevel);
    formData.append("courseLevel", input.courseLevel);
    formData.append("coursePrice", isFreeCourse ? 0 : input.coursePrice || 0);
    if (input.courseThumbnail) {
      formData.append("courseThumbnail", input.courseThumbnail);
    }

    await editCourse({ formData, courseId });
  };

  const publishStatusHandler = async (action) => {
    try {
      const response = await publishCourse({ courseId, query:action }).unwrap();
      refetch();
      toast.success(response.message);
    } catch (publishError) {
      toast.error(publishError?.data?.message || "Failed to publish or unpublish course.");
    }
  };

  const handleDeleteCourse = async () => {
    try {
      const response = await deleteCourse(courseId).unwrap();
      setIsDeleteDialogOpen(false);
      toast.success(response?.message || "Course deleted successfully.");
      navigate(workspacePath("/course"));
    } catch (deleteError) {
      toast.error(deleteError?.data?.message || "Failed to delete course.");
    }
  };

  const successMessage = data?.message;
  const errorMessage =
    error?.data?.message ||
    error?.error ||
    "Failed to update course. Please try again.";

  useEffect(() => {
    if (isSuccess) {
      toast.success(successMessage || "Course updated.");
    }
    if (error) {
      toast.error(errorMessage);
    }
  }, [isSuccess, error, successMessage, errorMessage]);

  if(courseByIdLoading) return <PageSkeleton variant="form" />;


  return (
    <Card className="overflow-hidden rounded-[24px] border border-border/80 bg-card shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] dark:border-border dark:bg-card sm:rounded-[30px]">
      <CardHeader className="flex flex-col gap-4 border-b border-border/70 bg-muted/80 px-4 py-4 dark:border-border dark:bg-secondary/40 sm:px-6 sm:py-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <CardTitle className="text-[1.85rem] sm:text-2xl">Basic Course Information</CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-6">
            Update your course title, subject, audience, pricing, and thumbnail from one place.
          </CardDescription>
        </div>
        <div className="hidden sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
          <Button
            disabled={courseByIdData?.course.lectures.length === 0}
            variant="outline"
            className="h-10 rounded-2xl px-3 text-xs font-semibold sm:h-11 sm:px-5 sm:text-sm"
            onClick={() => publishStatusHandler(courseByIdData?.course.isPublished ? "false" : "true")}
          >
            {courseByIdData?.course.isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-10 rounded-2xl px-3 text-xs font-semibold sm:h-11 sm:px-5 sm:text-sm"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete Course
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-4 sm:space-y-6 sm:p-6 md:p-8">
        <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card/70 sm:rounded-3xl sm:p-5">
              <Label className="mb-3 block text-sm font-semibold text-foreground dark:text-foreground">Title</Label>
              <Input
                type="text"
                name="courseTitle"
                value={input.courseTitle}
                onChange={changeEventHandeler}
                placeholder="Ex. Fullstack developer"
                className="h-12 rounded-2xl border-border bg-muted dark:border-border dark:bg-secondary"
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card/70 sm:rounded-3xl sm:p-5">
              <Label className="mb-3 block text-sm font-semibold text-foreground dark:text-foreground">Subtitle</Label>
              <Input
                type="text"
                name="subTitle"
                value={input.subTitle}
                onChange={changeEventHandeler}
                placeholder="Ex. Become a Fullstack developer from zero to hero in 2 month"
                className="h-12 rounded-2xl border-border bg-muted dark:border-border dark:bg-secondary"
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card/70 sm:rounded-3xl sm:p-5">
              <Label className="mb-3 block text-sm font-semibold text-foreground dark:text-foreground">Description</Label>
              <RichTextEditor input={input} setInput={setInput} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card/70 sm:rounded-3xl sm:p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:text-muted-foreground">
                <Tag className="h-4 w-4 text-accent-foreground dark:text-accent-foreground" />
                Course settings
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                <div>
                  <Label htmlFor="edit-course-subject">Subject</Label>
                  <Input id="edit-course-subject" list="edit-course-subject-suggestions" name="subject" value={input.subject} onChange={changeEventHandeler} placeholder="e.g. Biology, Arabic, Computer Science" className="mt-2 h-12 rounded-2xl border-border bg-muted dark:border-border dark:bg-secondary" />
                  <datalist id="edit-course-subject-suggestions">{subjectSuggestions.map((item) => <option key={item} value={item} />)}</datalist>
                  {!input.subject && <p className="mt-2 text-xs text-amber-700">Choose a subject for this course. Older courses may not have one yet.</p>}
                </div>
                <div>
                  <Label>School stage or audience</Label>
                  <Select value={input.gradeLevel} onValueChange={(value) => setInput((current) => ({ ...current, gradeLevel: value }))}>
                    <SelectTrigger className="mt-2 h-12 rounded-2xl border-border bg-muted dark:border-border dark:bg-secondary"><SelectValue placeholder="Optional stage" /></SelectTrigger>
                    <SelectContent><SelectGroup><SelectLabel>Audience</SelectLabel>{gradeOptions.map((item) => <SelectItem key={item} value={item}>{getGradeLabel(item, language)}</SelectItem>)}</SelectGroup></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Course Level</Label>
                  <Select value={input.courseLevel} onValueChange={selectCourseLevel}>
                    <SelectTrigger className="mt-2 h-12 rounded-2xl border-border bg-muted dark:border-border dark:bg-secondary">
                      <SelectValue placeholder="Select a course level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Course Level</SelectLabel>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Advance">Advance</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 xl:col-span-1">
                  <Label>Price in (EGP)</Label>
                  <div className="relative mt-2">
                    <Wallet className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number"
                      name="coursePrice"
                      value={input.coursePrice}
                      onChange={changeEventHandeler}
                      placeholder="199"
                      className="h-12 rounded-2xl border-border bg-muted pl-11 dark:border-border dark:bg-secondary"
                      disabled={isFreeCourse}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
                    {isFreeCourse ? "Free courses are automatically saved with a price of 0 EGP." : "Set the paid price in EGP."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card/70 sm:rounded-3xl sm:p-5">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-muted px-4 py-4 dark:bg-secondary/60">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground dark:text-foreground">
                    {isFreeCourse ? <LockOpen size={16} /> : <BadgeCheck size={16} />}
                    Full course free access
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">
                    Turn this on if learners should access the entire course without payment.
                  </p>
                </div>
                <Switch checked={isFreeCourse} onCheckedChange={toggleFreeCourse} id="free-course-toggle" />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-border dark:bg-card/70 sm:rounded-3xl sm:p-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground dark:text-muted-foreground">
                <ImageUp className="h-4 w-4 text-accent-foreground dark:text-accent-foreground" />
                Course thumbnail
              </div>
              <Input
                type="file"
                onChange={selectThumbnail}
                accept="image/*"
                className="h-12 rounded-2xl border-border bg-muted dark:border-border dark:bg-secondary"
              />
              <div className="mt-4 rounded-2xl border border-border bg-muted p-4 dark:border-border dark:bg-secondary/60">
                <p className="mb-3 text-sm font-medium text-foreground dark:text-foreground">
                  Current thumbnail preview
                </p>
                {previewThumbnail || existingThumbnail ? (
                  <img
                    src={previewThumbnail || existingThumbnail}
                    className="h-48 w-full rounded-2xl object-cover sm:h-64"
                    alt="Course Thumbnail"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    No thumbnail uploaded yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-5 dark:border-border sm:flex-row sm:items-center sm:justify-between sm:pt-6">

          {/* Desktop: Save + Cancel on the right */}
          <div className="hidden sm:flex sm:w-auto sm:gap-3">
            <Button onClick={() => navigate(workspacePath("/course"))} variant="outline" className="h-11 rounded-2xl px-5 text-sm font-semibold">
              Cancel
            </Button>
            <Button disabled={isLoading} onClick={updateCourseHandler} className="h-11 rounded-2xl px-6 text-sm font-semibold">
              {isLoading ? (
                <><BrandedLoader variant="tiny" className="mr-2" />Please wait</>
              ) : "Save"}
            </Button>
          </div>

          {/* Mobile only */}
          <div className="flex flex-col gap-2 sm:hidden">
            {/* Publish / Remove row */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                disabled={courseByIdData?.course.lectures.length === 0}
                variant="outline"
                className="h-10 rounded-2xl text-xs font-semibold"
                onClick={() => publishStatusHandler(courseByIdData?.course.isPublished ? "false" : "true")}
              >
                {courseByIdData?.course.isPublished ? "Unpublish" : "Publish"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-10 rounded-2xl text-xs font-semibold"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                Delete Course
              </Button>
            </div>
            {/* Save full width */}
            <Button disabled={isLoading} onClick={updateCourseHandler} className="h-11 w-full rounded-2xl text-sm font-semibold">
              {isLoading ? (
                <><BrandedLoader variant="tiny" className="mr-2" />Please wait</>
              ) : "Save Changes"}
            </Button>
          </div>

        </div>
      </CardContent>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-[28px] border border-border bg-card shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] dark:border-border dark:bg-card sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete this course?
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-muted-foreground dark:text-muted-foreground">
              This action permanently removes the course, its lectures, uploaded media, quiz assets, and related discussion data.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            <p className="font-semibold">{courseByIdData?.course?.courseTitle || "Selected course"}</p>
            <p className="mt-1">
              {courseByIdData?.course?.lectures?.length ?? 0} lecture(s) will be removed and cannot be restored.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeletingCourse}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-2xl"
              onClick={handleDeleteCourse}
              disabled={isDeletingCourse}
            >
              {isDeletingCourse ? (
                <>
                  <BrandedLoader variant="tiny" className="mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Course"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CourseTab;
