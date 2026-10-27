import PageSkeleton from "@/components/PageSkeleton";
import { useGetCourseDetailWithStatusQuery } from "@/features/api/purchaseApi";
import { useParams,Navigate } from "react-router-dom";

const PurcjhaseCourseProtectedRoute = ({children}) => {
    const {courseId} = useParams();
    const {data,isLoading} = useGetCourseDetailWithStatusQuery(courseId);

    if(isLoading) return <PageSkeleton variant="courseDetail" />

    return data?.hasAccess ? children : <Navigate to={`/course-detail/${courseId}`}/>
}
export default PurcjhaseCourseProtectedRoute;