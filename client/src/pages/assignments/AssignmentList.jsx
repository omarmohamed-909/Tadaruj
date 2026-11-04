import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/components/languageContext";
import { useWorkspacePath } from "@/lib/useWorkspacePath";
import { useGetAssignmentsQuery } from "@/features/api/assignmentsApi";
import { CoursePicker, Paging, RequestState } from "../admin/TeachingUi";
import AssignmentForm from "./AssignmentForm";
import { statuses, formatDate, buttonClass } from "./assignmentText";
export default function AssignmentList({ manager = false }) {
  const { language } = useLanguage(); const ar = language === "ar";
  const route = useParams(), [params, setParams] = useSearchParams(), navigate = useNavigate(), workspace = useWorkspacePath();
  const courseId = manager ? params.get("courseId") || "" : route.courseId;
  const [creating, setCreating] = useState(false);
  const query = useGetAssignmentsQuery({ courseId, manager, page: Number(params.get("page")) || 1 }, { skip: !courseId, refetchOnMountOrArgChange: true });
  const data = query.currentData;
  const change = changes => { const next = new URLSearchParams(params); Object.entries({ page: "1", ...changes }).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); setParams(next); setCreating(false); };
  const detail = id => manager ? workspace(`/assignments/${courseId}/${id}`) : `/course-assignments/${courseId}/${id}`;
  return <div className="mx-auto max-w-5xl space-y-5 p-3 sm:p-5"><header className="rounded-2xl border border-border bg-card p-5"><h1 className="text-2xl font-bold">{ar ? "الواجبات" : "Assignments"}</h1><p className="mt-2 text-sm text-muted-foreground">{manager ? (ar ? "أضف المهام، راجع التسليمات وصحّح شغل طلابك." : "Create tasks, review submissions and give students feedback.") : (ar ? "سلّم شغلك وتابع درجاتك وملاحظات المدرّس." : "Submit your work and follow your grades and teacher feedback.")}</p>{!manager && <Link className="mt-3 inline-block text-sm text-primary underline" to={`/course-progress/${courseId}`}>{ar ? "رجوع للكورس" : "Back to course"}</Link>}</header>
    {manager && <CoursePicker value={courseId} onChange={value => change({ courseId: value })}/>}
    {courseId && <div className="flex flex-wrap gap-3"><button className={buttonClass} disabled={query.isFetching} onClick={query.refetch}>{ar ? "تحديث" : "Refresh"}</button>{manager && <button className={buttonClass} onClick={() => setCreating(value => !value)}>{creating ? (ar ? "إغلاق النموذج" : "Close form") : (ar ? "إضافة واجب" : "Add assignment")}</button>}</div>}
    {manager && creating && courseId && <AssignmentForm key={courseId} courseId={courseId} onCreated={assignment => navigate(detail(assignment._id))}/>}
    {courseId ? <RequestState query={query}/> : <p className="p-8 text-center text-muted-foreground">{ar ? "اختَر كورسًا لعرض واجباته." : "Select a course to view assignments."}</p>}
    {data && !query.isError && <><div className="grid gap-4 sm:grid-cols-2">{data.rows.map(item => <article key={item._id} className="rounded-2xl border border-border bg-card p-5"><h2 className="text-lg font-bold"><Link className="hover:underline" to={detail(item._id)}>{item.title}</Link></h2><p className="mt-3 text-sm text-muted-foreground">{formatDate(item.dueAt, ar)} · {item.maxScore} {ar ? "درجة" : "points"}</p><p className="mt-3 text-sm">{item.closed ? (ar ? "التسليم مغلق" : "Submissions closed") : !item.published ? (ar ? "مسودة" : "Draft") : (ar ? "مفتوح للتسليم" : "Open for submissions")}</p>{manager ? <p className="mt-2 text-sm">{item.submissionCount} {ar ? "طالب سلّم" : "students submitted"}</p> : <p className="mt-2 text-sm">{item.submission ? statuses(ar)[item.submission.status] : (ar ? "لم تسلّم بعد" : "Not submitted")}{item.submission?.status === "graded" && ` · ${item.submission.score}/${item.maxScore}`}</p>}<Link className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline" to={detail(item._id)}>{manager ? (ar ? "إدارة وتصحيح" : "Manage and review") : (ar ? "فتح الواجب" : "Open assignment")}</Link></article>)}</div>{!data.rows.length && <p className="rounded-xl border border-dashed border-border p-8 text-center">{ar ? "لا توجد واجبات هنا بعد." : "No assignments here yet."}</p>}<Paging data={data} busy={query.isFetching} onPage={page => change({ page: String(page) })}/></>}
  </div>;
}
