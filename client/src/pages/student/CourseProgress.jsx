import { Badge } from "@/components/ui/badge";
import PageSkeleton from "@/components/PageSkeleton";
import BrandedLoader from "@/components/BrandedLoader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "./CourseProgress.css";
import {
  useAddLectureCommentMutation,
  useCompleteCourseMutation,
  useDeleteLectureCommentMutation,
  useGetCourseProgressQuery,
  useGetLectureCommentsQuery,
  useIncompleteCourseMutation,
  useTogglePinLectureCommentMutation,
  useUpdateLectureProgressMutation,
  useSubmitQuizResultMutation,
} from "@/features/api/courseProgressApi";
import { secureMediaUrl } from "@/lib/secureMediaUrl";
import DOMPurify from "dompurify";
import { CONTACT_NUMBER } from "@/lib/constants";
import { useSelector } from "react-redux";
import { BadgeCheck, CheckCircle, CheckCircle2, CirclePlay, CornerDownRight, Download, FileText, ListChecks, MessageSquare, Phone, Pin, PinOff, PlayCircle, Send, Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import ReactPlayer from "react-player";
import { useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const YOUTUBE_PLAYER_CONFIG = {
  youtube: {
    playerVars: {
      origin: typeof window !== "undefined" ? window.location.origin : undefined,
      modestbranding: 1,
    },
  },
  file: {
    attributes: {
      controlsList: "nodownload noplaybackrate noremoteplayback",
      disablePictureInPicture: true,
      playsInline: true,
      onContextMenu: (e) => e.preventDefault(),
    },
  },
};
const resolveQuestionImageUrl = (question = {}) =>
  question.questionImageUrl ||
  question.questionImage ||
  question.imageUrl ||
  question.image ||
  "";

const CourseProgress = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const courseId = params.courseId;
  const { data, isLoading, isError, refetch } =
    useGetCourseProgressQuery(courseId);

  const [updateLectureProgress] = useUpdateLectureProgressMutation();
  const [completeCourse, { isLoading: isCompletingCourse }] =
    useCompleteCourseMutation();
  const [incompleteCourse, { isLoading: isResettingCourse }] =
    useIncompleteCourseMutation();
  const [addLectureComment, { isLoading: isAddingComment }] =
    useAddLectureCommentMutation();
  const [deleteLectureComment, { isLoading: isDeletingComment }] =
    useDeleteLectureCommentMutation();
  const [togglePinLectureComment, { isLoading: isPinningComment }] =
    useTogglePinLectureCommentMutation();
  const [submitQuizResult, { isLoading: isSubmittingQuizResult }] =
    useSubmitQuizResultMutation();

  const [curerntLecture, setCurrentLecture] = useState(null);
  const [contentViewMode, setContentViewMode] = useState("video");
  const [commentText, setCommentText] = useState("");
  const [activeReplyFor, setActiveReplyFor] = useState(null);
  const [replyTextByComment, setReplyTextByComment] = useState({});
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [quizResultScore, setQuizResultScore] = useState(null);
  const [quizCompletedByLecture, setQuizCompletedByLecture] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem(`lecture-quiz-completed:${courseId}`) || "{}");
    } catch {
      return {};
    }
  });
  const { user } = useSelector((store) => store.auth);
  const lectures = data?.data?.courseDetails?.lectures ?? [];
  const activeLectureId = curerntLecture?._id || lectures[0]?._id || "";
  const requestedLectureId = searchParams.get("lectureId");
  const { data: commentsData, isLoading: commentsLoading } = useGetLectureCommentsQuery(
    { courseId, lectureId: activeLectureId },
    { skip: !activeLectureId }
  );

  useEffect(() => {
    const availableLectures = data?.data?.courseDetails?.lectures;

    if (!requestedLectureId || !availableLectures?.length) {
      return;
    }

    const matchedLecture = availableLectures.find(
      (lecture) => lecture._id === requestedLectureId
    );

    if (matchedLecture) {
      setCurrentLecture(matchedLecture);
    }
  }, [requestedLectureId, data?.data?.courseDetails?.lectures]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        `lecture-quiz-completed:${courseId}`,
        JSON.stringify(quizCompletedByLecture)
      );
    } catch {
      // Ignore storage failures.
    }
  }, [quizCompletedByLecture, courseId]);

  const activeLecture =
    curerntLecture || data?.data?.courseDetails?.lectures?.[0];
  const sanitizedDescription = useMemo(
    () =>
      activeLecture?.description
        ? DOMPurify.sanitize(activeLecture.description).trim()
        : "",
    [activeLecture?.description]
  );

  if (isLoading) {
    return <PageSkeleton variant="courseProgress" />;
  }
  if (isError) {
    return <p>Faild to load course details</p>;
  }

  const { courseDetails, progress, completed } = data.data;
  const { courseTitle } = courseDetails;
  const comments = commentsData?.comments ?? [];
  const commentsByParentId = comments.reduce((map, comment) => {
    const parentId = comment.parentCommentId
      ? comment.parentCommentId.toString()
      : "root";

    if (!map[parentId]) {
      map[parentId] = [];
    }

    map[parentId].push(comment);
    return map;
  }, {});
  const topLevelComments = commentsByParentId.root || [];
  const isLectureVideoCompleted = (lectureId) =>
    progress.some((prog) => prog.lectureId === lectureId && prog.viewed);

  const isLectureQuizCompleted = (lecture) => {
    const quizCount = lecture?.quizQuestions?.length || 0;
    if (!quizCount) {
      return true;
    }

    return Boolean(quizCompletedByLecture[lecture._id]);
  };

  const isLectureFullyCompleted = (lecture) =>
    isLectureVideoCompleted(lecture._id) && isLectureQuizCompleted(lecture);

  const completedLecturesCount = courseDetails.lectures.filter((lecture) =>
    isLectureFullyCompleted(lecture)
  ).length;
  const progressValue = courseDetails.lectures.length
    ? Math.round((completedLecturesCount / courseDetails.lectures.length) * 100)
    : 0;

  // كل الفيديوهات اتشافت مرة واحدة على الأقل؟
  const allVideosWatchedAtLeastOnce = courseDetails.lectures.every((lec) =>
    progress.some((prog) => prog.lectureId === lec._id && prog.viewed)
  );
  // سبق وخلّص الكورس ده قبل كده؟
  const wasCompletedBefore = progress.length > 0;

  // يقدر يكمل لو: شاف كل الفيديوهات، أو سبق وخلّص الكورس
  const canComplete = allVideosWatchedAtLeastOnce || wasCompletedBefore;
  const activeLectureIndex = courseDetails.lectures.findIndex(
    (lecture) => lecture._id === activeLecture?._id
  );
  const lectureQuizQuestions = activeLecture?.quizQuestions ?? [];
  const totalQuizQuestions = lectureQuizQuestions.length;
  const answeredQuizQuestionsCount = Object.keys(quizAnswers).length;

  const isLectureCompleted = (lectureId) => {
    const lecture = courseDetails.lectures.find((item) => item._id === lectureId);
    if (!lecture) {
      return false;
    }

    return isLectureFullyCompleted(lecture);
  };

  const handleLectureProgress = async (lectureId) => {
    if (!lectureId || isLectureCompleted(lectureId)) {
      return;
    }

    try {
      await updateLectureProgress({ courseId, lectureId }).unwrap();
      const updated = await refetch();

      const updatedProgress = updated?.data?.data?.progress ?? [];
      const updatedLectures =
        updated?.data?.data?.courseDetails?.lectures ?? courseDetails.lectures;

      const allCompleted = updatedLectures.every((lec) => {
        const videoViewed = updatedProgress.some(
          (prog) => prog.lectureId === lec._id && prog.viewed
        );
        const hasQuiz = (lec.quizQuestions?.length || 0) > 0;
        const quizDone = hasQuiz ? Boolean(quizCompletedByLecture[lec._id]) : true;

        return videoViewed && quizDone;
      });

      if (allCompleted && !completed) {
        const response = await completeCourse(courseId).unwrap();
        await refetch();
        toast.success(response?.message || "Course marked as completed.", {
          id: `course-complete-${courseId}`,
        });
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update lecture progress.", {
        id: `course-progress-error-${courseId}`,
      });
    }
  };

  //handle select a specific lecture to watch
  const handleSelectLecture = (lecture) => {
    setCurrentLecture(lecture);
    setContentViewMode("video");
    setQuizAnswers({});
    setShowQuizResult(false);
    setQuizResultScore(null);
  };

  const handleOpenLectureVideo = (lecture) => {
    setCurrentLecture(lecture);
    setContentViewMode("video");
  };

  const handleOpenLectureQuiz = (lecture) => {
    setCurrentLecture(lecture);
    setContentViewMode("quiz");
    setQuizAnswers({});
    setShowQuizResult(false);
    setQuizResultScore(null);
  };



  const handleCompleteCourse = async () => {
    try {
      const response = await completeCourse(courseId).unwrap();
      await refetch();
      toast.success(response?.message || "Course marked as completed.", {
        id: `course-complete-${courseId}`,
      });
    } catch (error) {
      toast.error(error?.data?.message || "Failed to mark course as complete.", {
        id: `course-complete-error-${courseId}`,
      });
    }
  };
  const handleInCompleteCourse = async () => {
    try {
      const response = await incompleteCourse(courseId).unwrap();
      await refetch();
      toast.success(response?.message || "Course marked as incomplete.", {
        id: `course-incomplete-${courseId}`,
      });
    } catch (error) {
      toast.error(error?.data?.message || "Failed to mark course as incomplete.", {
        id: `course-incomplete-error-${courseId}`,
      });
    }
  };

  const handleAddComment = async () => {
    const normalizedComment = commentText.trim();

    if (!normalizedComment || !activeLecture?._id) {
      return;
    }

    try {
      const response = await addLectureComment({
        courseId,
        lectureId: activeLecture._id,
        text: normalizedComment,
      }).unwrap();
      setCommentText("");
      toast.success(response?.message || "Comment added successfully.");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to add comment.");
    }
  };

  const handleAddReply = async (parentCommentId) => {
    const normalizedReply = (replyTextByComment[parentCommentId] || "").trim();

    if (!normalizedReply || !activeLecture?._id) {
      return;
    }

    try {
      const response = await addLectureComment({
        courseId,
        lectureId: activeLecture._id,
        text: normalizedReply,
        parentCommentId,
      }).unwrap();

      setReplyTextByComment((currentValue) => ({
        ...currentValue,
        [parentCommentId]: "",
      }));
      setActiveReplyFor(null);
      toast.success(response?.message || "Reply added successfully.");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to add reply.");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!activeLecture?._id) {
      return;
    }

    try {
      const response = await deleteLectureComment({
        courseId,
        lectureId: activeLecture._id,
        commentId,
      }).unwrap();
      toast.success(response?.message || "Comment deleted successfully.");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to delete comment.");
    }
  };

  const handleTogglePinnedComment = async (commentId) => {
    if (!activeLecture?._id) {
      return;
    }

    try {
      const response = await togglePinLectureComment({
        courseId,
        lectureId: activeLecture._id,
        commentId,
      }).unwrap();

      toast.success(response?.message || "Comment pin status updated.");
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update pinned comment.");
    }
  };

  const renderCommentNode = (comment, depth = 0) => {
    const canModerate = user?.role === "admin" || (user?.role === "instructor" && user?._id === courseDetails?.creator?._id);
    const canDelete =
      user?._id === comment.userId?._id || canModerate;
    const canPin = canModerate && !comment.parentCommentId;
    const isNested = depth > 0;
    const normalizedDepth = Math.min(depth, 6);
    const depthOffset = normalizedDepth * 16;
    const commenterName = comment.userId?.name || "User";
    const commenterInitials = commenterName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2);
    const children = commentsByParentId[comment._id] || [];
    const isReplying = activeReplyFor === comment._id;

    return (
      <div
        key={comment._id}
        className="relative"
        style={{ marginLeft: depthOffset }}
      >
        {isNested && (
          <>
            <span className="absolute -left-4 top-0 h-full w-px bg-muted" />
            <span className="absolute -left-4 top-6 h-px w-4 bg-secondary" />
          </>
        )}
        <div
          className={`rounded-2xl border bg-card shadow-sm transition hover:border-border   ${
            isNested ? "p-3.5" : "p-4"
          } ${
            comment.isPinned
              ? "border-amber-300/90 ring-1 ring-amber-200 dark:border-amber-400/40 dark:ring-amber-500/20"
              : "border-border "
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <Avatar
                className={`${isNested ? "h-8 w-8" : "h-10 w-10"} shrink-0 ring-2 ring-border `}
              >
                <AvatarImage
                  src={
                    comment.userId?.photoUrl || "/default-avatar.webp"
                  }
                  alt={commenterName}
                />
                <AvatarFallback
                  className={`${isNested ? "text-[10px]" : "text-xs"} font-semibold uppercase`}
                >
                  {commenterInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={`truncate ${isNested ? "text-[13px]" : "text-sm"} font-semibold text-foreground `}
                  >
                    {commenterName}
                  </p>
                  {comment.isPinned && !comment.parentCommentId && (
                    <Badge className="h-5 rounded-full bg-amber-100 px-2 text-[10px] font-bold uppercase tracking-wide text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300">
                      Pinned
                    </Badge>
                  )}
                </div>
                <p
                  className={`${isNested ? "mt-0.5 text-[11px]" : "mt-1 text-xs"} text-muted-foreground `}
                >
                  {new Date(comment.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {canPin && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isPinningComment}
                  onClick={() => handleTogglePinnedComment(comment._id)}
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:text-amber-600 dark:hover:text-amber-300"
                  title={comment.isPinned ? "Unpin comment" : "Pin comment"}
                >
                  {comment.isPinned ? (
                    <PinOff className="h-4 w-4" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </Button>
              )}
              {canDelete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isDeletingComment}
                  onClick={() => handleDeleteComment(comment._id)}
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <p
            className={`mt-3 whitespace-pre-wrap rounded-xl bg-muted px-3 py-2.5 ${isNested ? "text-[13px] leading-5" : "text-sm leading-6"} text-muted-foreground  `}
          >
            {comment.replyToUserId?.name
              ? `@${comment.replyToUserId.name} `
              : ""}
            {comment.text}
          </p>

          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setActiveReplyFor((currentValue) =>
                  currentValue === comment._id ? null : comment._id,
                )
              }
              className="h-8 rounded-xl px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-primary"
            >
              <CornerDownRight className="mr-1.5 h-3.5 w-3.5" />
              Reply
            </Button>
          </div>

          {isReplying && (
            <div className="mt-3 rounded-2xl border border-border bg-muted p-3">
              <textarea
                value={replyTextByComment[comment._id] || ""}
                onChange={(event) =>
                  setReplyTextByComment((currentValue) => ({
                    ...currentValue,
                    [comment._id]: event.target.value,
                  }))
                }
                placeholder={`Reply to ${commenterName}`}
                className="min-h-20 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-border focus:ring-2 focus:ring-ring"
              />
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-xl px-3 text-xs"
                  onClick={() => setActiveReplyFor(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="h-8 rounded-xl px-3 text-xs"
                  disabled={
                    isAddingComment ||
                    !(replyTextByComment[comment._id] || "").trim()
                  }
                  onClick={() => handleAddReply(comment._id)}
                >
                  {isAddingComment ? "Posting..." : "Post Reply"}
                </Button>
              </div>
            </div>
          )}

          {children.length > 0 && (
            <div className="mt-3 space-y-2.5">
              {children.map((childComment) =>
                renderCommentNode(childComment, depth + 1),
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const updateQuizAnswer = (questionIndex, optionIndex) => {
    setQuizAnswers((currentValue) => ({
      ...currentValue,
      [questionIndex]: optionIndex,
    }));
  };

  const submitQuiz = async () => {
    if (!totalQuizQuestions) {
      return;
    }

    if (answeredQuizQuestionsCount !== totalQuizQuestions) {
      toast.error("Please answer all quiz questions first.");
      return;
    }

    if (!activeLecture?._id) {
      return;
    }

    try {
      const response = await submitQuizResult({
        courseId,
        lectureId: activeLecture._id,
        answers: lectureQuizQuestions.map((_, index) => quizAnswers[index]),
      }).unwrap();
      setQuizResultScore(response.score);
      setShowQuizResult(true);

      setQuizCompletedByLecture((currentValue) => ({
        ...currentValue,
        [activeLecture._id]: true,
      }));

      if (typeof response?.remainingAttempts === "number") {
        toast.success(
          `Quiz submitted. Remaining attempts: ${response.remainingAttempts}`
        );
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to submit quiz result.");
    }
  };

  const shouldShowComments = contentViewMode !== "quiz";

  const commentsSection = (
    <div className="rounded-3xl border border-border bg-background p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h4 className="text-base font-semibold text-foreground">
            Comments
          </h4>
        </div>
        <Badge variant="outline" className="rounded-full border-border bg-card px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {topLevelComments.length} threads
        </Badge>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <textarea
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder="Write a comment about this lecture"
          className="min-h-24 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-border focus:ring-2 focus:ring-ring"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleAddComment}
            disabled={isAddingComment || !commentText.trim() || !activeLecture?._id}
            className="rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="mr-2 h-4 w-4" />
            {isAddingComment ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-3.5">
        {commentsLoading ? (
          <BrandedLoader variant="inline" className="py-2" />
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No comments yet. Start the discussion for this lecture.
          </p>
        ) : (
          topLevelComments.map((comment) => renderCommentNode(comment))
        )}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 md:px-8 md:py-8">
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-wide">
                Course Progress
              </Badge>
              {completed && (
                <Badge className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Completed
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold leading-tight sm:text-2xl md:text-3xl">{courseTitle}</h1>
            <div className="max-w-xl space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{completedLecturesCount} of {courseDetails.lectures.length} lectures completed</span>
                <span className="font-semibold">{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
          </div>
          <div className="grid w-full grid-cols-1 gap-2.5 sm:w-auto sm:grid-cols-[auto_auto] sm:items-center">
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted px-4 py-2.5 text-muted-foreground sm:justify-start">
              <PlayCircle className="h-4 w-4 text-muted-foreground" />
              <div className="text-center sm:text-left">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Now Playing</p>
                <p className="text-sm font-semibold text-foreground">
                  Lecture {activeLectureIndex + 1 > 0 ? activeLectureIndex + 1 : 1}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-start">
            <Button
              onClick={completed ? handleInCompleteCourse : handleCompleteCourse}
              variant={completed ? "outline" : "default"}
              title={!completed && !canComplete ? "Watch all lectures at least once first" : ""}
              className={`hidden h-11 w-full rounded-xl px-5 text-sm font-semibold shadow-sm transition sm:inline-flex sm:min-w-44 sm:w-auto ${
                completed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                  : canComplete
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "cursor-not-allowed bg-secondary text-muted-foreground  "
              }`}
              disabled={isCompletingCourse || isResettingCourse || (!completed && !canComplete)}
            >
              {completed ? (
                <div className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  <span>Completed</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  <span>Complete Course</span>
                </div>
              )}
            </Button>
            {!completed && !canComplete && (
              <p className="mt-2 hidden text-center text-xs text-muted-foreground sm:block sm:text-left">Watch all lectures once to unlock</p>
            )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        <Card className="overflow-hidden border-border shadow-sm">
          <CardContent className="p-4 md:p-5">
            {contentViewMode === "video" ? (
              <div
                className="overflow-hidden rounded-2xl bg-black shadow-sm"
                onContextMenu={(e) => e.preventDefault()}
              >
                <ReactPlayer
                  src={secureMediaUrl(activeLecture?.videoUrl)}
                  controls
                  playsinline
                  config={YOUTUBE_PLAYER_CONFIG}
                  width="100%"
                  height="100%"
                  className="aspect-video"
                  onEnded={() =>
                    handleLectureProgress(curerntLecture?._id || activeLecture?._id)
                  }
                  onReady={(player) => {
                    const internalPlayer =
                      player && typeof player.getInternalPlayer === "function"
                        ? player.getInternalPlayer()
                        : null;

                    if (!internalPlayer || typeof internalPlayer !== "object") {
                      return;
                    }

                    if (typeof internalPlayer.setAttribute === "function") {
                      internalPlayer.setAttribute(
                        "controlsList",
                        "nodownload noplaybackrate noremoteplayback"
                      );
                    }

                    internalPlayer.disablePictureInPicture = true;
                    internalPlayer.oncontextmenu = () => false;
                  }}
                />
              </div>            ) : (
              <div className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-primary" />
                    <h4 className="text-base font-semibold text-foreground">
                      Lecture Quiz
                    </h4>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                    {totalQuizQuestions} questions
                  </Badge>
                </div>

                {totalQuizQuestions === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    No quiz questions were added to this lecture yet.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {lectureQuizQuestions.map((question, questionIndex) => {
                      const questionImageUrl = resolveQuestionImageUrl(question);
                      return (
                        <div key={questionIndex} className="rounded-2xl border border-border bg-muted p-4">
                        <p className="text-sm font-semibold text-foreground">
                          {questionIndex + 1}.
                        </p>
                        {question.questionText && (
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {question.questionText}
                          </p>
                        )}
                        {questionImageUrl && (
                          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card">
                            <img
                              src={secureMediaUrl(questionImageUrl)}
                              alt={`Question ${questionIndex + 1}`}
                              className="max-h-80 w-full object-contain"
                            />
                          </div>
                        )}
                        <div className="mt-3 space-y-2">
                          {question.options?.map((option, optionIndex) => {
                            const isSelected = quizAnswers[questionIndex] === optionIndex;
                            return (
                              <label
                                key={optionIndex}
                                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition ${
                                  isSelected
                                    ? "border-border bg-accent text-primary   "
                                    : "border-border bg-card text-muted-foreground   "
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`quiz-question-${questionIndex}`}
                                  checked={isSelected}
                                  onChange={() => updateQuizAnswer(questionIndex, optionIndex)}
                                  className="h-4 w-4"
                                />
                                <span>{option}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      );
                    })}

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">
                        Answered {answeredQuizQuestionsCount} / {totalQuizQuestions}
                      </p>
                      <Button
                        type="button"
                        onClick={submitQuiz}
                        className="rounded-2xl"
                        disabled={isSubmittingQuizResult}
                      >
                        {isSubmittingQuizResult ? "Submitting..." : "Check Answers"}
                      </Button>
                    </div>

                    {showQuizResult && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                        Your score: {quizResultScore} / {totalQuizQuestions}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Current Lecture
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground sm:text-xl">
                  {`Lecture ${activeLectureIndex + 1 > 0 ? activeLectureIndex + 1 : 1}: ${
                    activeLecture?.lectureTitle || "No lecture selected"
                  }`}
                </h3>
              </div>
              <Badge className="w-fit rounded-full bg-muted text-muted-foreground hover:bg-muted">
                {contentViewMode === "quiz" ? (
                  <>
                    <ListChecks className="mr-1 h-4 w-4" /> Quiz Mode
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-1 h-4 w-4" /> Watching
                  </>
                )}
              </Badge>
            </div>

            <Tabs defaultValue="overview" className="mt-5">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="overview" className="flex-1 sm:flex-none">Overview</TabsTrigger>
                <TabsTrigger value="resources" className="flex-1 sm:flex-none">Resources</TabsTrigger>
                <TabsTrigger value="instructor" className="flex-1 sm:flex-none">Instructor</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <div className="rounded-2xl border border-border bg-muted p-4">
                  <h4 className="text-sm font-semibold text-foreground">Lecture Description</h4>
                  {sanitizedDescription ? (
                    <div
                      className="mt-2 text-sm leading-relaxed text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
                    />
                  ) : (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      No description has been added for this lecture yet.
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="resources" className="mt-4">
                <div className="rounded-2xl border border-border bg-muted p-4">
                  <h4 className="text-sm font-semibold text-foreground">Downloadable Attachments</h4>
                  {activeLecture?.attachmentUrl ? (
                    <ul className="mt-3 space-y-2">
                      <li className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
                        <FileText className="h-4 w-4 shrink-0 text-primary" />
                        <a
                          href={activeLecture.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-sm text-muted-foreground hover:underline"
                        >
                          {activeLecture.lectureTitle || "Download Lecture Notes"}
                        </a>
                        <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </li>
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">
                      No attachments available for this lecture.
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="instructor" className="mt-4">
                <div className="rounded-2xl border border-border bg-muted p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {courseDetails?.creator?.name || "Unknown Instructor"}
                    </span>
                    {courseDetails?.creator?.emailVerified && (
                      <Badge className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-accent">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <a
                    href={`tel:+${CONTACT_NUMBER}`}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    +{CONTACT_NUMBER}
                  </a>
                </div>
              </TabsContent>
            </Tabs>

          </CardContent>
        </Card>

        {/* ===== بداية القائمة المدمجة الجديدة (Compact Lectures List) ===== */}
        <Card className="flex flex-col overflow-hidden border-border shadow-sm lg:sticky lg:top-24 lg:h-[550px] mb-4 h-[420px]">
          <CardContent className="flex flex-col p-0 h-full">
            {/* Header */}
            <div className="border-b border-border bg-card p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Course Lectures</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose a lecture to continue.
                  </p>
                </div>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {courseDetails.lectures.length} total
                </Badge>
              </div>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-2 pb-4 space-y-2 custom-scrollbar bg-muted">
              {courseDetails?.lectures.map((lecture, index) => {
                const isActive = lecture._id === activeLecture?._id;
                const hasQuiz = lecture.quizQuestions?.length > 0;
                const isCompleted = isLectureCompleted(lecture._id);

                return (
                  <div
                    key={lecture._id}
                    className={`flex flex-col overflow-hidden rounded-lg border transition-all duration-200 ${
                      isActive
                        ? "border-border bg-accent shadow-sm ring-1 ring-ring   "
                        : "border-border bg-card hover:border-border hover:bg-muted   "
                    }`}
                  >
                    {/* Main Clickable Row */}
                    <button
                      onClick={() => handleSelectLecture(lecture)}
                      className="flex w-full items-center gap-3 p-2 text-left outline-none"
                    >
                      {/* Icon */}
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                          : isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground  "
                      }`}>
                        {isCompleted ? <CheckCircle2 size={14} /> : isActive ? <CirclePlay size={14} /> : <PlayCircle size={14} />}
                      </div>

                      {/* Title */}
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${
                          isActive ? "text-primary " : "text-muted-foreground "
                        }`}>
                          <span className="mr-1.5 text-xs font-bold opacity-50">{index + 1}.</span>
                          {lecture.lectureTitle}
                        </p>
                      </div>

                      {/* Quiz Indicator (Only if not active, to save space) */}
                      {!isActive && hasQuiz && (
                        <div className="shrink-0 text-muted-foreground" title="Contains Quiz">
                          <ListChecks size={16} />
                        </div>
                      )}
                    </button>

                    {/* Expanded Actions (Video & Quiz toggles) - Shows ONLY when active */}
                    {isActive && hasQuiz && (
                      <div className="flex items-center gap-2 px-[3.25rem] pb-2 pt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenLectureVideo(lecture); }}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                            contentViewMode === "video"
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "border border-border bg-card text-muted-foreground hover:bg-muted   "
                          }`}
                        >
                          <PlayCircle className="h-4 w-4" /> Video
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenLectureQuiz(lecture); }}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                            contentViewMode === "quiz"
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "border border-border bg-card text-muted-foreground hover:bg-muted   "
                          }`}
                        >
                          <ListChecks className="h-4 w-4" /> Quiz ({lecture.quizQuestions.length})
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        {/* ===== نهاية القائمة المدمجة ===== */}
      </div>

      {shouldShowComments && (
        <div className="mt-6 space-y-3 sm:space-y-0">
          <div className="flex flex-col items-start">
          <Button
            onClick={completed ? handleInCompleteCourse : handleCompleteCourse}
            variant={completed ? "outline" : "default"}
            title={!completed && !allVideosWatchedAtLeastOnce ? "Watch all lectures at least once first" : ""}
            className={`h-11 w-full rounded-xl px-5 text-sm font-semibold shadow-sm transition sm:hidden ${
              completed
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
                : allVideosWatchedAtLeastOnce
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "cursor-not-allowed bg-secondary text-muted-foreground  "
            }`}
            disabled={isCompletingCourse || isResettingCourse || (!completed && !canComplete)}
          >
            {completed ? (
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4" />
                <span>Completed</span>
              </div>
            ) : (
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4" />
                <span>Complete Course</span>
              </div>
            )}
          </Button>
          {!completed && !canComplete && (
            <p className="mt-2 text-center text-xs text-muted-foreground sm:text-left sm:hidden">Watch all lectures once to unlock</p>
          )}
          </div>
          {commentsSection}
        </div>
      )}
    </div>
  );
};

export default CourseProgress;
