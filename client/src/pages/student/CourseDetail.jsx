import { useUiText, useFeedbackText } from "@/components/useUiText";
import BuyCourseButton from "@/components/BuyCourseButton";
import PageSkeleton from "@/components/PageSkeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  useLiveCoursePurchaseStatus,
  useVerifyCheckoutSessionMutation,
} from "@/features/api/purchaseApi";
import { useGetCourseByIdQuery, useGetPublicCourseByIdQuery } from "@/features/api/courseApi";
import { secureMediaUrl } from "@/lib/secureMediaUrl";
import { getCourseGradeLevel, getCourseSubject, getGradeLabel } from "@/lib/courseTaxonomy";

import {
  BadgeInfo,
  BookOpen,
  Clock3,
  Lock,
  PlayCircle,
  Users,
} from "lucide-react";
import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ReactPlayer from "react-player";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { useSelector } from "react-redux";
import { useLanguage } from "@/components/languageContext";

const YOUTUBE_PLAYER_CONFIG = {
  youtube: {
    playerVars: {
      origin: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  },
};

const CourseDetail = () => {
  const feedback = useFeedbackText();
  const ui = useUiText();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const { t, language } = useLanguage();
  const params = useParams();
  const courseId = params.courseId;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedLectureId, setSelectedLectureId] = React.useState(null);
  const sessionId = searchParams.get("session_id");
  const {
    data,
    isLoading,
    isError,
    refetch,
  } =
    useLiveCoursePurchaseStatus(courseId, { skip: !courseId || !isAuthenticated });
  const {
    data: fallbackCourseData,
    isLoading: isFallbackLoading,
    isError: isFallbackError,
  } = useGetCourseByIdQuery(courseId, {
    skip: !courseId || !isAuthenticated || !isError,
  });
  const {
    data: publicCourseData,
    isLoading: isPublicLoading,
    isError: isPublicError,
  } = useGetPublicCourseByIdQuery(courseId, {
    skip: !courseId || (isAuthenticated && !isError),
  });
  const [verifyCheckoutSession, { isLoading: isVerifyingPayment }] =
    useVerifyCheckoutSessionMutation();

  const course = data?.course || fallbackCourseData?.course || publicCourseData?.course;
  const hasAccess = isAuthenticated && Boolean(data?.hasAccess);
  const isFreeCourse = data?.isFreeCourse ?? (!course?.coursePrice || course.coursePrice <= 0);
  const lectures = course?.lectures ?? [];
  const isPreviewLecture = (lecture) =>
    typeof lecture?.previewEnabledByAdmin === "boolean"
      ? Boolean(lecture.previewEnabledByAdmin && lecture.isPreviewFree)
      : Boolean(lecture?.isPreviewFree);
  const defaultLecture = hasAccess
    ? lectures.find((lecture) => lecture.videoUrl) || lectures[0]
    : lectures.find((lecture) => isPreviewLecture(lecture) && lecture.videoUrl);
  const selectedLecture =
    lectures.find((lecture) => lecture._id === selectedLectureId) || defaultLecture;
  const hasPreviewVideo = Boolean(selectedLecture?.videoUrl);
  const enrolledStudentsCount = course?.enrolledStudents?.length ?? 0;
  const lectureCount = lectures.length;
  const formattedUpdatedDate = course?.updatedAt
    ? new Date(course.updatedAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-GB")
    : ui("Not available");
  const isLectureAccessible = (lecture) => hasAccess || isPreviewLecture(lecture);
  const accessibleLecturesCount = lectures.filter((lecture) => isLectureAccessible(lecture)).length;
  const lockedLecturesCount = Math.max(lectureCount - accessibleLecturesCount, 0);
  const priceLabel =
    typeof course?.coursePrice === "number" && course.coursePrice > 0
      ? ui("{0} EGP", course.coursePrice)
      : ui("Free");

  React.useEffect(() => {
    if (!selectedLectureId && defaultLecture?._id) {
      setSelectedLectureId(defaultLecture._id);
    }
  }, [defaultLecture?._id, selectedLectureId]);

  React.useEffect(() => {
    if (!sessionId || hasAccess || !isAuthenticated) {
      return;
    }

    let isMounted = true;

    const verifyPayment = async () => {
      try {
        const response = await verifyCheckoutSession({ sessionId, courseId }).unwrap();

        if (!isMounted) {
          return;
        }

        await refetch();
        toast.success(feedback(response.message, ui("Changes saved.")));
        navigate(`/course-progress/${courseId}`, { replace: true });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        toast.error(feedback(error?.data?.message || ui("Failed to verify purchase."), ui("Failed to verify purchase.")));
      }
    };

    verifyPayment();

    return () => {
      isMounted = false;
    };
  }, [sessionId, hasAccess, isAuthenticated, verifyCheckoutSession, courseId, refetch, navigate, ui, feedback]);

  if ((isAuthenticated && isLoading) || isPublicLoading || (isAuthenticated && isError && isFallbackLoading)) {
    return <PageSkeleton variant="courseDetail" />;
  }
  if (!course && (isPublicError || (isAuthenticated && isError && isFallbackError))) {
    return <h1>{ui("Failed to load course details")}</h1>;
  }
  if (!course) return <PageSkeleton variant="courseDetail" />;
  if (sessionId && !hasAccess && isVerifyingPayment) {
    return <h1>{ui("Confirming your payment...")}</h1>;
  }

  const handleContinueCourse = () => {
    if (hasAccess) {
      navigate(`/course-progress/${courseId}`);
    }
  };

  const handleSelectLecture = (lecture) => {
    if (!isLectureAccessible(lecture)) {
      return;
    }

    setSelectedLectureId(lecture._id);
  };

  return (
    <div className="min-h-screen bg-background pt-5 text-foreground">
      <div className="border-b border-border bg-card text-foreground shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 md:px-8 lg:flex-row lg:items-end lg:justify-between lg:gap-8 lg:py-14">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-primary backdrop-blur">
              <BookOpen className="h-3.5 w-3.5" />{" "}{ui("Course Overview")}{" "}</div>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl">
            {course?.courseTitle}
            </h1>
            <div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-secondary px-3 py-1.5">{getCourseSubject(course) || t("subjectPending")}</span>{getCourseGradeLevel(course) && <span className="rounded-full bg-secondary px-3 py-1.5">{getGradeLabel(getCourseGradeLevel(course), language)}</span>}</div>
            <p className="max-w-2xl text-sm leading-7 text-foreground md:text-base">
              {course?.subTitle || ui("Master the course step by step with guided lectures and practical lessons.")}
            </p>
            <p className="text-sm text-foreground md:text-base">{" "}{ui("Created By")}{" "}
              <span className="font-semibold text-primary underline underline-offset-4">
                {course?.creator?.name || ui("Unknown instructor")}
              </span>
            </p>
          </div>
          <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-secondary p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
                <BadgeInfo className="h-3.5 w-3.5" />{" "}{ui("Updated")}{" "}</div>
              <p className="mt-3 text-sm font-semibold text-foreground">{formattedUpdatedDate}</p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
                <Users className="h-3.5 w-3.5" />{" "}{ui("Students")}{" "}</div>
              <p className="mt-3 text-sm font-semibold text-foreground">{enrolledStudentsCount}{" "}{ui("enrolled")}</p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary p-4 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-foreground">
                <Clock3 className="h-3.5 w-3.5" />{" "}{ui("Lectures")}{" "}</div>
              <p className="mt-3 text-sm font-semibold text-foreground">{lectureCount}{" "}{ui("lessons")}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 md:px-8 lg:flex-row lg:items-start lg:gap-10 lg:py-10">
        <div className="order-2 w-full space-y-6 lg:order-1 lg:min-w-0 lg:flex-1">
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-sm backdrop-blur md:p-8">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-10 w-1 rounded-full bg-primary" />
              <h1 className="text-xl font-bold md:text-2xl">{ui("Description")}</h1>
            </div>
          <p
            className="prose text-foreground max-w-none text-sm leading-7 dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(course?.description || ui("No description available.")) }}
          />
          </div>
          <Card className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm backdrop-blur">
            <CardHeader className="border-b border-border pb-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <CardTitle className="text-xl">{ui("Course Content")}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    {lectureCount}{" "}{ui("lectures available in this course")}{" "}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    {accessibleLecturesCount}{" "}{ui("accessible")}{" "}</div>
                  <div className="rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    {lockedLecturesCount}{" "}{ui("locked")}{" "}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-5 md:p-6">
              <div className="max-h-[68vh] overflow-auto pr-2 space-y-2">
              {lectures.map((lecture, index) => (
                <button
                  key={lecture._id}
                  type="button"
                  onClick={() => handleSelectLecture(lecture)}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                    selectedLecture?._id === lecture._id
                      ? "border-border bg-accent text-foreground shadow-sm   "
                      : "border-transparent bg-muted hover:border-border hover:bg-muted   "
                  } ${
                    isLectureAccessible(lecture)
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-70"
                  }`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground shadow-sm">
                    {isLectureAccessible(lecture) ? <PlayCircle size={14} /> : <Lock size={14} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <p className="truncate">{lecture.lectureTitle || ui("Lecture {0}", index + 1)}</p>
                    </div>
                    {!isLectureAccessible(lecture) && (
                      <p className="mt-1 text-xs text-muted-foreground">{" "}{ui("Available after purchase")}{" "}</p>
                    )}
                  </div>
                  {!isLectureAccessible(lecture) && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{" "}{ui("Locked")}{" "}</span>
                  )}
                </button>
              ))}
              </div>
              {lectureCount === 0 && (
                <p className="text-sm text-muted-foreground">{ui("No lectures added yet.")}</p>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="order-1 w-full lg:order-2 lg:sticky lg:top-24 lg:w-[320px] lg:shrink-0">
          <Card className="overflow-hidden rounded-[30px] border border-border bg-card shadow-sm backdrop-blur">
            <CardContent className="space-y-5 p-5 md:p-6">
              <div className="overflow-hidden rounded-3xl border border-border bg-black shadow-lg">
                {hasPreviewVideo ? (
                  <ReactPlayer
                    width="100%"
                    height={"100%"}
                    src={secureMediaUrl(selectedLecture.videoUrl)}
                    controls={true}
                    config={YOUTUBE_PLAYER_CONFIG}
                    className="aspect-video"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted px-4 text-center text-sm text-muted-foreground">
                    {hasAccess
                      ? ui("No lecture video is available yet.")
                      : ui("No free preview is available for this course.")}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{" "}{ui("Preview Lecture")}{" "}</p>
                <h1 className="text-2xl font-bold leading-snug text-foreground">
                  {selectedLecture?.lectureTitle || ui("Preview not available")}
                </h1>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-muted px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{" "}{ui("Access")}{" "}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {hasAccess ? ui("Unlocked") : ui("Preview only")}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-muted px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{" "}{ui("Price")}{" "}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {hasAccess ? ui("Included") : priceLabel}
                    </p>
                  </div>
                </div>
              </div>
              {!hasAccess && !isFreeCourse && (
                <div className="rounded-2xl border border-border bg-accent px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{" "}{ui("Course Price")}{" "}</p>
                  <h1 className="mt-2 text-3xl font-extrabold text-foreground">
                    {priceLabel}
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground">{" "}{ui("Unlock every lecture and continue the course without restrictions.")}{" "}</p>
                </div>
              )}
            </CardContent>
            <Separator className="bg-muted" />
            <CardFooter className={"p-5 md:p-6"}>
              {!isAuthenticated ? (
                <Button onClick={() => navigate("/login?mode=login", { state: { from: `/course-detail/${courseId}` } })} className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90">{t("signInToStart")}</Button>
              ) : hasAccess ? (
                <Button
                  onClick={handleContinueCourse}
                  className={"h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"}
                >{" "}{ui("Continue Course")}{" "}</Button>
              ) : (
                <div className="w-full space-y-3">
                  {data?.pendingManualOrder && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">{t("orderPendingNotice")} <span dir="ltr" className="font-mono">#{data.pendingManualOrder.reference}</span></p>}
                  <BuyCourseButton courseId={courseId} />
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
