import { ChartNoAxesColumn, ClipboardList, ScrollText, SquareLibrary, Users, ReceiptText } from "lucide-react";
import React from "react";
import { useSelector } from "react-redux";
import { useLanguage } from "@/components/languageContext";
import { NavLink, Outlet } from "react-router-dom";

const Sidebar = () => {
  const isAdmin = useSelector((state) => state.auth.user?.role === "admin");
  const { t } = useLanguage();
  const adminMobileLinks = [
    { to: "dashboard", label: t("dashboard"), icon: ChartNoAxesColumn },
    { to: "course", label: t("courses"), icon: SquareLibrary },
    { to: "orders", label: t("orders"), icon: ReceiptText },
    ...(isAdmin ? [{ to: "users", label: t("users"), icon: Users }] : []),
    ...(isAdmin ? [{ to: "audit-logs", label: t("activity"), icon: ScrollText }] : []),
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
      <div className="hidden lg:block w-[250px] xl:w-[300px] shrink-0 space-y-8 border-e border-border bg-card p-5 sticky top-16 h-[calc(100vh-4rem)]">
        <div className="space-y-4">
          <NavLink to="dashboard" className={linkClassName}>
            <ChartNoAxesColumn size={22} />
            <h1>{t("dashboard")}</h1>
          </NavLink>
          <NavLink to="course" className={linkClassName}>
            <SquareLibrary size={22} />
            <h1>{t("courses")}</h1>
          </NavLink>
          <NavLink to="orders" className={linkClassName}>
            <ReceiptText size={22} />
            <h1>{t("orders")}</h1>
          </NavLink>
          {isAdmin && <NavLink to="users" className={linkClassName}>
            <Users size={22} />
            <h1>{t("users")}</h1>
          </NavLink>}
          {isAdmin && <NavLink to="audit-logs" className={linkClassName}>
            <ScrollText size={22} />
            <h1>{t("activity")}</h1>
          </NavLink>}
          <NavLink to="quiz-dashboard" className={linkClassName}>
            <ClipboardList size={22} />
            <h1>{t("quiz")}</h1>
          </NavLink>
        </div>
      </div>
      <div className="min-w-0 flex-1 px-2 py-3 sm:px-3 sm:py-4 lg:px-6 lg:py-6 xl:px-8 xl:py-8">
        <div className="mb-3 lg:hidden">
          <div className="flex gap-2 overflow-x-auto rounded-xl border border-border bg-card p-2 shadow-sm dark:border-border dark:bg-card">
            {adminMobileLinks.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
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
          </div>
        </div>
        <Outlet  />
      </div>
    </div>
  );
};

export default Sidebar;
