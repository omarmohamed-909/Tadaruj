import { ArrowUpRight, Search, BookOpen, FlaskConical, Languages, Monitor } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/components/languageContext";

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  const searchHandler = (event) => {
    event.preventDefault();
    navigate(`/course/search?query=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <section className="academy-hero relative overflow-hidden px-5 py-16 sm:py-20 lg:px-10 lg:pb-24 lg:pt-16">
      <div className="academy-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <div>
          <p className="mb-6 inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-teal-800 dark:text-teal-200">
            <span className="h-px w-8 bg-teal-700" />{t("heroEyebrow")}
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.08] tracking-[-0.055em] text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            {t("heroBody")}
          </p>
          <form onSubmit={searchHandler} className="mt-9 flex max-w-xl items-center gap-2 rounded-xl border border-slate-300 bg-white p-2 shadow-[0_14px_35px_-25px_rgba(13,48,49,.55)] dark:border-slate-700 dark:bg-slate-900">
            <Search className="ms-3 h-5 w-5 shrink-0 text-teal-800 dark:text-teal-300" aria-hidden="true" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t("heroSearch")} aria-label={t("heroSearch")} className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400" />
            <button type="submit" className="rounded-lg bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-900 dark:bg-teal-500 dark:text-slate-950">{t("search")}</button>
          </form>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <button type="button" onClick={() => navigate("/courses")} className="inline-flex items-center gap-2 border-b-2 border-teal-700 pb-1 font-semibold text-teal-900 dark:text-teal-200">
              {t("explore")} <ArrowUpRight className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-500 dark:text-slate-400">{t("heroNote")}</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg" aria-hidden="true">
          <div className="academy-board relative overflow-hidden rounded-[1.5rem] border border-teal-900/15 bg-[#102c2f] p-7 text-[#ecf5e9] sm:p-10">
            <div className="flex items-center justify-between border-b border-white/15 pb-5 text-[11px] uppercase tracking-[0.2em] text-white/65"><span>{t("brandName")} / {t("catalogLabel")}</span><BookOpen className="h-5 w-5" /></div>
            <p className="mt-10 text-sm font-medium uppercase tracking-[0.2em] text-[#dfb989]">{t("shelfTitle")}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="academy-subject-tile rounded-xl bg-[#e7b96d] p-5 text-[#23343a]"><Languages className="mb-9 h-7 w-7" /><span className="text-xl font-semibold">{t("subjectLanguages")}</span></div>
              <div className="academy-subject-tile rounded-xl bg-[#d8e5cf] p-5 text-[#23343a]"><FlaskConical className="mb-9 h-7 w-7" /><span className="text-xl font-semibold">{t("subjectSciences")}</span></div>
              <div className="academy-subject-tile rounded-xl bg-[#cae1df] p-5 text-[#23343a]"><Monitor className="mb-9 h-7 w-7" /><span className="text-xl font-semibold">{t("subjectTechnology")}</span></div>
              <div className="academy-subject-tile rounded-xl border border-white/30 p-5"><BookOpen className="mb-9 h-7 w-7" /><span className="text-xl font-semibold">{t("subjectMore")}</span></div>
            </div>
            <p className="mt-8 border-t border-white/20 pt-5 text-xs uppercase tracking-[0.16em] text-white/65">{t("discoverGrow")}</p>
          </div>
          <div className={`absolute -bottom-9 ${language === "ar" ? "-left-5" : "-right-5"} rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-xl dark:border-slate-700 dark:bg-slate-900`}><p className="text-xs uppercase tracking-[0.16em] text-slate-500">01 / 03</p><p className="mt-1 text-sm font-semibold">{t("stepOne")} → {t("stepTwo")} → {t("stepThree")}</p></div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
