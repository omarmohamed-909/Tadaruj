import { useState } from "react";
import { useLanguage } from "@/components/languageContext";
import { useGetTrackedAssignmentsQuery } from "@/features/api/assignmentsApi";
import { Review } from "../assignments/AssignmentReviews";
import { formatDate } from "../assignments/assignmentText";
import { Paging, RequestState } from "./TeachingUi";

export default function StudentAssignments({ courseId, studentId }) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const query = useGetTrackedAssignmentsQuery({ courseId, studentId, page }, {
    skip: !open, refetchOnMountOrArgChange: true,
  });
  const data = query.currentData;

  return (
    <details className="mt-4 border-t border-border pt-3" onToggle={e => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer py-2 text-sm font-semibold">
        {ar ? "واجبات الطالب" : "Student assignments"}
      </summary>
      {open && <div className="mt-2 space-y-3">
        <RequestState query={query} />
        {notice && <p role="status">{notice}</p>}
        {data && !query.isError && <>
          {data.rows.map(task => (
            <section key={task._id} className="space-y-2 rounded-xl bg-muted p-3 text-sm">
              <h3 dir="auto" className="break-words font-semibold">{task.title}</h3>
              <p className="text-muted-foreground">{formatDate(task.dueAt, ar)}</p>
              {task.overdue && <p>{ar ? "فات موعد التسليم" : "Past due"}</p>}
              {task.closed && <p>{ar ? "التسليم مغلق" : "Submissions closed"}</p>}
              {task.submission
                ? <Review embedded courseId={courseId} assignment={task} row={task.submission}
                    onSaved={() => setNotice(ar ? "تم حفظ المراجعة." : "Review saved.")} />
                : <p>{ar ? "لم يسلّم الطالب" : "Not submitted"}</p>}
            </section>
          ))}
          {data.total === 0 && <p>{ar ? "لا توجد واجبات منشورة لهذا الكورس." : "No published assignments in this course."}</p>}
          {data.totalPages > 1 && <Paging data={data} busy={query.isFetching} onPage={setPage} />}
        </>}
      </div>}
    </details>
  );
}
