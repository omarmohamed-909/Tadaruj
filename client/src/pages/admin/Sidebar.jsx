import { ChartNoAxesColumn, ClipboardList, ScrollText, SquareLibrary, Users, ReceiptText, MessageSquare } from "lucide-react";
import React from "react";
import { useSelector } from "react-redux";
import { useLanguage } from "@/components/languageContext";
import { NavLink, Outlet } from "react-router-dom";

const Sidebar = () => {
  const isAdmin = useSelector((state) => state.auth.user?.role === "admin");
  const { t, language } = useLanguage();
  const workspaceLinks = [
    { to: "dashboard", label: t("dashboard"), icon: ChartNoAxesColumn },
    { to: "course", label: language === "ar" ? "إدارة الكورسات" : "Manage courses", icon: SquareLibrary },
    { to: "orders", label: t("orders"), icon: ReceiptText },
    ...(isAdmin ? [{ to: "users", label: t("users"), icon: Users }] : []),
    ...(isAdmin ? [{ to: "audit-logs", label: t("activity"), icon: ScrollText }] : []),
    { to: "assignments", label: language === "ar" ? "الواجبات" : "Assignments", icon: ClipboardList },
    { to: "students", label: language === "ar" ? "متابعة الطلاب" : "Student progress", icon: Users },
    { to: "questions", label: language === "ar" ? "أسئلة الطلاب" : "Questions", icon: MessageSquare },
    { to: "quiz-dashboard", label: t("quiz"), icon: ClipboardList },
  ];

  const linkClassName = ({ isActive }) =>
    `flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors ${
      isActive
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-muted dark:text-muted-foreground dark:hover:bg-secondary"
    }`;

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-background text-foreground">
      <div className="hidden lg:block w-[250px] xl:w-[300px] shrink-0 space-y-8 border-e border-border bg-card p-5 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
        <nav aria-label={t("dashboard")} className="space-y-2">
          {workspaceLinks.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} className={linkClassName}>
              {React.createElement(icon, { size: 20, "aria-hidden": true })}<span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="min-w-0 flex-1 px-2 py-3 sm:px-3 sm:py-4 lg:px-6 lg:py-6 xl:px-8 xl:py-8">
        <div className="mb-3 lg:hidden">
          <nav aria-label={t("dashboard")} className="grid grid-cols-2 gap-1 sm:grid-cols-3 rounded-xl border border-border bg-card p-2 shadow-sm dark:border-border dark:bg-card">
            {workspaceLinks.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`
                  }
                >
                  <Icon size={14} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
        <Outlet  />
      </div>
    </div>
  );
};

export default Sidebar;
