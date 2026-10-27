import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageSkeleton from "@/components/PageSkeleton";
import { useGetAdminUsersQuery } from "@/features/api/authApi";
import { useGetAdminManageableCoursesQuery } from "@/features/api/courseApi";
import { useGetPurchasedCoursesQuery } from "@/features/api/purchaseApi";
import {
  BadgeDollarSign,
  BookOpen,
  CalendarClock,
  ChartColumnIncreasing,
  CircleDollarSign,
  GraduationCap,
  Users,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const Dashboard = () => {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 640
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 640);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const {
    data: coursesData,
    isLoading: isCoursesLoading,
    isError: isCoursesError,
    error: coursesError,
  } = useGetAdminManageableCoursesQuery();

  const {
    data: usersData,
    isLoading: isUsersLoading,
    isError: isUsersError,
    error: usersError,
  } = useGetAdminUsersQuery();

  const {
    data: purchasesData,
    isLoading: isPurchasesLoading,
    isError: isPurchasesError,
    error: purchasesError,
  } = useGetPurchasedCoursesQuery();

  if (isCoursesLoading || isUsersLoading || isPurchasesLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  if (isCoursesError && isUsersError && isPurchasesError) {
    const message =
      coursesError?.data?.message ||
      usersError?.data?.message ||
      purchasesError?.data?.message ||
      "Failed to load dashboard data";
    return <h1 className="text-red-500">{message}</h1>;
  }

  const courses = coursesData?.courses ?? [];
  const users = usersData?.users ?? [];
  const purchases = purchasesData?.purchasedCourse ?? [];

  const totalCourses = courses.length;
  const publishedCourses = courses.filter((course) => course.isPublished).length;
  const draftCourses = Math.max(0, totalCourses - publishedCourses);

  const totalCourseCatalogValue = courses.reduce(
    (acc, course) => acc + Number(course.coursePrice || 0),
    0
  );
  const avgCoursePrice = totalCourses
    ? Math.round(totalCourseCatalogValue / totalCourses)
    : 0;
  const paidCourses = courses.filter((course) => Number(course.coursePrice || 0) > 0).length;
  const freeCourses = Math.max(0, totalCourses - paidCourses);

  const totalPurchases = purchases.length;
  const totalCollectedRevenue = purchases.reduce(
    (acc, purchase) => acc + Number(purchase.amount || 0),
    0
  );

  const totalUsers = users.length;
  const totalStudents = users.filter((user) => user.role === "student").length;
  const totalInstructors = users.filter((user) => user.role === "instructor").length;
  const totalEnrollments = users.reduce(
    (acc, user) => acc + (Array.isArray(user.enrolledCourses) ? user.enrolledCourses.length : 0),
    0
  );

  const coursePriceChartData = courses
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 10)
    .reverse()
    .map((course) => ({
      name:
        course.courseTitle?.length > 16
          ? `${course.courseTitle.slice(0, 16)}...`
          : course.courseTitle || "Untitled",
      price: Number(course.coursePrice || 0),
    }));

  const creatorStatsMap = courses.reduce((acc, course) => {
    const creatorName = course.creator?.name || "Unknown";
    acc[creatorName] = (acc[creatorName] || 0) + 1;
    return acc;
  }, {});

  const creatorDistributionData = Object.entries(creatorStatsMap)
    .map(([name, count]) => ({
      name: name.length > 14 ? `${name.slice(0, 14)}...` : name,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topPricedCourses = courses
    .slice()
    .sort((a, b) => Number(b.coursePrice || 0) - Number(a.coursePrice || 0))
    .slice(0, 5);

  const topCreators = Object.entries(creatorStatsMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxCreatorCourseCount = topCreators[0]?.count || 1;

  const statCards = [
    {
      title: "Total Courses",
      value: totalCourses,
      subtitle: "Courses in your catalog",
      icon: BookOpen,
      accent: "text-blue-600",
      iconBg: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    },
    {
      title: "Published Courses",
      value: publishedCourses,
      subtitle: `${draftCourses} draft courses pending publish`,
      icon: ChartColumnIncreasing,
      accent: "text-emerald-600",
      iconBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    },
    {
      title: "Confirmed Course Sales",
      value: `${totalCollectedRevenue} EGP`,
      subtitle: `${totalPurchases} confirmed orders; direct payments go to instructors`,
      icon: CircleDollarSign,
      accent: "text-cyan-600",
      iconBg: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
    },
    {
      title: "Average Course Price",
      value: `${avgCoursePrice} EGP`,
      subtitle: `${paidCourses} paid / ${freeCourses} free`,
      icon: BadgeDollarSign,
      accent: "text-amber-600",
      iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    },
    {
      title: "Platform Users",
      value: totalUsers,
      subtitle: `${totalStudents} students, ${totalInstructors} instructors`,
      icon: Users,
      accent: "text-indigo-600",
      iconBg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    },
    {
      title: "Total Enrollments",
      value: totalEnrollments,
      subtitle: "Manual + paid enrollments combined",
      icon: GraduationCap,
      accent: "text-rose-600",
      iconBg: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    },
  ];

  return (
    <div className="space-y-6 p-3 sm:p-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-900 dark:text-slate-200">
              Dashboard Overview
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
              Complete LMS control center
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              Track courses, users, purchases, revenue, and recent activity from one place.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Updated from live API sources
          </div>
        </div>

        {(isCoursesError || isUsersError || isPurchasesError) && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
            Some dashboard sections are partially unavailable right now, but available data is still displayed.
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.title} className="border-slate-200 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.title}</p>
                    <h2 className={`text-2xl font-bold sm:text-3xl ${item.accent}`}>{item.value}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{item.subtitle}</p>
                  </div>
                  <div className={`rounded-2xl p-3 ${item.iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-slate-200 shadow-sm dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              Course Prices Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coursePriceChartData.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No courses available yet.</p>
            ) : (
              <>
                <div className="space-y-2 sm:hidden">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Top priced courses (mobile quick view)
                  </p>
                  {topPricedCourses.map((course) => (
                    <div
                      key={course._id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <p className="max-w-[72%] truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {course.courseTitle || "Untitled"}
                      </p>
                      <p className="text-sm font-bold text-blue-600 dark:text-cyan-300">
                        {Number(course.coursePrice || 0)} EGP
                      </p>
                    </div>
                  ))}
                </div>

                <div className="hidden h-80 sm:block min-w-0">
                  {isDesktop ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={300}>
                    <LineChart data={coursePriceChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#64748b"
                        angle={-20}
                        textAnchor="end"
                        interval={0}
                        height={70}
                      />
                      <YAxis stroke="#64748b" />
                      <Tooltip
                        formatter={(value) => [`${value} EGP`, "Price"]}
                        contentStyle={{
                          borderRadius: 16,
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ r: 4, stroke: "#2563eb", strokeWidth: 2, fill: "#ffffff" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              Courses Per Instructor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {creatorDistributionData.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No creator data available yet.</p>
            ) : (
              <>
                <div className="space-y-2 sm:hidden">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Instructor contribution (mobile quick view)
                  </p>
                  {topCreators.map((creator) => (
                    <div
                      key={creator.name}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                          {creator.name}
                        </p>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {creator.count} courses
                        </p>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className="h-2 rounded-full bg-teal-600 dark:bg-teal-400"
                          style={{ width: `${Math.max(10, (creator.count / maxCreatorCourseCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden h-80 sm:block min-w-0">
                  {isDesktop ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={300}>
                    <BarChart data={creatorDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" interval={0} />
                      <YAxis stroke="#64748b" allowDecimals={false} />
                      <Tooltip
                        formatter={(value) => [`${value} courses`, "Catalog"]}
                        contentStyle={{
                          borderRadius: 16,
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
                        }}
                      />
                      <Bar dataKey="count" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm dark:border-slate-800">
        <CardContent className="flex flex-wrap items-center gap-4 p-4 text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-900">
            <CalendarClock className="h-4 w-4" />
            Last snapshot: {new Date().toLocaleString()}
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-900">
            <BookOpen className="h-4 w-4" />
            Catalog value: {totalCourseCatalogValue} EGP
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-900">
            <CircleDollarSign className="h-4 w-4" />
            Confirmed course sales: {totalCollectedRevenue} EGP
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
