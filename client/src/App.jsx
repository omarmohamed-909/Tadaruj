import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { lazy, Suspense } from "react";
import "./App.css";
import HeroSection from "./pages/student/HeroSection";
import InstructorsSection from "./pages/student/InstructorsSection";
import LearningPathSection from "./pages/student/LearningPathSection";
import JoinSection from "./pages/student/JoinSection";
import MainLayout from "./layout/MainLayout";
import {
  AdminRoute,
  InstructorRoute,
  AutheticatedUser,
  ProtectedRoute,
} from "./components/ProtectedRoutes";
import PurcjhaseCourseProtectedRoute from "./components/PurchaseCourseProtectedRoute";
import { ThemeProvider } from "./components/ThemeProvider";
import { LanguageProvider } from "./components/LanguageProvider";
import LoadingSpinner from "./components/LoadingSpinner";
import AppErrorBoundary from "./components/AppErrorBoundary";
import RouteError from "./pages/RouteError";
import NotFound from "./pages/NotFound";

// Keep form, catalog and profile dependencies out of the landing-page download.
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const VerifyEmailNotice = lazy(() => import("./pages/VerifyEmailNotice"));
const AboutSection = lazy(() => import("./pages/student/AboutSection"));
const AllCourses = lazy(() => import("./pages/student/AllCourses"));
const MyLearning = lazy(() => import("./pages/student/MyLearning"));
const Profile = lazy(() => import("./pages/student/Profile"));
const SearchPage = lazy(() => import("./pages/student/SearchPage"));
const Sidebar = lazy(() => import("./pages/admin/Sidebar"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const UsersManagement = lazy(() => import("./pages/admin/UsersManagement"));
const QuizDashboard = lazy(() => import("./pages/admin/QuizDashboard"));
const InstructorDashboard = lazy(() => import("./pages/admin/InstructorDashboard"));
const AcceptAdminInvitation = lazy(() => import("./pages/admin/AcceptAdminInvitation"));
const AuditLog = lazy(() => import("./pages/admin/AuditLog"));
const ManualOrders = lazy(() => import("./pages/admin/ManualOrders"));
const CourseTable = lazy(() => import("./pages/admin/course/CourseTable"));
const AddCourse = lazy(() => import("./pages/admin/course/AddCourse"));
const EditCourse = lazy(() => import("./pages/admin/course/EditCourse"));
const CreateLecture = lazy(() => import("./pages/admin/lecture/CreateLecture"));
const EditLecture = lazy(() => import("./pages/admin/lecture/EditLecture"));
const CourseDetail = lazy(() => import("./pages/student/CourseDetail"));
const CourseProgress = lazy(() => import("./pages/student/CourseProgress"));
const InstructorProfile = lazy(() => import("./pages/student/InstructorProfile"));
const InstructorsDirectory = lazy(() => import("./pages/student/InstructorsDirectory"));
const LegalPage = lazy(() => import("./pages/LegalPage"));

const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <RouteError />,
    children: [
      { id: "not-found", path: "*", element: <NotFound /> },
      { path: "privacy", element: <LegalPage policy="privacy" /> },
      { path: "terms", element: <LegalPage policy="terms" /> },
      { path: "refund-policy", element: <LegalPage policy="refunds" /> },
      {
        path: "/",
        element: (
          <>
            <HeroSection />
            <LearningPathSection />
            <InstructorsSection />
            <JoinSection />
          </>
        ),
      },
      {
        path: "about-us",
        element: <AboutSection />,
      },
      {
        path: "courses",
        element: <AllCourses />,
      },
      {
        path: "login",
        element: (
          <AutheticatedUser>
            <Login />
          </AutheticatedUser>
        ),
      },
      {
        path: "forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "verify-email-notice",
        element: <VerifyEmailNotice />,
      },
      {
        path: "verify-email/:token",
        element: <VerifyEmail />,
      },
      {
        path: "reset-password/:token",
        element: <ResetPassword />,
      },
      {
        path: "admin/invite/:token",
        element: <AcceptAdminInvitation />,
      },
      {
        path: "my-learning",
        element: (
          <ProtectedRoute>
            <MyLearning />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "course/search",
        element: <SearchPage />,
      },
      {
        path: "course-detail/:courseId",
        element: <CourseDetail />,
      },
      {
        path: "instructors",
        element: <InstructorsDirectory />,
      },
      {
        path: "instructors/:instructorId",
        element: <InstructorProfile />,
      },
      {
        path: "course-progress/:courseId",
        element: (
          <ProtectedRoute>
            <PurcjhaseCourseProtectedRoute>
              <CourseProgress />
            </PurcjhaseCourseProtectedRoute>
          </ProtectedRoute>
        ),
      },

      //admin routes start from here
      {
        path: "instructor",
        element: <InstructorRoute><Sidebar /></InstructorRoute>,
        children: [
          { path: "dashboard", element: <InstructorDashboard /> },
          { path: "orders", element: <ManualOrders /> },
          { path: "course", element: <CourseTable /> },
          { path: "course/create", element: <AddCourse /> },
          { path: "course/:courseId", element: <EditCourse /> },
          { path: "course/:courseId/lecture", element: <CreateLecture /> },
          { path: "course/:courseId/lecture/:lectureId", element: <EditLecture /> },
          { path: "quiz-dashboard", element: <QuizDashboard /> },
        ],
      },
      {
        path: "admin",
        element: (
          <AdminRoute>
            <Sidebar />
          </AdminRoute>
        ),
        children: [
          {
            path: "dashboard",
            element: <Dashboard />,
          },
          { path: "orders", element: <ManualOrders /> },
          {
            path: "course",
            element: <CourseTable />,
          },
          {
            path: "course/create",
            element: <AddCourse />,
          },
          {
            path: "course/:courseId",
            element: <EditCourse />,
          },
          {
            path: "course/:courseId/lecture",
            element: <CreateLecture />,
          },
          {
            path: "course/:courseId/lecture/:lectureId",
            element: <EditLecture />,
          },
          {
            path: "users",
            element: <UsersManagement />,
          },
          {
            path: "audit-logs",
            element: <AuditLog />,
          },
          {
            path: "quiz-dashboard",
            element: <QuizDashboard />,
          },
        ],
      },
    ],
  },
]);

function App() {
  return (
    <main>
      <ThemeProvider>
        <LanguageProvider>
         <AppErrorBoundary><Suspense fallback={<LoadingSpinner />}><RouterProvider router={appRouter} /></Suspense></AppErrorBoundary>
        </LanguageProvider>
      </ThemeProvider>
    </main>
  );
}

export default App;
