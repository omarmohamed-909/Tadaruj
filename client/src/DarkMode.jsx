import { Moon, SunMedium } from "lucide-react";
import { Button } from "./components/ui/button";
import { useTheme } from "./components/ThemeProvider";
import { useLanguage } from "./components/languageContext";

const DarkMode = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLanguage();
  const isDark = resolvedTheme === "dark";
  const label = t(isDark ? "switchToLight" : "switchToDark");

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="h-10 w-10 shrink-0 rounded-full border-border bg-card text-teal-900 shadow-none hover:bg-teal-50 dark:border-border dark:bg-secondary dark:text-teal-200 dark:hover:bg-secondary"
    >
      {isDark ? <Moon className="h-4.5 w-4.5" aria-hidden="true" /> : <SunMedium className="h-4.5 w-4.5" aria-hidden="true" />}
    </Button>
  );
};

export default DarkMode;
