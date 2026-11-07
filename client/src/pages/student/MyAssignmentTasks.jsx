import { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useLanguage } from "@/components/languageContext";
import { useGetMyAssignmentTasksQuery } from "@/features/api/assignmentsApi";
import CoursePagination from "@/components/CoursePagination";
import { formatDate } from "../assignments/assignmentText";

export default function MyAssignmentTasks() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const student = useSelector(state => state.auth.user?.role === "student");
  const [page, setPage] = useState(1);
  const query = useGetMyAssignmentTasksQuery(page, { skip: !student, refetchOnMountOrArgChange: true });
  const data = query.currentData;
  if (!student) return null;
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5" aria-labelledby="assignment-tasks">
      <h2 id="assignment-tasks" className="text-xl font-bold">{ar ? "مطلوب مني" : "Assignments to do"}</h2>
      {query.isError ? <div role="alert">
        <p>{ar ? "تعذّر تحميل الواجبات." : "Could not load assignments."}</p>
        <button className="min-h-11 text-primary underline" onClick={query.refetch}>{ar ? "إعادة المحاولة" : "Retry assignments"}</button>
      </div> : !data ? <p role="status">{ar ? "جاري تحميل الواجبات…" : "Loading assignments…"}</p> : <>
        {data.total === 0 && <p className="text-muted-foreground">{ar ? "مفيش واجبات محتاجة تسليم منك دلوقتي." : "You have no assignments to submit right now."}</p>}
        <ul className="divide-y divide-border">
          {data.rows.map(task => <li key={task._id}>
            <Link to={`/course-assignments/${task.courseId}/${task._id}`} state={{ fromMyLearning: true }} className="block rounded-lg px-2 py-3 hover:bg-accent focus-visible:outline-primary">
              <span className="block break-words text-sm text-muted-foreground">{task.courseTitle}</span>
              <strong className="block break-words text-primary underline">{task.title}</strong>
              <span className="text-sm">{task.overdue && (ar ? "فات موعد التسليم · " : "Past due · ")}{formatDate(task.dueAt, ar)}</span>
              {task.submission?.status === "returned" && <span className="block text-sm font-semibold">{ar ? "مطلوب إعادة التسليم" : "Changes requested"}</span>}
            </Link>
          </li>)}
        </ul>
        {data.totalPages > 1 && <CoursePagination page={data.page} totalPages={data.totalPages} busy={query.isFetching} onPageChange={setPage} />}
      </>}
    </section>
  );
}
