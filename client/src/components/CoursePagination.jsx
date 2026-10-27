import { useLanguage } from "./languageContext";

export default function CoursePagination({ page, totalPages, busy = false, onPageChange }) {
  const { t } = useLanguage();
  if (totalPages <= 1) return null;
  const buttonClass = "min-h-11 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <nav aria-label={`${t("courses")} · ${t("pageLabel")}`} className="mt-10 flex flex-wrap items-center justify-center gap-4">
      <button type="button" disabled={busy || page <= 1} onClick={() => onPageChange(page - 1)} className={buttonClass}>{t("previousPage")}</button>
      <span aria-live="polite" className="text-sm text-muted-foreground">{t("pageLabel")} {page} / {totalPages}</span>
      <button type="button" disabled={busy || page >= totalPages} onClick={() => onPageChange(page + 1)} className={buttonClass}>{t("nextPage")}</button>
    </nav>
  );
}
