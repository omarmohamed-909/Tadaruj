import { useShellText } from "@/components/useShellText";
import { BookOpen, CircleHelp, House, Menu } from "lucide-react";
import BrandedLoader from "./BrandedLoader";
import DarkMode from "@/DarkMode";
import { useTheme } from "./ThemeProvider";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useLogoutUserMutation } from "@/features/api/authApi";
import { useSelector } from "react-redux";
import { useLanguage } from "./languageContext";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useSession } from "./sessionContext";
import { toast } from "sonner";

const LazyAccount = lazy(() => import("./NavbarAccount"));
const LazyNotifications = lazy(() => import("./NavbarNotifications"));
let mobileMenuImport;
const loadMobileMenu = () => mobileMenuImport ||= import("./NavbarMobileMenu").catch(error => { mobileMenuImport = undefined; throw error; });
const preloadMobileMenu = () => { void loadMobileMenu().catch(() => {}); };
const LazyMobileMenu = lazy(loadMobileMenu);
function useDesktopNavigation() {
  const [desktop, setDesktop] = useState(() => window.matchMedia?.("(min-width: 1024px)").matches ?? window.innerWidth >= 1024);
  useEffect(() => {
    const media = window.matchMedia?.("(min-width: 1024px)");
    if (!media) return;
    const update = event => setDesktop(event.matches);
    media.addEventListener("change", update); return () => media.removeEventListener("change", update);
  }, []);
  return desktop;
}
function MobileMenuTrigger({ user, logoutHandler }) {
  const { language } = useLanguage();
  const { pathname, search } = useLocation();
  const [activated, setActivated] = useState(false);
  const [open, setOpen] = useState(false);
  const trigger = useRef(null);
  useEffect(() => setOpen(false), [pathname, search]);
  return <>
    <button ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={language === "ar" ? "فتح القائمة" : "Open menu"} onPointerEnter={preloadMobileMenu} onFocus={preloadMobileMenu} onClick={() => { setActivated(true); setOpen(true); }} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/90 text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2">
      <Menu className="h-4 w-4" />
    </button>
    {activated && <Suspense fallback={<BrandedLoader variant="tiny" />}><LazyMobileMenu user={user} logoutHandler={logoutHandler} open={open} onOpenChange={setOpen} returnFocus={() => trigger.current?.focus()} /></Suspense>}
  </>;
}

const Navbar = () => {
  const ui = useShellText();
  const isDesktop = useDesktopNavigation();
  const { checking } = useSession();
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
                width={512} height={384} decoding="async" src={logoSrc}
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
          {user && isDesktop && !checking && <Suspense fallback={<span className="h-10 w-10" />}><LazyNotifications user={user} /></Suspense>}
          {user ? (
            <>{isDesktop && !checking ? <Suspense fallback={<span className="h-10 w-10 rounded-full bg-muted" />}><LazyAccount user={user} logoutHandler={logoutHandler} /></Suspense> : <span className="h-10 w-10 rounded-full bg-muted" />}</>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2">{t("login")}</Link>
              <Link to="/login" className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2">{t("signup")}</Link>
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
            width={512} height={384} decoding="async" src={logoSrc}
            alt={t("brandName")}
            className="h-14 w-auto object-contain"
          />
        </Link>
        <MobileMenuTrigger user={checking ? null : user} logoutHandler={logoutHandler} />
      </div>
    </div>
  );
};

export default Navbar;
