import { useUiText, useFeedbackText } from "@/components/useUiText";
import { useLanguage } from "@/components/languageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGetCourseQuizResultsQuery,
  useLazyGetQuizResultHistoryQuery,
} from "@/features/api/courseProgressApi";
import { useGetCreatorCourseQuery, useGetAdminManageableCoursesQuery } from "@/features/api/courseApi";
import { useSelector } from "react-redux";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Award,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  History,
  ListChecks,
  Users,
} from "lucide-react";
import React, { useState } from "react";
import BrandedLoader from "@/components/BrandedLoader";
import { toast } from "sonner";

const QuizDashboard = () => {
  const feedback = useFeedbackText();
  const ui = useUiText();
  const { language } = useLanguage();
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedLectureId, setSelectedLectureId] = useState("all");
  const [expandedHistoryKey, setExpandedHistoryKey] = useState(null);
  const [historyByResultId, setHistoryByResultId] = useState({});

  const isAdmin = useSelector((state) => state.auth.user?.role === "admin");
  const creatorQuery = useGetCreatorCourseQuery(undefined, { skip: isAdmin });
  const adminQuery = useGetAdminManageableCoursesQuery(undefined, { skip: !isAdmin });
  const { data: coursesData, isLoading: coursesLoading } = isAdmin ? adminQuery : creatorQuery;
  const { data: quizData, isLoading: quizLoading, isError: quizError, refetch: refetchQuiz } = useGetCourseQuizResultsQuery(
    selectedCourseId,
    { skip: !selectedCourseId }
  );
  const [getQuizResultHistory, { isLoading: isHistoryLoading }] =
    useLazyGetQuizResultHistoryQuery();

  const courses = coursesData?.courses ?? [];
  const lectures = quizData?.lectures ?? [];
  const allResults = quizData?.results ?? [];

  const filteredResults =
    selectedLectureId === "all"
      ? allResults
      : allResults.filter((r) => r.lectureId?._id === selectedLectureId);

  const uniqueStudents = new Set(allResults.map((r) => r.userId?._id)).size;
  const totalAttempts = allResults.reduce(
    (sum, result) => sum + (result.attemptsCount || result.history?.length || 1),
    0
  );
  const avgPercentage = allResults.length
    ? Math.round(allResults.reduce((sum, r) => sum + r.percentage, 0) / allResults.length)
    : 0;

  const selectedCourse = courses.find((c) => c._id === selectedCourseId);

  const getPerformanceGrade = (percent, passMark) => {
    if (percent >= Math.max(80, passMark)) {
      return {
        label: ui("Excellent"),
        color: "text-emerald-700 dark:text-emerald-400",
        bar: "bg-emerald-500",
        pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      };
    }

    if (percent >= passMark) {
      return {
        label: ui("Good"),
        color: "text-amber-700 dark:text-amber-400",
        bar: "bg-amber-500",
        pill: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      };
    }

    return {
      label: ui("Needs Work"),
      color: "text-red-700 dark:text-red-400",
      bar: "bg-red-500",
      pill: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    };
  };

  const formatSubmittedAt = (dateValue) =>
    dateValue
      ? new Date(dateValue).toLocaleDateString(language === "ar" ? "ar-EG" : "en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const statCards = [
    {
      title: ui("Total Attempts"),
      value: totalAttempts,
      subtitle: ui("All attempts across students"),
      icon: History,
      gradient: "from-primary to-primary/70",
      lightBg: "bg-accent dark:bg-accent/30",
      textColor: "text-accent-foreground dark:text-accent-foreground",
    },
    {
      title: ui("Quiz Records"),
      value: allResults.length,
      subtitle: ui("Unique student x lecture records"),
      icon: ClipboardList,
      gradient: "from-primary to-primary/70",
      lightBg: "bg-accent dark:bg-accent/30",
      textColor: "text-accent-foreground dark:text-accent-foreground",
    },
    {
      title: ui("Unique Students"),
      value: uniqueStudents,
      subtitle: ui("Students who took at least one quiz"),
      icon: Users,
      gradient: "from-amber-500 to-orange-500",
      lightBg: "bg-amber-50 dark:bg-amber-950/30",
      textColor: "text-amber-600 dark:text-amber-400",
    },
    {
      title: ui("Average Score"),
      value: `${avgPercentage}%`,
      subtitle: ui("Latest percentage average"),
      icon: Award,
      gradient: "from-emerald-500 to-teal-500",
      lightBg: "bg-emerald-50 dark:bg-emerald-950/30",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
  ];

  const handleToggleHistory = async (rowKey, resultId) => {
    if (expandedHistoryKey === rowKey) {
      setExpandedHistoryKey(null);
      return;
    }

    setExpandedHistoryKey(rowKey);

    if (historyByResultId[resultId]) {
      return;
    }

    try {
      const response = await getQuizResultHistory(resultId).unwrap();
      setHistoryByResultId((currentValue) => ({
        ...currentValue,
        [resultId]: response?.history || [],
      }));
    } catch (error) {
      toast.error(feedback(error?.data?.message || ui("Failed to load attempt history."), ui("Failed to load attempt history.")));
    }
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-6">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {isAdmin ? ui("Admin panel") : ui("Instructor workspace")}
            </p>
            <h1 className="text-xl font-bold sm:text-3xl">{ui("Quiz Dashboard")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{" "}{ui("Monitor student performance across all quiz-enabled lectures.")}{" "}</p>
          </div>
          <div className="flex w-full shrink-0 items-center gap-2 rounded-xl bg-card/10 px-3 py-2 backdrop-blur-sm sm:w-auto sm:px-4 sm:py-2.5">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <span className="truncate text-sm font-medium text-foreground">
              {selectedCourse ? selectedCourse.courseTitle : ui("No course selected")}
            </span>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-card/5" />
        <div className="absolute -bottom-6 right-24 h-24 w-24 rounded-full bg-card/5" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-xs">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">{" "}{ui("Course")}{" "}</label>
          <Select
            value={selectedCourseId}
            onValueChange={(value) => {
              setSelectedCourseId(value);
              setSelectedLectureId("all");
            }}
          >
            <SelectTrigger className="h-10 rounded-xl border-border bg-card shadow-sm dark:border-border dark:bg-secondary">
              <SelectValue placeholder={coursesLoading ? ui("Loading…") : ui("Select a course")} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course._id} value={course._id}>
                  {course.courseTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCourseId && lectures.filter((l) => l.totalQuestions > 0).length > 0 && (
          <>
            <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
            <div className="w-full sm:max-w-xs">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">{" "}{ui("Lecture")}{" "}</label>
              <Select value={selectedLectureId} onValueChange={setSelectedLectureId}>
                <SelectTrigger className="h-10 rounded-xl border-border bg-card shadow-sm dark:border-border dark:bg-secondary">
                  <SelectValue placeholder={ui("All lectures")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ui("All Lectures")}</SelectItem>
                  {lectures
                    .filter((lec) => lec.totalQuestions > 0)
                    .map((lec) => (
                      <SelectItem key={lec._id} value={lec._id}>
                        {lec.lectureTitle}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      {/* Empty state — no course selected */}
      {!selectedCourseId && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted py-24 text-center dark:border-border dark:bg-secondary/20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted dark:bg-secondary">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold text-muted-foreground dark:text-muted-foreground">{" "}{ui("Select a course to get started")}{" "}</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground dark:text-muted-foreground">{" "}{ui("Choose one of your courses from the dropdown above to view student quiz results.")}{" "}</p>
        </div>
      )}

      {/* Loading state */}
      {selectedCourseId && quizLoading && (
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted px-5 py-4 dark:border-border dark:bg-secondary/30">
          <BrandedLoader variant="inline" />
          <span className="text-sm text-muted-foreground dark:text-muted-foreground">{ui("Loading quiz results…")}</span>
        </div>
      )}

      {selectedCourseId && quizError && <div role="alert" className="rounded-xl border border-border bg-card p-5"><p>{language === "ar" ? "تعذّر تحميل نتائج الاختبارات." : "Could not load quiz results."}</p><button className="mt-3 text-primary underline" onClick={refetchQuiz}>{language === "ar" ? "حاول تاني" : "Try again"}</button></div>}
      {selectedCourseId && !quizLoading && !quizError && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            {statCards.map((card) => (
              <Card
                key={card.title}
                className="overflow-hidden border-border shadow-sm dark:border-border"
              >
                <CardContent className="p-0">
                  <div className={`h-1 w-full bg-linear-to-r ${card.gradient}`} />
                  <div className="flex items-center gap-3 p-3.5 sm:gap-4 sm:p-5">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.lightBg} sm:h-12 sm:w-12`}>
                      <card.icon className={`h-5 w-5 ${card.textColor}`} />
                    </div>
                    <div>
                      <p className={`text-2xl font-extrabold sm:text-3xl ${card.textColor}`}>{card.value}</p>
                      <p className="mt-0.5 text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                        {card.title}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Results table */}
          <Card className="overflow-hidden border-border shadow-sm dark:border-border">
            <CardHeader className="border-b border-border bg-muted px-6 py-4 dark:border-border dark:bg-secondary/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">
                  {selectedLectureId === "all"
                    ? ui("All Quiz Results")
                    : ui("Results — {0}", lectures.find((l) => l._id === selectedLectureId)?.lectureTitle ?? "")}
                </CardTitle>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground dark:bg-secondary dark:text-muted-foreground">
                  {filteredResults.length} {language === "ar" ? "نتيجة" : (filteredResults.length === 1 ? "entry" : "entries")}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted dark:bg-secondary">
                    <ClipboardList className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground">{" "}{ui("No results yet")}{" "}</p>
                  <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground">{" "}{ui("Students haven't submitted this quiz yet.")}{" "}</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 p-3 md:hidden">
                    {filteredResults.map((result) => {
                      const percent = result.percentage ?? 0;
                      const grade = getPerformanceGrade(percent, lectures.find(lecture => lecture._id === result.lectureId?._id)?.passPercentage ?? 60);
                      const attemptsCount =
                        result.attemptsCount || result.history?.length || 1;
                      const history = historyByResultId[result._id] || [];
                      const rowKey = `${result.userId?._id || "unknown"}-${result.lectureId?._id || result._id}`;
                      const isExpanded = expandedHistoryKey === rowKey;

                      return (
                        <div
                          key={rowKey}
                          className="rounded-2xl border border-border bg-muted p-3 dark:border-border dark:bg-secondary/40"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm dark:ring-slate-800">
                                <AvatarImage src={result.userId?.photoUrl || "/default-avatar.webp"} />
                                <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                                  {result.userId?.name?.slice(0, 2).toUpperCase() ?? "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground dark:text-foreground">
                                  {result.userId?.name ?? ui("Unknown")}
                                </p>
                                <p className="truncate text-xs text-muted-foreground dark:text-muted-foreground">
                                  {result.userId?.email ?? ""}
                                </p>
                              </div>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${grade.pill}`}>
                              {percent}%
                            </span>
                          </div>

                          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground dark:text-muted-foreground">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 dark:bg-secondary">
                              <ListChecks className="h-3 w-3" />
                              {result.lectureId?.lectureTitle ?? "—"}
                            </span>
                            <span className="font-semibold text-foreground dark:text-foreground">
                              {result.score}/{result.totalQuestions}
                            </span>
                          </div>

                          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted dark:bg-secondary">
                            <div
                              className={`h-full rounded-full transition-all ${grade.bar}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleToggleHistory(rowKey, result._id)}
                              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-muted dark:bg-secondary dark:text-foreground dark:hover:bg-card"
                            >
                              <History className="h-3 w-3" />
                              {attemptsCount}{" "}{ui("Attempts")}{" "}<ChevronDown
                                className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              />
                            </button>
                            <span className="text-[11px] text-muted-foreground dark:text-muted-foreground">
                              {formatSubmittedAt(result.updatedAt)}
                            </span>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 rounded-xl border border-border bg-card p-2.5 dark:border-border dark:bg-card/70">
                              {isHistoryLoading && !history.length ? (
                                <BrandedLoader variant="inline" />
                              ) : history.length > 0 ? (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {history.map((attempt, index) => (
                                    <div
                                      key={`${rowKey}-attempt-${index}`}
                                      className="rounded-lg border border-border bg-muted px-2.5 py-1.5 dark:border-border dark:bg-secondary"
                                    >
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-muted-foreground">{" "}{ui("Attempt #")}{history.length - index}
                                      </p>
                                      <p className="mt-0.5 text-xs font-bold text-foreground dark:text-foreground">
                                        {attempt.score}/{attempt.totalQuestions}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground dark:text-muted-foreground">{" "}{ui("No history found.")}{" "}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border bg-transparent hover:bg-transparent dark:border-border">
                        <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{" "}{ui("Student")}{" "}</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{" "}{ui("Lecture")}{" "}</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{" "}{ui("Score")}{" "}</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{" "}{ui("Performance")}{" "}</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">{" "}{ui("Attempts")}{" "}</TableHead>
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{" "}{ui("Submitted")}{" "}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((result) => {
                        const percent = result.percentage ?? 0;
                        const grade = getPerformanceGrade(percent, lectures.find(lecture => lecture._id === result.lectureId?._id)?.passPercentage ?? 60);
                        const submittedAt = formatSubmittedAt(result.updatedAt);

                        const attemptsCount =
                          result.attemptsCount || result.history?.length || 1;
                        const history = historyByResultId[result._id] || [];
                        const rowKey = `${result.userId?._id || "unknown"}-${result.lectureId?._id || result._id}`;
                        const isExpanded = expandedHistoryKey === rowKey;

                        return (
                          <React.Fragment key={rowKey}>
                            <TableRow className="border-border transition-colors hover:bg-muted dark:border-border dark:hover:bg-secondary/40">
                              {/* Student */}
                              <TableCell className="py-4 pl-6">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9 ring-2 ring-white shadow-sm dark:ring-slate-800">
                                    <AvatarImage src={result.userId?.photoUrl || "/default-avatar.webp"} />
                                    <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
                                      {result.userId?.name?.slice(0, 2).toUpperCase() ?? "?"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-semibold text-foreground dark:text-foreground">
                                      {result.userId?.name ?? ui("Unknown")}
                                    </p>
                                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                                      {result.userId?.email ?? ""}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Lecture */}
                              <TableCell>
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground dark:bg-secondary dark:text-muted-foreground">
                                  <ListChecks className="h-3 w-3 shrink-0" />
                                  {result.lectureId?.lectureTitle ?? "—"}
                                </span>
                              </TableCell>

                              {/* Score */}
                              <TableCell className="text-center">
                                <span className="text-lg font-extrabold text-foreground dark:text-foreground">
                                  {result.score}
                                </span>
                                <span className="text-sm font-medium text-muted-foreground">
                                  {" "}/ {result.totalQuestions}
                                </span>
                              </TableCell>

                              {/* Performance */}
                              <TableCell className="min-w-40">
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className={`text-xs font-semibold ${grade.color}`}>
                                      {grade.label}
                                    </span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${grade.pill}`}>
                                      {percent}%
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted dark:bg-secondary">
                                    <div
                                      className={`h-full rounded-full transition-all ${grade.bar}`}
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                </div>
                              </TableCell>

                              {/* Attempts */}
                              <TableCell className="text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleHistory(rowKey, result._id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-muted dark:bg-secondary dark:text-foreground dark:hover:bg-card"
                                >
                                  <History className="h-3 w-3" />
                                  {attemptsCount}
                                  <ChevronDown
                                    className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                  />
                                </button>
                              </TableCell>

                              {/* Submitted */}
                              <TableCell className="text-xs text-muted-foreground dark:text-muted-foreground">
                                {submittedAt}
                              </TableCell>
                            </TableRow>

                            {isExpanded && (
                              <TableRow className="bg-muted/70 dark:bg-secondary/30">
                                <TableCell colSpan={6} className="px-6 py-4">
                                  <div className="flex flex-wrap gap-2">
                                    {isHistoryLoading && !history.length ? (
                                      <BrandedLoader variant="inline" />
                                    ) : history.length > 0 ? (
                                      history.map((attempt, index) => {
                                        const attemptDate = formatSubmittedAt(attempt.submittedAt);

                                        return (
                                          <span
                                            key={`${rowKey}-attempt-${index}`}
                                            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground dark:border-border dark:bg-secondary dark:text-muted-foreground"
                                          >
                                            <strong className="font-semibold text-foreground dark:text-foreground">{" "}{ui("Attempt")}{" "}{history.length - index}
                                            </strong>
                                            <span>
                                              {attempt.score}/{attempt.totalQuestions}
                                            </span>
                                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] dark:bg-secondary">
                                              {attempt.percentage}%
                                            </span>
                                            <span>{attemptDate}</span>
                                          </span>
                                        );
                                      })
                                    ) : (
                                      <span className="text-xs text-muted-foreground dark:text-muted-foreground">{" "}{ui("No history found.")}{" "}</span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default QuizDashboard;
