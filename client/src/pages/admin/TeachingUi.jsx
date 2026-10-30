import { useSelector } from "react-redux";
import { useLanguage } from "@/components/languageContext";
import { useGetCreatorCourseQuery, useGetAdminManageableCoursesQuery } from "@/features/api/courseApi";
import BrandedLoader from "@/components/BrandedLoader";

export function CoursePicker({ value, onChange, all = false }) {
  const { language } = useLanguage(); const ar = language === "ar";
  const admin = useSelector(state => state.auth.user?.role === "admin");
  const own = useGetCreatorCourseQuery(undefined, { skip: admin });
  const managed = useGetAdminManageableCoursesQuery(undefined, { skip: !admin });
  const query = admin ? managed : own;
  return <div className="min-w-0"><label className="block space-y-2 text-sm font-medium"><span>{ar ? "الكورس" : "Course"}</span><select className="min-h-11 w-full rounded-xl border border-border bg-card px-3 text-foreground" value={value} onChange={event => onChange(event.target.value)} disabled={query.isLoading}><option value="">{all ? (ar ? "كل كورساتي" : "All courses") : (ar ? "اختَر كورسًا" : "Select a course")}</option>{query.data?.courses?.map(course => <option key={course._id} value={course._id}>{course.courseTitle}</option>)}</select></label>{query.isError && <button className="mt-2 text-sm text-primary underline" onClick={query.refetch}>{ar ? "تعذّر تحميل الكورسات. حاول تاني" : "Could not load courses. Retry"}</button>}</div>;
}
export function Paging({ data, onPage, busy }) {
  const { language } = useLanguage(); const ar = language === "ar";
  return <nav aria-label={ar ? "صفحات النتائج" : "Results pages"} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-sm"><span>{ar ? `صفحة ${data.page} من ${data.totalPages} · ${data.total} نتيجة` : `Page ${data.page} of ${data.totalPages} · ${data.total} results`}</span><div className="flex gap-2"><button className="min-h-11 rounded-lg border border-border px-4 disabled:opacity-40" disabled={busy || data.page <= 1} onClick={() => onPage(data.page - 1)}>{ar ? "السابق" : "Previous"}</button><button className="min-h-11 rounded-lg border border-border px-4 disabled:opacity-40" disabled={busy || data.page >= data.totalPages} onClick={() => onPage(data.page + 1)}>{ar ? "التالي" : "Next"}</button></div></nav>;
}
export function RequestState({ query }) {
  const { language } = useLanguage();
  if (query.isError) return <div role="alert" className="rounded-xl border border-border bg-card p-6"><p>{language === "ar" ? "تعذّر تحميل البيانات." : "Could not load data."}</p><button className="mt-3 text-primary underline" onClick={query.refetch}>{language === "ar" ? "حاول تاني" : "Try again"}</button></div>;
  if (query.isFetching) return <div role="status" className="p-5"><BrandedLoader variant="inline" /></div>;
  return null;
}
