import { useState } from "react";
import { useLanguage } from "@/components/languageContext";
import { useCreateAssignmentMutation, useUpdateAssignmentMutation } from "@/features/api/assignmentsApi";
import { assignmentError, localDateInput, fieldClass, buttonClass } from "./assignmentText";
export default function AssignmentForm({ courseId, assignment, onCreated }) {
  const { language } = useLanguage(); const ar = language === "ar";
  const [draft, setDraft] = useState({ title: assignment?.title || "", instructions: assignment?.instructions || "", maxScore: assignment?.maxScore ?? 100, dueAt: localDateInput(assignment?.dueAt), published: assignment?.published || false, closed: assignment?.closed || false });
  const [message, setMessage] = useState("");
  const [create, creating] = useCreateAssignmentMutation(); const [update, updating] = useUpdateAssignmentMutation();
  const busy = creating.isLoading || updating.isLoading, locked = assignment?.submissionCount > 0;
  const change = (key, value) => { setDraft(current => ({ ...current, [key]: value })); setMessage(""); };
  const submit = async event => { event.preventDefault(); try { const body = { courseId, ...draft, maxScore: Number(draft.maxScore), dueAt: draft.dueAt ? new Date(draft.dueAt).toISOString() : null }; const result = assignment ? await update({ ...body, assignmentId: assignment._id, revision: assignment.revision }).unwrap() : await create(body).unwrap(); setMessage(ar ? "تم حفظ الواجب." : "Assignment saved."); onCreated?.(result.assignment); } catch (error) { setMessage(assignmentError(error, ar)); } };
  return <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-5"><h2 className="text-lg font-bold">{assignment ? (ar ? "إعدادات الواجب" : "Assignment settings") : (ar ? "واجب جديد" : "New assignment")}</h2>
    {locked && <p className="text-sm text-muted-foreground">{ar ? "التعليمات والدرجة ثابتة بعد أول تسليم. تعديل الموعد يؤثر على التسليمات الجديدة فقط." : "Instructions and points are locked after the first submission. Deadline changes apply to future submissions."}</p>}
    <label className="block space-y-2 text-sm"><span>{ar ? "عنوان الواجب" : "Assignment title"}</span><input required maxLength={160} value={draft.title} disabled={busy || locked} onChange={e => change("title", e.target.value)} className={fieldClass}/></label>
    <label className="block space-y-2 text-sm"><span>{ar ? "التعليمات" : "Instructions"}</span><textarea required rows={5} maxLength={10000} value={draft.instructions} disabled={busy || locked} onChange={e => change("instructions", e.target.value)} className={fieldClass}/></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm"><span>{ar ? "الدرجة النهائية" : "Maximum score"}</span><input required type="number" min={1} max={1000} step={1} value={draft.maxScore} disabled={busy || locked} onChange={e => change("maxScore", e.target.value)} className={fieldClass}/></label><label className="space-y-2 text-sm"><span>{ar ? "موعد التسليم بتوقيت جهازك" : "Due date in your local time"}</span><input type="datetime-local" value={draft.dueAt} disabled={busy} onChange={e => change("dueAt", e.target.value)} className={`${fieldClass} min-w-0`}/></label></div>
    <p className="text-xs leading-6 text-muted-foreground">{ar ? "التسليم بعد الموعد مسموح ويتعلّم كمتأخر. إغلاق التسليم يمنع الإرسال وإعادة الإرسال." : "Late submissions are accepted and marked late. Closing submissions blocks new submissions and resubmissions."}</p>
    <div className="flex flex-wrap gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={draft.published} disabled={busy || locked} onChange={e => change("published", e.target.checked)}/>{ar ? "نشر للطلاب" : "Publish to students"}</label><label className="flex items-center gap-2"><input type="checkbox" checked={draft.closed} disabled={busy} onChange={e => change("closed", e.target.checked)}/>{ar ? "إغلاق التسليم" : "Close submissions"}</label></div>
    <button disabled={busy} className={buttonClass}>{ar ? "حفظ الواجب" : "Save assignment"}</button>{message && <p role="status" className="text-sm">{message}</p>}
  </form>;
}
