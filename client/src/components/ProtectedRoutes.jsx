import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

export const ProtectedRoute = ({ children }) => {
    const {isAuthenticated} = useSelector((store) => store.auth);
    const location = useLocation();

    if(!isAuthenticated){
        return <Navigate to="/login?mode=login" state={{ from: `${location.pathname}${location.search}` }} replace />;
    }

    return children;
}
export const AutheticatedUser = ({ children }) => {
    const {isAuthenticated} = useSelector((store) => store.auth);
    const location = useLocation();
    const requestedPath = location.state?.from;
    const returnTo = typeof requestedPath === "string" && requestedPath.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/";

    if(isAuthenticated){
        return <Navigate to={returnTo} replace />;
    }

    return children;
}

const RoleRoute = ({ children, role }) => {
    const {user,isAuthenticated} = useSelector((store) => store.auth);

    if(!isAuthenticated){
        return <Navigate to="/login"/>;
    }

    if(user?.role !== role){
        return <Navigate to="/"/>;
    }

    return children;
}

export const AdminRoute = ({ children }) => <RoleRoute role="admin">{children}</RoleRoute>;
export const InstructorRoute = ({ children }) => <RoleRoute role="instructor">{children}</RoleRoute>;
