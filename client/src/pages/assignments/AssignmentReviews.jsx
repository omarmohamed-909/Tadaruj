import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "@/components/languageContext";
import { useGetAssignmentSubmissionsQuery, useGetAssignmentSubmissionQuery, useReviewAssignmentSubmissionMutation } from "@/features/api/assignmentsApi";
import { Paging, RequestState } from "../admin/TeachingUi";
import { assignmentError, statuses, formatDate, fieldClass, buttonClass } from "./assignmentText";
import SubmissionHistory from "./SubmissionHistory";
export function Review({ row, courseId, assignment, onSaved, embedded = false }) {
  const { language } = useLanguage(); const ar = language === "ar";
  const [open, setOpen] = useState(false), [score, setScore] = useState(""), [feedback, setFeedback] = useState(""), [message, setMessage] = useState("");
  const query = useGetAssignmentSubmissionQuery({ courseId, assignmentId: assignment._id, submissionId: row._id, revision: row.revision }, { skip: !open, refetchOnMountOrArgChange: true });
  const [review, { isLoading }] = useReviewAssignmentSubmissionMutation();
  const submission = query.currentData?.submission;
  const submit = async decision => { try { await review({ courseId, assignmentId: assignment._id, submissionId: row._id, revision: submission.revision, decision, score: Number(score), feedback }).unwrap(); setMessage(""); onSaved(); setScore(""); setFeedback(""); } catch (error) { setMessage(assignmentError(error, ar)); } };
  return <article className="space-y-3 rounded-2xl border border-border bg-card p-5">{!embedded && <><h3 className="font-bold">{row.studentId?.name || (ar ? "حساب محذوف" : "Deleted account")}</h3><p className="break-all text-sm text-muted-foreground">{row.studentId?.email}</p></>}<p className="text-sm">{statuses(ar)[row.status]}{row.late ? (ar ? " · متأخر" : " · Late") : ""} · {formatDate(row.submittedAt, ar)}{row.status === "graded" && ` · ${row.score}/${assignment.maxScore}`}</p><button className={buttonClass} onClick={() => setOpen(value => !value)}>{open ? (ar ? "إخفاء التسليم" : "Hide submission") : (ar ? "عرض وتصحيح" : "View and review")}</button>
    {open && <><RequestState query={query}/>{submission && !query.isError && <><SubmissionHistory submission={submission} maxScore={assignment.maxScore}/>{submission.status === "submitted" && <div className="space-y-3"><label className="block space-y-2 text-sm"><span>{ar ? "الدرجة" : "Score"} / {assignment.maxScore}</span><input type="number" min={0} max={assignment.maxScore} step={1} disabled={isLoading} value={score} onChange={e => setScore(e.target.value)} className={fieldClass}/></label><label className="block space-y-2 text-sm"><span>{ar ? "ملاحظات المدرّس" : "Teacher feedback"}</span><textarea rows={4} maxLength={3000} disabled={isLoading} value={feedback} onChange={e => setFeedback(e.target.value)} className={fieldClass}/></label><div className="flex flex-wrap gap-3"><button className={buttonClass} disabled={isLoading || score === "" || !Number.isInteger(Number(score)) || Number(score) < 0 || Number(score) > assignment.maxScore} onClick={() => submit("graded")}>{ar ? "اعتماد الدرجة" : "Save grade"}</button><button className={buttonClass} disabled={isLoading || !feedback.trim() || submission.attemptCount >= 10} onClick={() => submit("returned")}>{ar ? "طلب إعادة التسليم" : "Request resubmission"}</button></div></div>}</>}{message && <p role="status" className="text-sm">{message}</p>}</>}
  </article>;
}
export default function AssignmentReviews({ courseId, assignment }) {
  const { language } = useLanguage(); const ar = language === "ar";
  const [params, setParams] = useSearchParams(), status = params.get("status") || "submitted";
  const [notice, setNotice] = useState("");
  const query = useGetAssignmentSubmissionsQuery({ courseId, assignmentId: assignment._id, page: Number(params.get("page")) || 1, status }, { refetchOnMountOrArgChange: true });
  const data = query.currentData;
  const change = values => { setNotice(""); const next = new URLSearchParams(params); Object.entries({ page: "1", ...values }).forEach(([key, value]) => next.set(key, value)); setParams(next); };
  return <section className="space-y-4"><h2 className="text-xl font-bold">{ar ? "تسليمات الطلاب" : "Student submissions"}</h2><div className="flex flex-wrap gap-3"><label className="min-w-0 flex-1 space-y-2 text-sm"><span>{ar ? "حالة التسليم" : "Submission status"}</span><select className={fieldClass} value={status} onChange={e => change({ status: e.target.value })}><option value="all">{ar ? "الكل" : "All"}</option>{Object.entries(statuses(ar)).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label><button disabled={query.isFetching} className={buttonClass} onClick={query.refetch}>{ar ? "تحديث التسليمات" : "Refresh submissions"}</button></div>{notice && <p role="status" className="text-sm">{notice}</p>}<RequestState query={query}/>{data && !query.isError && <>{data.rows.map(row => <Review key={row._id} row={row} courseId={courseId} assignment={assignment} onSaved={() => setNotice(ar ? "تم حفظ المراجعة." : "Review saved.")}/>)}{!data.rows.length && <p className="p-6 text-center text-muted-foreground">{ar ? "لا توجد تسليمات مطابقة." : "No matching submissions."}</p>}<Paging data={data} busy={query.isFetching} onPage={page => change({ page: String(page) })}/></>}</section>;
}
