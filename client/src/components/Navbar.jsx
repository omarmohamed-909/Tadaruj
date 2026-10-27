import { useShellText, useShellFeedback } from "@/components/useShellText";
import { notificationText } from "@/lib/notificationText";
import {
  BadgeCheck,
  Bell,
  BookOpen,
  CircleHelp,
  ClipboardList,
  House,
  LayoutDashboard,
  LogOut,
  Menu,
  SquareLibrary,
  Users,
  UserCircle2,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import BrandedLoader from "./BrandedLoader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import DarkMode from "@/DarkMode";
import { useTheme } from "./ThemeProvider";
import {
  useGetCommentNotificationsQuery,
  useMarkAllCommentNotificationsAsReadMutation,
  useMarkCommentNotificationAsReadMutation,
} from "@/features/api/courseProgressApi";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";
import { Separator } from "./ui/separator";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { authApi, useLogoutUserMutation } from "@/features/api/authApi";
import { purchaseApi } from "@/features/api/purchaseApi";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { useLanguage } from "./languageContext";

const Navbar = () => {
  const ui = useShellText();
  const { language, setLanguage, t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const logoSrc = language === "ar"
    ? isDark ? "/tadaruj-logo-ar-dark.webp" : "/tadaruj-logo-ar.webp"
    : isDark ? "/tadaruj-logo-dark.webp" : "/tadaruj-logo.webp";
  const { user } = useSelector((store) => store.auth);
  const [logoutUser] = useLogoutUserMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const hideCenterNav = location.pathname === "/login";
  const logoutHandler = async () => {
    try {
      await logoutUser().unwrap();
      toast.success(language === "ar" ? "تم تسجيل الخروج." : "Signed out.");
      navigate("/login?mode=login");
    } catch {
      toast.error(language === "ar" ? "تعذّر تسجيل الخروج. حاول مرة تانية." : "Could not sign out. Please try again.");
    }
  };

  return (
    <div className="fixed left-0 right-0 top-0 z-10 border-b border-border bg-[#fbfaf7]/95 backdrop-blur-xl duration-300 dark:border-border dark:bg-[#101c20]/95">
      {/* Desktop */}
      <div className="relative mx-auto hidden h-16 max-w-7xl items-center px-4 lg:flex lg:px-6">
        <div className="flex items-center justify-self-start">
          <div className="flex items-center px-1">
            <Link to="/" aria-label={t("brandName")}>
              <img
                src={logoSrc}
                alt={t("brandName")}
                className="h-14 w-auto object-contain"
              />
            </Link>
          </div>
        </div>
        {!hideCenterNav && (
          <nav className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card/80 p-1 dark:border-border dark:bg-secondary/70">
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-teal-50 text-teal-900 dark:bg-teal-900/30 dark:text-teal-200"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-foreground"
                  }`
                }
              >
                <House className="h-4 w-4" />
                {t("home")}
              </NavLink>
              <NavLink
                to="/courses"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-teal-50 text-teal-900 dark:bg-teal-900/30 dark:text-teal-200"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-foreground"
                  }`
                }
              >
                <BookOpen className="h-4 w-4" />
                {t("courses")}
              </NavLink>
              <NavLink
                to="/about-us"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-teal-50 text-teal-900 dark:bg-teal-900/30 dark:text-teal-200"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-foreground"
                  }`
                }
              >
                <CircleHelp className="h-4 w-4" />
                {t("about")}
              </NavLink>
            </div>
          </nav>
        )}
        {/* User icons and dark mode icon  */}
        <div className="ms-auto flex shrink-0 items-center gap-2 rounded-full border border-border/80 bg-card/70 px-2 py-1.5 shadow-sm dark:border-border dark:bg-card/70">
          {user && <CommentNotifications user={user} />}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer ring-2 ring-transparent transition hover:ring-slate-200 dark:hover:ring-slate-700">
                  <AvatarImage
                    src={user?.photoUrl || "/default-avatar.webp"}
                    alt={t("profile")}
                  />
                  <AvatarFallback>{user?.name?.trim()?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 rounded-3xl border border-border/80 bg-card/95 p-2 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] dark:border-border dark:bg-card/95">
                <DropdownMenuLabel className="rounded-2xl px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 ring-2 ring-slate-100 dark:ring-slate-800">
                      <AvatarImage
                        src={user?.photoUrl || "/default-avatar.webp"}
                        alt={ui("profile avatar")}
                      />
                      <AvatarFallback className="bg-[#dff5eb] font-semibold text-[#126252] dark:bg-teal-400/15 dark:text-teal-200">{user?.name?.trim()?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground dark:text-foreground">
                        {user?.name}
                      </p>
                      <p className="truncate text-xs font-normal text-muted-foreground dark:text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="rounded-2xl px-3 py-3 focus:bg-muted dark:focus:bg-secondary">
                    <Link to="/" className="flex w-full items-center gap-3 font-medium">
                      <House className="h-4 w-4 text-[#126252] dark:text-teal-300" />
                      {t("home")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-2xl px-3 py-3 focus:bg-muted dark:focus:bg-secondary">
                    <Link to="my-learning" className="flex w-full items-center gap-3 font-medium">
                      <BookOpen className="h-4 w-4 text-[#126252] dark:text-teal-300" />
                      {t("learning")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-2xl px-3 py-3 focus:bg-muted dark:focus:bg-secondary">
                    <Link to="profile" className="flex w-full items-center gap-3 font-medium">
                      <UserCircle2 className="h-4 w-4 text-[#126252] dark:text-teal-300" />
                      {t("profile")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={logoutHandler}
                    className="rounded-2xl px-3 py-3 font-medium focus:bg-muted dark:focus:bg-secondary"
                  >
                    <LogOut className="h-4 w-4 text-[#126252] dark:text-teal-300" />
                    {t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                {["instructor", "admin"].includes(user?.role) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="rounded-2xl px-3 py-3 focus:bg-muted dark:focus:bg-secondary">
                      <Link to={user?.role === "admin" ? "/admin/dashboard" : "/instructor/dashboard"} className="flex w-full items-center gap-3 font-medium">
                        <BadgeCheck className="h-4 w-4 text-[#126252] dark:text-teal-300" />
                        {t("dashboard")}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => navigate("/login")}>
                {t("login")}
              </Button>
              <Button className="rounded-full" onClick={() => navigate("/login")}>{t("signup")}</Button>
            </div>
          )}
          <button type="button" onClick={() => setLanguage(language === "en" ? "ar" : "en")} className="min-w-16 rounded-lg px-2 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 dark:text-teal-200 dark:hover:bg-secondary" aria-label={ui("Change language")}>{t("language")}</button>
          <DarkMode />
        </div>
      </div>
      {/* Mobile device  */}
      <div className="flex h-16 items-center justify-between px-4 lg:hidden">
        <Link to="/" className="flex items-center px-1" aria-label={t("brandName")}>
          <img
            src={logoSrc}
            alt={t("brandName")}
            className="h-14 w-auto object-contain"
          />
        </Link>
        <MobileNavbar user={user} logoutHandler={logoutHandler} />
      </div>
    </div>
  );
};

export default Navbar;

const getNotificationTimeLabel = (createdAt, ui, language) => {
  const timestamp = new Date(createdAt).getTime();

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const diffInMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));

  if (diffInMinutes < 1) {
    return ui("Just now");
  }

  if (diffInMinutes < 60) {
    return ui("{0}m ago", diffInMinutes);
  }

  const diffInHours = Math.round(diffInMinutes / 60);
  if (diffInHours < 24) {
    return ui("{0}h ago", diffInHours);
  }

  const diffInDays = Math.round(diffInHours / 24);
  if (diffInDays < 7) {
    return ui("{0}d ago", diffInDays);
  }

  return new Date(createdAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-GB");
};

const MobileNavbar = ({ user, logoutHandler }) => {
  const ui = useShellText();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [pathname, search]);
  const { language, setLanguage, t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const logoSrc = language === "ar"
    ? isDark ? "/tadaruj-logo-ar-dark.webp" : "/tadaruj-logo-ar.webp"
    : isDark ? "/tadaruj-logo-dark.webp" : "/tadaruj-logo.webp";

  return (
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          aria-label={language === "ar" ? "فتح القائمة" : "Open menu"}
          className="rounded-full border-border bg-card/90 hover:bg-muted dark:border-border dark:bg-card dark:hover:bg-secondary"
          variant="outline"
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent hideCloseButton className="flex w-[90%] max-w-none flex-col overflow-hidden border-l border-border bg-popover p-0 dark:border-border dark:bg-popover sm:w-[420px] md:w-[460px]">
        <SheetHeader className="mt-2 flex flex-row items-center justify-between border-b border-border/80 px-4 pb-4 dark:border-border sm:px-5">
          <SheetTitle className="pr-2 text-lg font-bold sm:text-xl">
            <Link to="/" aria-label={t("brandName")}>
              <img
                src={logoSrc}
                alt={t("brandName")}
                className="h-14 w-auto object-contain"
              />
            </Link>
          </SheetTitle>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {user && <CommentNotifications user={user} compact />}
            <button type="button" onClick={() => setLanguage(language === "en" ? "ar" : "en")} className="px-2 text-sm font-semibold text-teal-800 dark:text-teal-200" aria-label={ui("Change language")}>{t("language")}</button>
            <DarkMode />
            <SheetClose asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label={language === "ar" ? "إغلاق القائمة" : "Close menu"}
                className="h-9 w-9 rounded-xl border-border bg-card/90 text-muted-foreground hover:bg-muted dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-secondary sm:h-10 sm:w-10"
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {user && (
            <div className="mb-5 rounded-3xl border border-border/80 bg-card/80 p-4 shadow-sm dark:border-border dark:bg-card/60">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-slate-100 dark:ring-slate-800">
                  <AvatarImage
                    src={user?.photoUrl || "/default-avatar.webp"}
                    alt={ui("profile avatar")}
                  />
                    <AvatarFallback className="bg-[#dff5eb] font-semibold text-[#126252] dark:bg-teal-400/15 dark:text-teal-200">{user?.name?.trim()?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground dark:text-foreground">
                    {user?.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground dark:text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
          )}

          <nav className="space-y-2">
            <SheetClose asChild>
              <Link
                to="/"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted dark:text-foreground dark:hover:bg-secondary"
              >
                <House className="h-4 w-4 text-[#126252] dark:text-teal-300" />
                {t("home")}
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                to="/courses"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted dark:text-foreground dark:hover:bg-secondary"
              >
                <BookOpen className="h-4 w-4 text-[#126252] dark:text-teal-300" />
                {t("courses")}
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                to="/about-us"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted dark:text-foreground dark:hover:bg-secondary"
              >
                <CircleHelp className="h-4 w-4 text-[#126252] dark:text-teal-300" />
                {t("about")}
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                to="/my-learning"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted dark:text-foreground dark:hover:bg-secondary"
              >
                <BookOpen className="h-4 w-4 text-[#126252] dark:text-teal-300" />
                {t("learning")}
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                to="/profile"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-muted dark:text-foreground dark:hover:bg-secondary"
              >
                <UserCircle2 className="h-4 w-4 text-[#126252] dark:text-teal-300" />{" "}{ui("Edit Profile")}{" "}</Link>
            </SheetClose>
            {["instructor", "admin"].includes(user?.role) && (
              <>
                <SheetClose asChild>
                  <button
                    type="button"
                    onClick={() => navigate(user?.role === "admin" ? "/admin/dashboard" : "/instructor/dashboard")}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base font-medium text-foreground transition-colors hover:bg-muted dark:text-foreground dark:hover:bg-secondary"
                  >
                    <LayoutDashboard className="h-4 w-4 text-[#126252] dark:text-teal-300" />{" "}{ui("Dashboard")}{" "}</button>
                </SheetClose>
                <SheetClose asChild>
                  <button
                    type="button"
                    onClick={() => navigate(user?.role === "admin" ? "/admin/course" : "/instructor/course")}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base font-medium text-foreground transition-colors hover:bg-muted dark:text-foreground dark:hover:bg-secondary"
                  >
                    <SquareLibrary className="h-4 w-4 text-[#126252] dark:text-teal-300" />{" "}{ui("Courses")}{" "}</button>
                </SheetClose>
                {user?.role === "admin" && <SheetClose asChild>
                  <button
                    type="button"
                    onClick={() => navigate("/admin/users")}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base font-medium text-foreground transition-colors hover:bg-muted dark:text-foreground dark:hover:bg-secondary"
                  >
                    <Users className="h-4 w-4 text-[#126252] dark:text-teal-300" />{" "}{ui("Users")}{" "}</button>
                </SheetClose>}
                <SheetClose asChild>
                  <button
                    type="button"
                    onClick={() => navigate(user?.role === "admin" ? "/admin/quiz-dashboard" : "/instructor/quiz-dashboard")}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-base font-medium text-foreground transition-colors hover:bg-muted dark:text-foreground dark:hover:bg-secondary"
                  >
                    <ClipboardList className="h-4 w-4 text-[#126252] dark:text-teal-300" />{" "}{ui("Quiz Results")}{" "}</button>
                </SheetClose>
              </>
            )}
          </nav>
        </div>
        <Separator className="shrink-0 bg-muted dark:bg-secondary" />
        {["instructor", "admin"].includes(user?.role) && (
          <div className="shrink-0 px-5 pt-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground dark:text-muted-foreground">
            {user?.role === "admin" ? ui("Admin Access") : ui("Instructor Access")}
          </div>
        )}
        <SheetFooter className="shrink-0 bg-card/80 p-5 dark:bg-card/75">
          {user ? (
            <SheetClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={() => logoutHandler()}
                className="h-12 w-full justify-start rounded-2xl border-border bg-card/70 text-base font-semibold text-foreground hover:bg-muted dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-secondary"
              >
                <LogOut className="mr-2 h-4 w-4" />{" "}{ui("Log out")}{" "}</Button>
            </SheetClose>
          ) : (
            <SheetClose asChild>
              <Button
                type="button"
                onClick={() => navigate("/login")}
                className="h-12 w-full rounded-2xl"
              >{" "}{ui("Login")}{" "}</Button>
            </SheetClose>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

const CommentNotifications = ({ user, compact = false }) => {
  const feedback = useShellFeedback();
  const ui = useShellText();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const hasAuthToken = typeof window !== "undefined" && Boolean(window.localStorage.getItem("lms_auth_token"));
  const { data, isLoading, refetch } = useGetCommentNotificationsQuery(undefined, {
    skip: !user?._id || !hasAuthToken,
    pollingInterval: 15000,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const [markNotificationAsRead] = useMarkCommentNotificationAsReadMutation();
  const [markAllNotificationsAsRead, { isLoading: isMarkingAllNotifications }] =
    useMarkAllCommentNotificationsAsReadMutation();

  const notifications = useMemo(() => data?.notifications ?? [], [data?.notifications]);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );
  const notificationDescription = ui("Course discussions and order updates.");

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetch();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refetch]);

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification?.isRead) {
        await markNotificationAsRead(notification._id).unwrap();
      }

      setOpen(false);

      if (notification?.type === "manual-order-approved") {
        dispatch(purchaseApi.util.invalidateTags(["PurchaseStatus"]));
        dispatch(authApi.util.invalidateTags(["CurrentUser"]));
      }

      if (notification?.link) {
        navigate(notification.link);
      }
    } catch (error) {
      toast.error(feedback(error?.data?.message || ui("Failed to update notification."), ui("Failed to update notification.")));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead().unwrap();
    } catch (error) {
      toast.error(feedback(error?.data?.message || ui("Failed to mark notifications as read."), ui("Failed to mark notifications as read.")));
    }
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          refetch();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={`relative rounded-full border-border bg-card/90 hover:bg-muted dark:border-border dark:bg-card dark:hover:bg-secondary ${
            compact ? "h-10 w-10" : "h-11 w-11"
          }`}
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">{ui("Notifications")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[360px] rounded-3xl border border-border/80 bg-card/95 p-2 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] dark:border-border dark:bg-card/95"
      >
        <DropdownMenuLabel className="rounded-2xl px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground dark:text-foreground">{ui("Notifications")}</p>
              <p className="mt-1 text-xs font-normal text-muted-foreground dark:text-muted-foreground">
                {notificationDescription}
              </p>
            </div>
            {unreadCount > 0 && (
              <div className="flex items-center gap-2">
                <Badge className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground hover:bg-[#dff5eb] dark:bg-accent/10 dark:text-accent-foreground">
                  {unreadCount}{" "}{ui("new")}{" "}</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isMarkingAllNotifications}
                  onClick={handleMarkAllAsRead}
                  className="h-8 rounded-xl px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-foreground"
                >{" "}{ui("Mark all read")}{" "}</Button>
              </div>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <BrandedLoader variant="inline" className="w-full py-3" />
        ) : notifications.length === 0 ? (
          <div className="px-3 py-4 text-sm text-muted-foreground dark:text-muted-foreground">{" "}{ui("No notifications yet.")}{" "}</div>
        ) : (
          notifications.map((notification) => {
            return (
              <DropdownMenuItem
                key={notification._id}
                className={`rounded-2xl px-3 py-3 focus:bg-muted dark:focus:bg-secondary ${
                  notification.isRead ? "opacity-75" : ""
                }`}
                onSelect={(event) => {
                  event.preventDefault();
                  void handleNotificationClick(notification);
                }}
              >
                <div className="flex w-full items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      notification.isRead
                        ? "bg-muted text-muted-foreground dark:bg-secondary dark:text-muted-foreground"
                        : "bg-[#dff5eb] text-[#126252] dark:bg-accent/10 dark:text-accent-foreground"
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="line-clamp-2 text-sm font-semibold text-foreground dark:text-foreground">
                        {notificationText(notification, language)}
                      </p>
                      {!notification.isRead && (
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                      )}
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
                      {getNotificationTimeLabel(notification.createdAt, ui, language)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
