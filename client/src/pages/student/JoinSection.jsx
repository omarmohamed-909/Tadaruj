import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useLanguage } from "@/components/languageContext";

const JoinSection = () => {
  const { t } = useLanguage();
  const user = useSelector((state) => state.auth.user);

  return (
    <section className="bg-[#f4f7f5] px-6 pb-16 dark:bg-slate-950 md:px-10 md:pb-24" aria-labelledby="join-title">
      <div className="relative isolate mx-auto grid max-w-7xl items-end gap-8 overflow-hidden border-t border-[#d9b578] bg-[#e7b96d] px-7 py-10 text-[#173638] sm:px-10 sm:py-12 lg:grid-cols-[1fr_auto] lg:px-14 lg:py-14">
        <span className="join-kinetic-word" aria-hidden="true">{t("brandName")}</span>
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em]">{t("joinEyebrow")}</p>
          <h2 id="join-title" className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">{t("joinTitle")}</h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#345153]">{t("joinBody")}</p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <a href="#instructors" className="inline-flex min-h-12 items-center justify-center bg-[#12383a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0b2528] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12383a]">
            {t("joinFindInstructor")}
          </a>
          {!user && <Link to="/login?mode=signup" className="inline-flex min-h-12 items-center justify-center border border-[#12383a] px-6 py-3 text-sm font-semibold text-[#12383a] transition hover:bg-[#12383a]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#12383a]">{t("signup")}</Link>}
        </div>
      </div>
    </section>
  );
};

export default JoinSection;
