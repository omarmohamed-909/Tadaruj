import PageSkeleton from "@/components/PageSkeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDeleteAdminUserMutation,
  useGetAdminUsersQuery,
  useUpdateUserCourseAccessMutation,
  useUpdateUserRoleMutation,
  useCreateAdminInvitationMutation,
  useUpdateUserStatusMutation,
} from "@/features/api/authApi";
import { useGetAdminManageableCoursesQuery } from "@/features/api/courseApi";
import { BookOpen, Mail, ShieldCheck, Trash2, Users } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

const roleBadgeClassName = {
  instructor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  admin: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  student: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const roleFilters = [
  { label: "All", value: "all" },
  { label: "Students", value: "student" },
  { label: "Instructors", value: "instructor" },
  { label: "Admins", value: "admin" },
];

const CourseAccessCard = ({ course, hasAccess, onAction, isLoading }) => (
  <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-950/80 sm:rounded-[28px] sm:p-5">
    <div className="flex h-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-4 lg:flex-1">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-cyan-500/10 dark:text-cyan-300 sm:h-14 sm:w-14">
          <BookOpen className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-base font-semibold leading-7 text-slate-950 dark:text-slate-100 sm:text-lg lg:line-clamp-1">
            {course.courseTitle}
          </h3>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="truncate">{course.creator?.name || "Unknown creator"}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span>{course.isPublished ? "Published" : "Draft"}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0">
        <Badge
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            hasAccess
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          {hasAccess ? "Has access" : "No access"}
        </Badge>
        <Button
          type="button"
          variant={hasAccess ? "outline" : "default"}
          disabled={isLoading}
          onClick={onAction}
          className="h-10 min-w-28 rounded-2xl text-xs sm:min-w-32 sm:text-sm"
        >
          {hasAccess ? "Revoke" : "Grant access"}
        </Button>
      </div>
    </div>
  </div>
);

const UsersManagement = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [invitationEmail, setInvitationEmail] = useState("");
  const [createAdminInvitation, { isLoading: inviting }] = useCreateAdminInvitationMutation();

  const { data, isLoading, isError, error } = useGetAdminUsersQuery();
  const { data: coursesData, isLoading: coursesLoading } = useGetAdminManageableCoursesQuery();
  const [updateUserRole, { isLoading: roleLoading }] = useUpdateUserRoleMutation();
  const [updateUserCourseAccess, { isLoading: accessLoading }] = useUpdateUserCourseAccessMutation();
  const [deleteAdminUser, { isLoading: deleteLoading }] = useDeleteAdminUserMutation();
  const [updateUserStatus, { isLoading: statusLoading }] = useUpdateUserStatusMutation();

  const users = data?.users ?? [];
  const manageableCourses = coursesData?.courses ?? [];
  const filteredUsers = users.filter((user) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesRole = roleFilter === "all" ? true : user.role === roleFilter;

    if (!matchesRole) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [user.name, user.email, user.role].some((value) =>
      value?.toLowerCase().includes(normalizedQuery)
    );
  });

  const selectedUser = users.find((user) => user._id === selectedUserId) || null;
  const filteredManageableCourses = manageableCourses.filter((course) => {
    const normalizedQuery = courseSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return true;
    }

    return [course.courseTitle, course.creator?.name, course.isPublished ? "published" : "draft"]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedQuery));
  });
  const coursesWithAccess = filteredManageableCourses.filter((course) =>
    selectedUser?.enrolledCourses?.some((enrolledCourse) => enrolledCourse._id === course._id)
  );
  const coursesWithoutAccess = filteredManageableCourses.filter(
    (course) => !selectedUser?.enrolledCourses?.some((enrolledCourse) => enrolledCourse._id === course._id)
  );

  const handleRoleChange = async (userId, role) => {
    try {
      const response = await updateUserRole({ userId, role }).unwrap();
      toast.success(response?.message || "User role updated.");
    } catch (updateError) {
      toast.error(updateError?.data?.message || "Failed to update role.");
    }
  };

  const handleInviteAdmin = async (event) => {
    event.preventDefault();
    try {
      const response = await createAdminInvitation(invitationEmail).unwrap();
      toast.success(response?.message || "Invitation created.");
      if (response?.inviteUrl) toast.info(response.inviteUrl, { duration: 15000 });
      setInvitationEmail("");
    } catch (inviteError) {
      toast.error(inviteError?.data?.message || "Could not invite admin.");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) {
      return;
    }

    try {
      const response = await deleteAdminUser({ userId: deleteTargetUser._id }).unwrap();
      toast.success(response?.message || "User deleted.");
      setDeleteTargetUser(null);
    } catch (deleteError) {
      toast.error(deleteError?.data?.message || "Failed to delete user.");
    }
  };

  const handleStatusChange = async (user) => {
    const status = user.status === "suspended" ? "active" : "suspended";
    try {
      const response = await updateUserStatus({ userId: user._id, status }).unwrap();
      toast.success(response?.message || "Account status updated.");
    } catch (statusError) {
      toast.error(statusError?.data?.message || "Could not update account status.");
    }
  };

  const handleCourseAccess = async (courseId, action) => {
    if (!selectedUserId) {
      return;
    }

    try {
      const response = await updateUserCourseAccess({
        userId: selectedUserId,
        courseId,
        action,
      }).unwrap();
      toast.success(response?.message || "Course access updated.");
    } catch (accessError) {
      toast.error(accessError?.data?.message || "Failed to update course access.");
    }
  };

  if (isLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  if (isError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
        {error?.data?.message || "Failed to load users."}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:rounded-4xl sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:px-4 sm:py-2 sm:text-sm">
              <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-cyan-300" />
              Access Control
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-100 sm:text-3xl">Users Management</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Manage platform roles and course access. Admin access requires a separate invitation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:w-[360px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/70 sm:px-4 sm:py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Users</p>
              <p className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-100 sm:text-2xl">{users.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/70 sm:px-4 sm:py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Courses</p>
              <p className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-100 sm:text-2xl">{manageableCourses.length}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleInviteAdmin} className="flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-900 dark:bg-teal-950/30 sm:flex-row sm:items-end">
        <div className="grow"><Label htmlFor="admin-invite-email">Invite an existing user as Admin</Label><Input id="admin-invite-email" className="mt-2 bg-white dark:bg-slate-950" type="email" required value={invitationEmail} onChange={(event) => setInvitationEmail(event.target.value)} placeholder="person@example.com" /></div>
        <Button type="submit" disabled={inviting}>{inviting ? "Sending…" : "Send invitation"}</Button>
      </form>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:rounded-4xl sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div>
              <Label htmlFor="user-search" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Search users
              </Label>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Find users by name, email, or role.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {roleFilters.map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  variant={roleFilter === item.value ? "default" : "outline"}
                  onClick={() => setRoleFilter(item.value)}
                  className="h-9 rounded-full px-4 text-sm"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <Input
            id="user-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by name, email, or role"
            className="w-full max-w-md rounded-2xl"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:gap-5 xl:grid-cols-2">
        {filteredUsers.map((user) => (
          <div
            key={user._id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:rounded-[28px] sm:p-5"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 ring-2 ring-slate-100 dark:ring-slate-800 sm:h-14 sm:w-14">
                  <AvatarImage src={user?.photoUrl || "/default-avatar.webp"} alt="user avatar" />
                  <AvatarFallback>{user?.name?.slice(0, 2)?.toUpperCase() || "US"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-slate-950 dark:text-slate-100 sm:text-xl">{user.name}</h2>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>
              </div>

              <Badge className={`rounded-full px-3 py-1 text-xs font-semibold ${roleBadgeClassName[user.role] || roleBadgeClassName.student}`}>
                {user.role}
              </Badge>
              {user.status === "suspended" && <Badge variant="destructive">Suspended</Badge>}
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">Role</Label>
                <Select value={user.role} disabled={user.role === "admin"} onValueChange={(value) => handleRoleChange(user._id, value)}>
                  <SelectTrigger className="mt-2 rounded-2xl">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                    {user.role === "admin" && <SelectItem value="admin">Admin</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                {user.role !== "admin" && <Button type="button" variant="outline" disabled={statusLoading} onClick={() => handleStatusChange(user)} className="h-10 rounded-2xl px-3 text-xs font-semibold sm:text-sm">
                  {user.status === "suspended" ? "Reactivate" : "Suspend"}
                </Button>}
                <Button
                  type="button"
                  variant="outline"
                  disabled={roleLoading || accessLoading}
                  onClick={() => setSelectedUserId(user._id)}
                  className="h-10 flex-1 rounded-2xl px-3 text-xs font-semibold sm:text-sm lg:flex-none"
                >
                  Manage Course Access
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={deleteLoading || user.role === "admin"}
                  onClick={() => setDeleteTargetUser(user)}
                  className="h-10 w-10 shrink-0 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/60 sm:mt-5 sm:p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Users className="h-4 w-4 text-blue-600 dark:text-cyan-300" />
                Current Access
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {user.enrolledCourses?.length ? (
                  user.enrolledCourses.map((course) => (
                    <Badge key={course._id} variant="secondary" className="rounded-full px-3 py-1 text-xs">
                      {course.courseTitle}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No direct course access granted yet.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!filteredUsers.length && (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">No matching users found</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Try a different name, email, or role.
          </p>
        </div>
      )}

      <Dialog open={Boolean(deleteTargetUser)} onOpenChange={(open) => { if (!open) setDeleteTargetUser(null); }}>
        <DialogContent className="w-[94vw] rounded-3xl border border-slate-200 dark:border-slate-800 sm:w-full">
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{deleteTargetUser?.name}</span>{" "}
              ({deleteTargetUser?.email}). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={() => setDeleteTargetUser(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteUser}
              disabled={deleteLoading}
              className="rounded-2xl bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
            >
              {deleteLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedUser)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUserId(null);
            setCourseSearchQuery("");
          }
        }}
      >
        <DialogContent className="max-h-[88vh] w-[96vw] max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-950 sm:w-full sm:rounded-4xl">
          <DialogHeader className="border-b border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/40 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <DialogTitle className="text-xl font-bold sm:text-2xl">Manage Course Access</DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-6">
                  {selectedUser
                    ? `Grant or revoke direct course access for ${selectedUser.name}.`
                    : "Select a user."}
                </DialogDescription>
              </div>

              {selectedUser && (
                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-cyan-500/10 dark:text-cyan-300">
                    {manageableCourses.length} courses
                  </Badge>
                  <Badge className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {selectedUser.enrolledCourses?.length ?? 0} direct grants
                  </Badge>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="max-h-[calc(88vh-148px)] overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0b1220_100%)] sm:px-6 sm:py-6">
            {coursesLoading ? (
              <PageSkeleton variant="default" />
            ) : (
              <div className="space-y-4">
                <div className="sticky top-0 z-10 rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Showing {filteredManageableCourses.length} of {manageableCourses.length} courses
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Search by title, creator, or status. Granted courses appear first.
                      </p>
                    </div>
                    <Input
                      value={courseSearchQuery}
                      onChange={(event) => setCourseSearchQuery(event.target.value)}
                      placeholder="Search courses in this dialog"
                      className="w-full max-w-md rounded-2xl"
                    />
                  </div>
                </div>

                {coursesWithAccess.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-900/10">
                      <div>
                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Granted Courses</p>
                        <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                          Courses this user can already access directly.
                        </p>
                      </div>
                      <Badge className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {coursesWithAccess.length}
                      </Badge>
                    </div>
                    {coursesWithAccess.map((course) => (
                      <CourseAccessCard
                        key={course._id}
                        course={course}
                        hasAccess
                        isLoading={accessLoading}
                        onAction={() => handleCourseAccess(course._id, "revoke")}
                      />
                    ))}
                  </div>
                )}

                {coursesWithoutAccess.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-900/70">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Available To Grant</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Courses the user does not have direct access to yet.
                        </p>
                      </div>
                      <Badge className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {coursesWithoutAccess.length}
                      </Badge>
                    </div>
                    {coursesWithoutAccess.map((course) => (
                      <CourseAccessCard
                        key={course._id}
                        course={course}
                        hasAccess={false}
                        isLoading={accessLoading}
                        onAction={() => handleCourseAccess(course._id, "grant")}
                      />
                    ))}
                  </div>
                )}

                {!filteredManageableCourses.length && (
                  <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">No matching courses found</p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      Try a different course title, creator name, or status.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;
