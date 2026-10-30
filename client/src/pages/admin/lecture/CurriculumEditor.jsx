import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { Link, useBlocker, useBeforeUnload } from "react-router-dom";
import { useUpdateCurriculumMutation } from "@/features/api/courseApi";
import { useLanguage } from "@/components/languageContext";
import { groupCurriculum } from "@/lib/curriculum";

const makeGroups = source => [{ key: "general", title: "", lectureIds: groupCurriculum(source.lectures, source.units).find(group => group.id === "general")?.lessons.map(item => item.lecture._id) || [] }, ...(source.units || []).map(unit => ({ ...unit, key: unit._id }))];

export default function CurriculumEditor({ courseId, data, onDirtyChange, onReload }) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const [baseline, setBaseline] = useState(data);
  const initial = () => makeGroups(baseline);
  const [groups, setGroups] = useState(initial);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) { setBaseline(data); setGroups(makeGroups(data)); } }, [data, dirty]);
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);
  const [save, { isLoading }] = useUpdateCurriculumMutation();
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useBeforeUnload(event => { if (dirty) { event.preventDefault(); event.returnValue = ""; } });
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);
  const change = next => { setGroups(next); setDirty(true); setMessage(""); };
  const move = (array, index, offset) => { const next = [...array]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next; };
  const transfer = (lectureId, target) => change(groups.map(group => ({ ...group, lectureIds: group.key === target ? [...group.lectureIds.filter(id => id !== lectureId), lectureId] : group.lectureIds.filter(id => id !== lectureId) })));
  const remove = index => change(groups.filter((_, i) => i !== index).map((group, i) => i === 0 ? { ...group, lectureIds: [...group.lectureIds, ...groups[index].lectureIds] } : group));
  const submit = async () => {
    try {
      await save({ courseId, revision: baseline.revision, unassignedLectureIds: groups[0].lectureIds, units: groups.slice(1).map(({ _id, title, lectureIds }) => ({ ...(_id ? { _id } : {}), title, lectureIds })) }).unwrap();
      setDirty(false); onDirtyChange(false);
      setMessage(ar ? "تم حفظ الوحدات وترتيب الدروس." : "Units and lesson order saved.");
    } catch (error) {
      setConflict(error.status === 409);
      setMessage(error.status === 409 ? (ar ? "المحتوى اتغيّر في مكان تاني. أعد تحميله قبل التعديل من جديد." : "Content changed elsewhere. Reload it before editing again.") : (ar ? "تعذّر الحفظ. تغييراتك موجودة؛ جرّب تاني." : "Could not save. Your changes are still here; try again."));
    }
  };
  const button = "min-h-10 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-accent disabled:opacity-40";
  return <section className="space-y-5" aria-label={ar ? "تنظيم محتوى الكورس" : "Course structure"}>
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{ar ? "الوحدات والدروس" : "Units and lessons"}</h2><p className="mt-2 text-sm text-muted-foreground">{ar ? "رتّب المحتوى واحفظ التغييرات. حذف وحدة بينقل دروسها للدروس غير المصنّفة." : "Organize your content, then save. Removing a unit keeps its lessons unassigned."}</p></div>
      <button className={button} disabled={isLoading || groups.length > 100} onClick={() => change([...groups, { key: crypto.randomUUID(), title: "", lectureIds: [] }])}>{ar ? "إضافة وحدة" : "Add unit"}</button>
    </header>
    {message && <p role="status" className="rounded-xl border border-border bg-muted p-4 text-sm">{message} {conflict && <button className="ms-2 font-bold text-primary underline" onClick={async () => { try { const latest = await onReload(); setBaseline(latest); setGroups(makeGroups(latest)); setDirty(false); setConflict(false); setMessage(""); } catch { setMessage(ar ? "تعذّر تحميل المحتوى. حاول مرة أخرى." : "Could not reload content. Try again."); } }}>{ar ? "تحميل أحدث نسخة وإلغاء تعديلاتي" : "Reload latest and discard my edits"}</button>}</p>}
    {groups.map((group, groupIndex) => <section key={group.key} className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted p-4">
        {groupIndex === 0 ? <h3 className="flex-1 font-semibold">{ar ? "دروس غير مصنّفة" : "Unassigned lessons"}</h3> : <label className="min-w-40 flex-1 text-xs text-muted-foreground">{ar ? `اسم الوحدة ${groupIndex}` : `Unit ${groupIndex} title`}<input maxLength={100} value={group.title} disabled={isLoading} onChange={event => change(groups.map((item, i) => i === groupIndex ? { ...item, title: event.target.value } : item))} className="mt-1 block min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground" /></label>}
        {groupIndex > 0 && <div className="flex gap-2"><button className={button} aria-label={`${ar ? "نقل الوحدة لأعلى" : "Move unit up"} ${groupIndex}`} disabled={groupIndex === 1 || isLoading} onClick={() => change(move(groups, groupIndex, -1))}>↑</button><button className={button} aria-label={`${ar ? "نقل الوحدة لأسفل" : "Move unit down"} ${groupIndex}`} disabled={groupIndex === groups.length - 1 || isLoading} onClick={() => change(move(groups, groupIndex, 1))}>↓</button><button className={button} disabled={isLoading} onClick={() => remove(groupIndex)}>{ar ? "إزالة الوحدة" : "Remove unit"}</button></div>}
      </div>
      <div className="space-y-3 p-4">
        {!group.lectureIds.length && <p className="py-3 text-sm text-muted-foreground">{ar ? "مفيش دروس هنا. انقل درس للقسم ده من القائمة بجواره." : "No lessons here. Move a lesson here using its unit selector."}</p>}
        {group.lectureIds.map((id, index) => { const lecture = data.lectures.find(item => item._id === id); if (!lecture) return null; return <article key={id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3">
          <div className="min-w-40 flex-1"><h4 className="font-semibold">{lecture.lectureTitle}</h4><p className="mt-1 text-xs text-muted-foreground">{lecture.videoUrl ? (ar ? "فيديو مضاف" : "Video added") : (ar ? "يحتاج فيديو" : "Video needed")} · {lecture.quizQuestions?.length || 0} {ar ? "سؤال" : "questions"}{lecture.attachmentUrl ? (ar ? " · مرفق" : " · Attachment") : ""}</p></div>
          <select aria-label={`${ar ? "وحدة الدرس" : "Unit for"} ${lecture.lectureTitle}`} value={group.key} disabled={isLoading} onChange={event => transfer(id, event.target.value)} className="min-h-11 max-w-full rounded-lg border border-border bg-background px-2 text-sm">{groups.map((item, i) => <option key={item.key} value={item.key}>{i === 0 ? (ar ? "غير مصنّف" : "Unassigned") : item.title || (ar ? `وحدة ${i}` : `Unit ${i}`)}</option>)}</select>
          <div className="flex gap-2"><button className={button} aria-label={`${ar ? "نقل الدرس لأعلى" : "Move lesson up"} ${lecture.lectureTitle}`} disabled={index === 0 || isLoading} onClick={() => change(groups.map(item => item.key === group.key ? { ...item, lectureIds: move(item.lectureIds, index, -1) } : item))}>↑</button><button className={button} aria-label={`${ar ? "نقل الدرس لأسفل" : "Move lesson down"} ${lecture.lectureTitle}`} disabled={index === group.lectureIds.length - 1 || isLoading} onClick={() => change(groups.map(item => item.key === group.key ? { ...item, lectureIds: move(item.lectureIds, index, 1) } : item))}>↓</button><Link className={button} to={id} onClick={event => { if (isLoading) event.preventDefault(); }}>{ar ? "تعديل الدرس" : "Edit lesson"}</Link></div>
        </article>; })}
      </div>
    </section>)}
    <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg"><p className="text-sm text-muted-foreground">{dirty ? (ar ? "عندك تغييرات لسه متحفظتش" : "You have unsaved changes") : (ar ? "كل التغييرات محفوظة" : "All changes saved")}</p><div className="flex gap-2"><button className={button} disabled={!dirty || isLoading} onClick={() => { setGroups(initial()); setDirty(false); setMessage(""); setConflict(false); }}>{ar ? "إلغاء التعديلات" : "Discard changes"}</button><button className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-40" disabled={!dirty || isLoading || conflict || groups.slice(1).some(group => !group.title.trim())} onClick={submit}>{isLoading ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ التنظيم" : "Save structure")}</button></div></div>
    <Dialog open={blocker.state === "blocked"} onOpenChange={open => { if (!open) blocker.reset?.(); }}>
      <DialogContent><DialogTitle>{ar ? "تغييراتك لسه متحفظتش" : "Your changes are not saved"}</DialogTitle>
        <DialogDescription>{ar ? "احفظ ترتيب الكورس قبل ما تخرج، أو اخرج من غير حفظ." : "Stay to save your course structure, or leave without saving."}</DialogDescription>
        <div className="flex gap-3"><button className={button} onClick={() => blocker.reset()}>{ar ? "كمّل التعديل" : "Keep editing"}</button><button className={button} onClick={() => blocker.proceed()}>{ar ? "الخروج بدون حفظ" : "Leave without saving"}</button></div>
      </DialogContent>
    </Dialog>
  </section>;
}
