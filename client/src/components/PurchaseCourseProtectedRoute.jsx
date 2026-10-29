import PageSkeleton from "@/components/PageSkeleton";
import { useGetCourseDetailWithStatusQuery } from "@/features/api/purchaseApi";
import { useParams,Navigate } from "react-router-dom";
import ConnectionRetry from "./ConnectionRetry";

const PurcjhaseCourseProtectedRoute = ({children}) => {
    const {courseId} = useParams();
    const {data,isLoading,isError,error,refetch} = useGetCourseDetailWithStatusQuery(courseId);

    if(isLoading) return <PageSkeleton variant="courseDetail" />
    if(isError && ![401,403,404].includes(error?.status)) return <ConnectionRetry onRetry={refetch} />;

    return data?.hasAccess ? children : <Navigate to={`/course-detail/${courseId}`}/>
}
export default PurcjhaseCourseProtectedRoute;
