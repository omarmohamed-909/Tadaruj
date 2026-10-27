import React from "react";

const BrandedLoader = ({ variant = "section", className = "" }) => {
  const compact = variant === "inline" || variant === "tiny";
  const tiny = variant === "tiny";
  const label = document.documentElement.lang === "ar" ? "جارٍ التحميل" : "Loading";
  const containerClass = variant === "fullPage"
    ? "min-h-screen bg-background"
    : variant === "page"
      ? "min-h-[60vh]"
      : compact
        ? "inline-flex"
        : "min-h-52";

  return (
    <div role="status" aria-label={label} className={`flex items-center justify-center ${containerClass} ${className}`}>
      <span className={`relative inline-flex shrink-0 items-center justify-center ${tiny ? "h-5 w-5" : compact ? "h-7 w-7" : "h-24 w-24"}`}>
        <span aria-hidden="true" className={`absolute inset-0 rounded-full border-solid border-border border-t-amber-500 dark:border-t-amber-400 motion-safe:animate-spin ${compact ? "border-2" : "border-[3px]"}`} />
        <img src="/brand-mark.webp" alt="" width={tiny ? 12 : compact ? 17 : 62} height={tiny ? 12 : compact ? 17 : 62} className={tiny ? "h-3 w-3 object-contain" : compact ? "h-[17px] w-[17px] object-contain" : "h-[62px] w-[62px] object-contain"} />
      </span>
    </div>
  );
};

export default BrandedLoader;
