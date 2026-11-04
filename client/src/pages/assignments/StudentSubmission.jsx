import { useEffect, useState } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";
import { useLanguage } from "@/components/languageContext";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useSubmitAssignmentMutation } from "@/features/api/assignmentsApi";
import { assignmentError, fieldClass, buttonClass, statuses } from "./assignmentText";
import SubmissionHistory from "./SubmissionHistory";
export default function StudentSubmission({ assignment, submission, courseId, onReload }) {
  const { language } = useLanguage(); const ar = language === "ar";
  const [text, setText] = useState(""), [resourceUrl, setUrl] = useState(""), [message, setMessage] = useState("");
  const [send, { isLoading }] = useSubmitAssignmentMutation();
  const dirty = Boolean(text || resourceUrl);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useBeforeUnload(event => { if (dirty) { event.preventDefault(); event.returnValue = ""; } });
  useEffect(() => { setMessage(""); }, [submission?.revision]);
  const allowed = assignment.published && !assignment.closed && (!submission || submission.status === "returned") && (submission?.attemptCount || 0) < 10;
  const submit = async event => { event.preventDefault(); try { await send({ courseId, assignmentId: assignment._id, revision: submission?.revision || 0, text, resourceUrl }).unwrap(); setText(""); setUrl(""); setMessage(ar ? "تم تسليم الواجب." : "Assignment submitted."); } catch (error) { setMessage(assignmentError(error, ar)); } };
  return <section className="space-y-5"><h2 className="text-xl font-bold">{ar ? "تسليمك" : "Your submission"}</h2>{submission && <><p className="text-sm font-semibold">{statuses(ar)[submission.status]}{submission.status === "graded" && ` · ${submission.score}/${assignment.maxScore}`}</p><SubmissionHistory submission={submission} maxScore={assignment.maxScore}/></>}
    {allowed ? <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{ar ? "اكتب إجابتك أو أضف رابط HTTPS لشغلك. بعد الإرسال لا يمكن تعديله إلا لو طلب المدرّس إعادة التسليم." : "Write your answer or add an HTTPS link to your work. Submitted work is locked until the teacher requests changes."}</p><label className="block space-y-2 text-sm"><span>{ar ? "إجابتك" : "Your answer"}</span><textarea rows={7} maxLength={15000} value={text} disabled={isLoading} onChange={e => setText(e.target.value)} className={fieldClass}/></label><label className="block space-y-2 text-sm"><span>{ar ? "رابط الشغل (اختياري)" : "Work link (optional)"}</span><input type="url" maxLength={2000} placeholder="https://" value={resourceUrl} disabled={isLoading} onChange={e => setUrl(e.target.value)} className={fieldClass}/></label><p className="text-xs text-muted-foreground">{ar ? "تأكد إن المدرّس عنده صلاحية فتح الرابط." : "Make sure your teacher has permission to open the link."}</p><button className={buttonClass} disabled={isLoading || (!text.trim() && !resourceUrl.trim())}>{ar ? "تسليم الواجب" : "Submit assignment"}</button></form> : <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{assignment.closed ? (ar ? "التسليم مغلق حاليًا." : "Submissions are currently closed.") : (ar ? "لا يمكن إرسال نسخة جديدة حاليًا." : "A new version cannot be submitted right now.")}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}<button className={buttonClass} onClick={onReload} disabled={isLoading || dirty}>{ar ? "تحديث النتيجة" : "Refresh result"}</button>
    <Dialog open={blocker.state === "blocked"} onOpenChange={open => { if (!open) blocker.reset?.(); }}><DialogContent><DialogTitle>{ar ? "إجابة لم تُرسل" : "Unsent answer"}</DialogTitle><DialogDescription>{ar ? "لو خرجت دلوقتي هتفقد النص غير المُرسل." : "Leaving now discards your unsent work."}</DialogDescription><button className={buttonClass} onClick={() => blocker.reset()}>{ar ? "كمّل الكتابة" : "Keep writing"}</button><button className={buttonClass} onClick={() => blocker.proceed()}>{ar ? "الخروج بدون تسليم" : "Leave without submitting"}</button></DialogContent></Dialog>
  </section>;
}
