import { useEffect, useRef, useState } from "react";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useUiText, useFeedbackText } from "@/components/useUiText";
import BrandedLoader from "@/components/BrandedLoader";
import CoursePagination from "@/components/CoursePagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetAdminCourseAccessQuery } from "@/features/api/courseApi";
import { useUpdateUserCourseAccessMutation } from "@/features/api/authApi";

export default function UserCourseAccessDialog({ user, onClose }) {
  const ui = useUiText(), feedback = useFeedbackText();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("all");
  const [access, setAccess] = useState("all");
  const scrollArea = useRef(null);
  const { currentData: data, isFetching, isError, error, refetch } = useGetAdminCourseAccessQuery(
    { userId: user._id, page, limit: 12, q: query, status, access },
    { refetchOnMountOrArgChange: true },
  );
  const [updateAccess, { isLoading: saving }] = useUpdateUserCourseAccessMutation();
  const busy = Boolean(saving || isFetching);
  useEffect(() => {
    if (!isFetching && Number.isInteger(data?.page) && data.page !== page) setPage(data.page);
  }, [data?.page, isFetching, page]);
  useEffect(() => { scrollArea.current?.scrollTo?.({ top: 0 }); }, [page, query, status, access]);
  const courses = data?.courses || [];
  const granted = courses.filter(course => course.hasDirectAccess);
  const available = courses.filter(course => !course.hasDirectAccess);
  const changeAccess = async (course) => {
    try {
      const result = await updateAccess({ userId: user._id, courseId: course._id, action: course.hasDirectAccess ? "revoke" : "grant" }).unwrap();
      toast.success(feedback(result?.message, ui("Course access updated.")));
    } catch (failure) { toast.error(feedback(failure?.data?.message, ui("Failed to update course access."))); }
  };
  const renderGroup = (items, title) => items.length > 0 && (
    <section className="space-y-3" aria-label={title}>
      <h3 className="text-sm font-semibold text-foreground">{title} <span className="text-muted-foreground">({items.length})</span></h3>
      {items.map(course => (
        <article key={course._id} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="shrink-0 rounded-xl bg-accent p-3 text-accent-foreground"><BookOpen className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h4 className="break-words font-semibold text-foreground">{course.courseTitle}</h4>
              <p className="mt-1 break-words text-sm text-muted-foreground">{course.creator?.name || ui("Unknown creator")}</p>
              <Badge variant="secondary" className="mt-2">{course.isPublished ? ui("Published") : ui("Draft")}</Badge>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
            <span className="text-xs text-muted-foreground">{course.hasDirectAccess ? ui("Has access") : ui("No access")}</span>
            <Button type="button" variant={course.hasDirectAccess ? "outline" : "default"} disabled={busy} onClick={() => changeAccess(course)}>
              {course.hasDirectAccess ? ui("Revoke") : ui("Grant access")}
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[88dvh] w-[96vw] max-w-4xl flex-col gap-0 overflow-hidden rounded-3xl border-border bg-card p-0 text-foreground sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b border-border px-12 py-5">
          <DialogTitle>{ui("Manage Course Access")}</DialogTitle>
          <DialogDescription className="break-words">{ui("Grant or revoke direct course access for {0}.", user.name)}</DialogDescription>
          <div className="flex flex-wrap gap-2 pt-2 text-xs text-muted-foreground" aria-live="polite">
            <span>{ui("Matching courses: {0}", data?.total ?? "—")}</span>
            <span aria-hidden="true">·</span>
            <span>{ui("Direct grants: {0}", data?.grantedTotal ?? "—")}</span>
          </div>
        </DialogHeader>
        <div ref={scrollArea} className="min-h-0 overflow-y-auto px-4 pb-5 sm:px-6">
          <form className="sticky top-0 z-10 space-y-3 border-b border-border bg-card py-4" onSubmit={event => { event.preventDefault(); setQuery(draft.trim()); setPage(1); }}>
            <Label htmlFor="course-access-search">{ui("Course search")}</Label>
            <div className="flex gap-2">
              <Input id="course-access-search" maxLength={100} value={draft} onChange={event => setDraft(event.target.value)} placeholder={ui("Search by course title or instructor")}/>
              <Button type="submit">{ui("Search courses")}</Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="course-publish-filter">{ui("Publication status")}</Label>
                <Select value={status} onValueChange={value => { setStatus(value); setPage(1); }}>
                  <SelectTrigger id="course-publish-filter" className="mt-2 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">{ui("All statuses")}</SelectItem><SelectItem value="published">{ui("Published")}</SelectItem><SelectItem value="draft">{ui("Draft")}</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="course-access-filter">{ui("Course access")}</Label>
                <Select value={access} onValueChange={value => { setAccess(value); setPage(1); }}>
                  <SelectTrigger id="course-access-filter" className="mt-2 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">{ui("All courses")}</SelectItem><SelectItem value="granted">{ui("Granted Courses")}</SelectItem><SelectItem value="available">{ui("Available To Grant")}</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{ui("Granted courses appear first. Counts below are for this page.")}</p>
            {(query || status !== "all" || access !== "all") && <Button type="button" variant="outline" onClick={() => { setDraft(""); setQuery(""); setStatus("all"); setAccess("all"); setPage(1); }}>{ui("Clear filters")}</Button>}
          </form>
          <div className="space-y-5 pt-4" aria-busy={busy}>
            {isError ? <div role="alert" className="space-y-3 rounded-2xl border border-destructive/30 p-4"><p>{feedback(error?.data?.message, ui("Failed to load courses."))}</p><Button type="button" variant="outline" onClick={refetch}>{ui("Retry")}</Button></div> : <>
              {busy && <BrandedLoader variant="inline" />}
              {renderGroup(granted, ui("Granted Courses"))}
              {renderGroup(available, ui("Available To Grant"))}
              {!isFetching && !courses.length && <p className="rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">{ui("No matching courses found")}</p>}
              <CoursePagination label={ui("Course access pages")} page={data?.page ?? page} totalPages={data?.totalPages ?? 0} busy={busy} onPageChange={setPage} />
            </>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
