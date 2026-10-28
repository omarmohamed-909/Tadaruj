import { useUiText, useFeedbackText } from "@/components/useUiText";
import PageSkeleton from "@/components/PageSkeleton";
import CoursePagination from "@/components/CoursePagination";
import BrandedLoader from "@/components/BrandedLoader";
import { useCanonicalCoursePage, useCoursePage } from "@/components/useCoursePage";
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
  useUpdateUserRoleMutation,
  useCreateAdminInvitationMutation,
  useUpdateUserStatusMutation,
} from "@/features/api/authApi";
import UserCourseAccessDialog from "./UserCourseAccessDialog";
import { Mail, ShieldCheck, Trash2, Users } from "lucide-react";
import React, { useEffect, useState } from "react";
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

const UsersManagement = () => {
  const feedback = useFeedbackText();
  const ui = useUiText();
  const { page, searchParams, setSearchParams, goToPage } = useCoursePage();
  const query = (searchParams.get("q") || "").slice(0, 100);
  const roleFilter = ["student", "instructor", "admin"].includes(searchParams.get("role")) ? searchParams.get("role") : "all";
  const statusFilter = ["active", "suspended"].includes(searchParams.get("status")) ? searchParams.get("status") : "all";
  const [searchQuery, setSearchQuery] = useState(query);
  useEffect(() => setSearchQuery(query), [query]);

  const [selectedUserId, setSelectedUserId] = useState(null);
  useEffect(() => {
    setSelectedUserId(null);

  }, [page, query, roleFilter, statusFilter]);
  const [deleteTargetUser, setDeleteTargetUser] = useState(null);
  const [invitationEmail, setInvitationEmail] = useState("");
  const [createAdminInvitation, { isLoading: inviting }] = useCreateAdminInvitationMutation();

  const { currentData: data, isLoading, isFetching, isError, error, refetch } = useGetAdminUsersQuery({ page, limit: 20, q: query, role: roleFilter, status: statusFilter });
  useCanonicalCoursePage(data?.page, isFetching, page, setSearchParams);

  const [updateUserRole, { isLoading: roleLoading }] = useUpdateUserRoleMutation();

  const [deleteAdminUser, { isLoading: deleteLoading }] = useDeleteAdminUserMutation();
  const [updateUserStatus, { isLoading: statusLoading }] = useUpdateUserStatusMutation();

  const users = data?.users ?? [];

  const filteredUsers = users;
  const updateFilters = (changes) => {
    setSelectedUserId(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("page");
      for (const [key, value] of Object.entries(changes)) {
        if (!value || value === "all") next.delete(key);
        else next.set(key, value);
      }
      return next;
    });
  };

  const selectedUser = users.find((user) => user._id === selectedUserId) || null;

  const handleRoleChange = async (userId, role) => {
    try {
      const response = await updateUserRole({ userId, role }).unwrap();
      toast.success(feedback(response?.message || ui("User role updated."), ui("User role updated.")));
    } catch (updateError) {
      toast.error(feedback(updateError?.data?.message || ui("Failed to update role."), ui("Failed to update role.")));
    }
  };

  const handleInviteAdmin = async (event) => {
    event.preventDefault();
    try {
      const response = await createAdminInvitation(invitationEmail).unwrap();
      toast.success(feedback(response?.message || ui("Invitation created."), ui("Invitation created.")));
      if (response?.inviteUrl) toast.info(response.inviteUrl, { duration: 15000 });
      setInvitationEmail("");
    } catch (inviteError) {
      toast.error(feedback(inviteError?.data?.message || ui("Could not invite admin."), ui("Could not invite admin.")));
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTargetUser) {
      return;
    }

    try {
      const response = await deleteAdminUser({ userId: deleteTargetUser._id }).unwrap();
      toast.success(feedback(response?.message || ui("User deleted."), ui("User deleted.")));
      setDeleteTargetUser(null);
    } catch (deleteError) {
      toast.error(feedback(deleteError?.data?.message || ui("Failed to delete user."), ui("Failed to delete user.")));
    }
  };

  const handleStatusChange = async (user) => {
    const status = user.status === "suspended" ? "active" : "suspended";
    try {
      const response = await updateUserStatus({ userId: user._id, status }).unwrap();
      toast.success(feedback(response?.message || ui("Account status updated."), ui("Account status updated.")));
    } catch (statusError) {
      toast.error(feedback(statusError?.data?.message || ui("Could not update account status."), ui("Could not update account status.")));
    }
  };

  if (isLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  if (isError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
        {feedback(error?.data?.message, ui("Failed to load users."))}
        <Button variant="outline" className="ms-3" onClick={refetch}>{ui("Retry")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:rounded-4xl sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:px-4 sm:py-2 sm:text-sm">
              <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-cyan-300" />{" "}{ui("Access Control")}{" "}</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-100 sm:text-3xl">{ui("Users Management")}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{" "}{ui("Manage platform roles and course access. Admin access requires a separate invitation.")}{" "}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:w-[360px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/70 sm:px-4 sm:py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{ui("Users")}</p>
              <p className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-100 sm:text-2xl">{data?.total ?? 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/70 sm:px-4 sm:py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{ui("Showing")}</p>
              <p className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-100 sm:text-2xl">{users.length}</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleInviteAdmin} className="flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-900 dark:bg-teal-950/30 sm:flex-row sm:items-end">
        <div className="grow"><Label htmlFor="admin-invite-email">{ui("Invite an existing user as Admin")}</Label><Input id="admin-invite-email" className="mt-2 bg-white dark:bg-slate-950" type="email" required value={invitationEmail} onChange={(event) => setInvitationEmail(event.target.value)} placeholder="person@example.com" /></div>
        <Button type="submit" disabled={inviting}>{inviting ? ui("Sending…") : ui("Send invitation")}</Button>
      </form>

      <form onSubmit={(event) => { event.preventDefault(); updateFilters({ q: searchQuery.trim() }); }} className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:rounded-4xl sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div>
              <Label htmlFor="user-search" className="text-sm font-semibold text-slate-900 dark:text-slate-100">{" "}{ui("Search users")}{" "}</Label>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{" "}{ui("Find users by name, email, or role.")}{" "}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {roleFilters.map((item) => (
                <Button
                  key={item.value}
                  type="button"
                  variant={roleFilter === item.value ? "default" : "outline"}
                  onClick={() => updateFilters({ role: item.value })}
                  className="h-9 rounded-full px-4 text-sm"
                >
                  {ui(item.label)}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex w-full max-w-md flex-wrap gap-2">
            <Input
              id="user-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              maxLength={100}
              placeholder={ui("Search by name, email, or role")}
              className="min-w-0 flex-1 rounded-2xl"
            />
            <Button type="submit">{ui("Search users")}</Button>
            <div className="w-full">
              <Label htmlFor="user-status-filter">{ui("Account status")}</Label>
              <Select value={statusFilter} onValueChange={(status) => updateFilters({ status })}>
                <SelectTrigger id="user-status-filter" className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ui("All statuses")}</SelectItem>
                  <SelectItem value="active">{ui("Active")}</SelectItem>
                  <SelectItem value="suspended">{ui("Suspended")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(query || roleFilter !== "all" || statusFilter !== "all") && <Button type="button" variant="outline" onClick={() => { setSearchQuery(""); updateFilters({ q: "", role: "all", status: "all" }); }}>{ui("Clear filters")}</Button>}
          </div>
        </div>
      </form>

      {isFetching && <BrandedLoader variant="inline" />}
      <div aria-busy={isFetching} className="grid gap-3 sm:gap-5 xl:grid-cols-2">
        {filteredUsers.map((user) => (
          <div
            key={user._id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:rounded-[28px] sm:p-5"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 ring-2 ring-slate-100 dark:ring-slate-800 sm:h-14 sm:w-14">
                  <AvatarImage src={user?.photoUrl || "/default-avatar.webp"} alt={ui("user avatar")} />
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
                {ui({ student: "Student", instructor: "Instructor", admin: "Admin" }[user.role] || "User")}
              </Badge>
              {user.status === "suspended" && <Badge variant="destructive">{ui("Suspended")}</Badge>}
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <Label className="text-sm font-semibold text-slate-900 dark:text-slate-100">{ui("Role")}</Label>
                <Select value={user.role} disabled={user.role === "admin" || roleLoading || isFetching} onValueChange={(value) => handleRoleChange(user._id, value)}>
                  <SelectTrigger className="mt-2 rounded-2xl">
                    <SelectValue placeholder={ui("Select role")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">{ui("Student")}</SelectItem>
                    <SelectItem value="instructor">{ui("Instructor")}</SelectItem>
                    {user.role === "admin" && <SelectItem value="admin">{ui("Admin")}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                {user.role !== "admin" && <Button type="button" variant="outline" disabled={statusLoading || isFetching} onClick={() => handleStatusChange(user)} className="h-10 rounded-2xl px-3 text-xs font-semibold sm:text-sm">
                  {user.status === "suspended" ? ui("Reactivate") : ui("Suspend")}
                </Button>}
                <Button
                  type="button"
                  variant="outline"
                  disabled={roleLoading || isFetching}
                  onClick={() => setSelectedUserId(user._id)}
                  className="h-10 flex-1 rounded-2xl px-3 text-xs font-semibold sm:text-sm lg:flex-none"
                >{" "}{ui("Manage Course Access")}{" "}</Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={deleteLoading || isFetching || user.role === "admin"}
                  onClick={() => setDeleteTargetUser(user)}
                  className="h-10 w-10 shrink-0 rounded-2xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/60 sm:mt-5 sm:p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                <Users className="h-4 w-4 text-blue-600 dark:text-cyan-300" />{" "}{ui("Current Access")}{" "}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {user.enrolledCourses?.length ? (
                  user.enrolledCourses.map((course) => (
                    <Badge key={course._id} variant="secondary" className="rounded-full px-3 py-1 text-xs">
                      {course.courseTitle}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{ui("No direct course access granted yet.")}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isFetching && !filteredUsers.length && (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{ui("No matching users found")}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{" "}{ui("Try a different name, email, or role.")}{" "}</p>
        </div>
      )}

      <CoursePagination label={ui("User pages")} page={data?.page ?? page} totalPages={data?.totalPages ?? 0} busy={isFetching} onPageChange={goToPage} />

      <Dialog open={Boolean(deleteTargetUser)} onOpenChange={(open) => { if (!open) setDeleteTargetUser(null); }}>
        <DialogContent className="w-[94vw] rounded-3xl border border-slate-200 dark:border-slate-800 sm:w-full">
          <DialogHeader>
            <DialogTitle>{ui("Delete user?")}</DialogTitle>
            <DialogDescription>{" "}{ui("This will permanently delete")}{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">{deleteTargetUser?.name}</span>{" "}
              ({deleteTargetUser?.email}{ui("). This action cannot be undone.")}{" "}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-2xl" onClick={() => setDeleteTargetUser(null)}>{" "}{ui("Cancel")}{" "}</Button>
            <Button
              onClick={handleDeleteUser}
              disabled={deleteLoading}
              className="rounded-2xl bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600"
            >
              {deleteLoading ? ui("Deleting...") : ui("Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedUser && <UserCourseAccessDialog key={selectedUser._id} user={selectedUser} onClose={() => setSelectedUserId(null)} />}
    </div>
  );
};

export default UsersManagement;
