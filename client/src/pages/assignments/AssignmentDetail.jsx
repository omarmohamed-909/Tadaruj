import { Link, useLocation, useParams } from "react-router-dom";
import { useLanguage } from "@/components/languageContext";
import { useWorkspacePath } from "@/lib/useWorkspacePath";
import { useGetAssignmentQuery } from "@/features/api/assignmentsApi";
import { RequestState } from "../admin/TeachingUi";
import AssignmentForm from "./AssignmentForm";
import StudentSubmission from "./StudentSubmission";
import AssignmentReviews from "./AssignmentReviews";
import { formatDate } from "./assignmentText";
export default function AssignmentDetail({ manager = false }) {
  const { language } = useLanguage(); const ar = language === "ar";
  const { courseId, assignmentId } = useParams(), workspace = useWorkspacePath();
  const location = useLocation();
  const fromMyLearning = !manager && location.state?.fromMyLearning === true;
  let backPath = manager ? workspace(`/assignments?courseId=${courseId}`) : `/course-assignments/${courseId}`;
  let backLabel = ar ? "رجوع للواجبات" : "Back to assignments";
  if (fromMyLearning) {
    backPath = "/my-learning";
    backLabel = ar ? "رجوع إلى تعلّمي" : "Back to my learning";
  }
  const query = useGetAssignmentQuery({ courseId, assignmentId }, { refetchOnMountOrArgChange: true });
  const data = query.currentData;
  return <div className="mx-auto max-w-5xl space-y-5 p-3 sm:p-5"><Link className="inline-flex min-h-11 items-center text-sm text-primary underline" to={backPath}>{backLabel}</Link><RequestState query={query}/>{data && !query.isError && <><header className="space-y-3 rounded-2xl border border-border bg-card p-5"><p className="text-sm text-muted-foreground">{data.courseTitle}</p><h1 className="text-2xl font-bold">{data.assignment.title}</h1><p className="text-sm text-muted-foreground">{formatDate(data.assignment.dueAt, ar)} · {data.assignment.maxScore} {ar ? "درجة" : "points"}</p><p dir="auto" className="whitespace-pre-wrap break-words leading-7">{data.assignment.instructions}</p></header>{manager && data.isManager ? <><details><summary className="cursor-pointer py-3 font-semibold">{ar ? "تعديل إعدادات الواجب" : "Edit assignment settings"}</summary><AssignmentForm key={data.assignment.revision} courseId={courseId} assignment={data.assignment}/></details><AssignmentReviews courseId={courseId} assignment={data.assignment}/></> : data.isManager ? <p className="text-muted-foreground">{ar ? "معاينة المدرّس؛ التسليم متاح للطلاب." : "Teacher preview; submissions are for students."}</p> : <StudentSubmission key={assignmentId} courseId={courseId} assignment={data.assignment} submission={data.submission} onReload={query.refetch}/>}</>}</div>;
}
