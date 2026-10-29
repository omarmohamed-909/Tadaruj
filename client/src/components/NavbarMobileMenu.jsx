import { useShellText } from "@/components/useShellText";
import { BookOpen, CircleHelp, ClipboardList, House, LayoutDashboard, LogOut, SquareLibrary, Users, UserCircle2, X } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import DarkMode from "@/DarkMode";
import { useTheme } from "./ThemeProvider";
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "./ui/sheet";
import { Separator } from "./ui/separator";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "./languageContext";
import CommentNotifications from "./NavbarNotifications";

const MobileNavbar = ({ user, logoutHandler, open, onOpenChange, returnFocus }) => {
  const ui = useShellText();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const logoSrc = language === "ar"
    ? isDark ? "/tadaruj-logo-ar-dark.webp" : "/tadaruj-logo-ar.webp"
    : isDark ? "/tadaruj-logo-dark.webp" : "/tadaruj-logo.webp";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onCloseAutoFocus={event => { event.preventDefault(); returnFocus(); }} hideCloseButton className="flex w-[90%] max-w-none flex-col overflow-hidden border-l border-border bg-popover p-0 dark:border-border dark:bg-popover sm:w-[420px] md:w-[460px]">
        <SheetHeader className="mt-2 flex flex-row items-center justify-between border-b border-border/80 px-4 pb-4 dark:border-border sm:px-5">
          <SheetTitle className="pr-2 text-lg font-bold sm:text-xl">
            <Link to="/" aria-label={t("brandName")}>
              <img
                width={512} height={384} decoding="async" src={logoSrc}
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

export default MobileNavbar;
