import { Link, useSearchParams } from "react-router-dom";
import { Play, BookOpen, ArrowUpRight } from "lucide-react";
import { useGetMyLearningQuery } from "@/features/api/courseProgressApi";
import { useLanguage } from "@/components/languageContext";
import BrandedLoader from "@/components/BrandedLoader";
import CoursePagination from "@/components/CoursePagination";
import { secureMediaUrl } from "@/lib/secureMediaUrl";

const destination = course => `/course-progress/${course._id}${course.resumeLectureId ? `?lectureId=${course.resumeLectureId}` : ""}`;
export default function LearningDashboard() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const [params, setParams] = useSearchParams();
  const status = ["in-progress", "completed", "not-started"].includes(params.get("status")) ? params.get("status") : "all";
  const page = Math.max(1, Number.parseInt(params.get("page"), 10) || 1);
  const { currentData: data, isFetching, isError, refetch } = useGetMyLearningQuery({ page, status }, { refetchOnMountOrArgChange: true });
  const labels = ar ? { all: "كل كورساتي", "in-progress": "بكملها", completed: "مكتملة", "not-started": "لسه مبدأتش" } : { all: "All courses", "in-progress": "In progress", completed: "Completed", "not-started": "Not started" };
  const change = (nextStatus, nextPage = 1) => setParams({ status: nextStatus, page: String(nextPage) });
  const featured = data?.continueCourse;
  return <main dir={ar ? "rtl" : "ltr"} className="mx-auto max-w-7xl space-y-8 px-5 py-10 md:px-8 md:py-14">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold text-primary">{ar ? "خطوة جديدة كل يوم" : "A little progress, every day"}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{ar ? "مساحتك للتعلّم" : "Your learning space"}</h1>
        <p className="mt-3 text-muted-foreground">{ar ? "كمّل اللي بدأته، وتابع تقدّمك في مكان واحد." : "Pick up where you left off and see how far you have come."}</p></div>
      <Link to="/courses" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 font-semibold text-primary hover:bg-accent">{ar ? "اكتشف كورسات" : "Explore courses"}<ArrowUpRight size={18} /></Link>
    </header>
    {isError ? <div role="alert" className="rounded-2xl border border-border bg-card p-8"><p>{ar ? "تعذّر تحميل كورساتك. جرّب تاني." : "We could not load your courses. Please try again."}</p><button onClick={refetch} className="mt-4 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground">{ar ? "إعادة المحاولة" : "Try again"}</button></div> : <>
      {featured && <section aria-label={ar ? "كمّل من آخر مرة" : "Continue learning"} className="grid overflow-hidden rounded-3xl border border-border bg-card md:grid-cols-[1fr_2fr]">
        <img src={secureMediaUrl(featured.courseThumbnail) || "/brand-mark.webp"} alt="" className={`h-48 w-full bg-muted md:h-full md:max-h-72 ${featured.courseThumbnail ? "object-cover" : "object-contain p-10"}`} />
        <div className="p-6 md:p-8"><p className="text-sm font-semibold text-primary">{ar ? "كمّل من آخر مرة" : "Continue where you left off"}</p>
          <h2 className="mt-3 text-2xl font-bold">{featured.courseTitle}</h2><p className="mt-2 text-muted-foreground">{featured.resumeLectureTitle}</p>
          <p className="mt-3 text-sm text-muted-foreground">{featured.completedLessons} / {featured.totalLessons} {ar ? "درس مكتمل" : "lessons completed"}</p>
          <Link to={destination(featured)} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"><Play size={18} />{ar ? "كمّل التعلّم" : "Continue learning"}</Link>
        </div>
      </section>}
      <nav aria-label={ar ? "تصفية كورساتي" : "Filter my courses"} className="flex flex-wrap gap-2 border-b border-border pb-4">
        {Object.entries(labels).map(([key, label]) => <button key={key} type="button" aria-label={`${label}${data ? ` ${data.counts[key]}` : ""}`} aria-pressed={status === key} onClick={() => change(key)} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold transition ${status === key ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"}`}>{label}{data && <span className="ms-2 opacity-80">{data.counts[key]}</span>}</button>)}
      </nav>
      {isFetching && !data ? <BrandedLoader /> : !data?.courses?.length ? <section className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center"><BookOpen className="mx-auto mb-4 text-primary" size={32} /><h2 className="text-xl font-bold">{ar ? "لسه مفيش كورسات هنا" : "No courses here yet"}</h2><p className="mt-3 text-muted-foreground">{ar ? "جرّب تصنيف تاني، أو اختار كورس وابدأ أول خطوة." : "Try another filter, or find a course and take your first step."}</p></section> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.courses.map(course => <article key={course._id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <img src={secureMediaUrl(course.courseThumbnail) || "/brand-mark.webp"} alt="" loading="lazy" decoding="async" className={`h-40 w-full bg-muted ${course.courseThumbnail ? "object-cover" : "object-contain p-8"}`} />
          <div className="flex flex-1 flex-col p-5"><div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold"><span className="text-primary">{course.subject}</span><span className="rounded-full bg-muted px-3 py-1.5 text-muted-foreground">{labels[course.status]}</span></div>
            <h2 className="mt-4 text-lg font-bold">{course.courseTitle}</h2><p className="mt-2 text-sm text-muted-foreground">{course.creator?.name}</p>
            <div className="mt-auto pt-6"><div className="mb-2 flex justify-between gap-2 text-sm"><span>{course.completedLessons} / {course.totalLessons} {ar ? "درس" : "lessons"}</span><span>{course.percentage}%</span></div>
              <progress aria-label={`${ar ? "تقدّمك في" : "Progress in"} ${course.courseTitle}`} value={course.percentage} max="100" className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary" />
              {course.lastActivity && <p className="mt-3 text-xs text-muted-foreground">{ar ? "آخر مشاهدة: " : "Last watched: "}{new Date(course.lastActivity).toLocaleDateString(ar ? "ar-EG" : "en-GB")}</p>}
              <Link to={destination(course)} className="mt-5 flex min-h-11 items-center justify-center rounded-xl border border-border bg-accent font-semibold text-primary hover:bg-primary hover:text-primary-foreground">{course.status === "completed" ? (ar ? "راجع الكورس" : "Review course") : course.status === "not-started" ? (ar ? "ابدأ التعلّم" : "Start learning") : (ar ? "كمّل التعلّم" : "Continue learning")}</Link>
            </div>
          </div>
        </article>)}
      </div>}
      <CoursePagination page={data?.page || page} totalPages={data?.totalPages || 0} busy={isFetching} onPageChange={next => change(status, next)} />
      <p className="text-xs leading-6 text-muted-foreground">{ar ? "الإكمال يعني إنهاء الدروس وتسليم اختباراتها. درجات الاختبارات بتظهر داخل الكورس؛ الإكمال مش شهادة اجتياز." : "Completion means finishing lessons and submitting their quizzes. Quiz scores appear inside your course; completion is not a passing certificate."}</p>
    </>}
  </main>;
}
