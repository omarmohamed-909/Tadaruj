import { ArrowUpRight, BookOpen, GraduationCap, ShieldCheck } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/components/languageContext";

const AboutSection = () => {
  const { t } = useLanguage();
  const pillars = [
    { icon: BookOpen, number: "01", title: t("aboutPillarOneTitle"), body: t("aboutPillarOneBody") },
    { icon: GraduationCap, number: "02", title: t("aboutPillarTwoTitle"), body: t("aboutPillarTwoBody") },
    { icon: ShieldCheck, number: "03", title: t("aboutPillarThreeTitle"), body: t("aboutPillarThreeBody") },
  ];
  return (
    <main className="overflow-hidden bg-[#f4f7f5] text-slate-950 dark:bg-slate-950 dark:text-white">
      <section className="relative bg-[#0d292b] px-6 py-20 text-white md:px-10 md:py-28">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div><p className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-teal-200">{t("aboutBrand")}</p><h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight md:text-6xl">{t("aboutHeroTitle")}</h1><p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">{t("heroBody")}</p><Link to="/courses" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#67d5b5] px-6 py-3 text-sm font-bold text-[#0d292b] transition hover:bg-[#e7b96d]">{t("browse")} <ArrowUpRight className="h-4 w-4" /></Link></div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">{[["aboutAllSubjects", "aboutOnePlace"], ["aboutClearPaths", "aboutEveryStage"], ["aboutHumanTeachers", "aboutRealGuidance"], ["aboutYourPace", "aboutYourProgress"]].map(([title, caption]) => <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur"><p className="text-2xl font-black text-[#8ee6c8]">{t(title)}</p><p className="mt-2 text-sm text-slate-300">{t(caption)}</p></div>)}</div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24"><div className="mb-10 max-w-2xl"><p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">{t("aboutWhyEyebrow")}</p><h2 className="text-3xl font-black tracking-tight md:text-5xl">{t("aboutWhyTitle")}</h2><p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">{t("aboutWhyBody")}</p></div><div className="grid gap-5 md:grid-cols-3">{pillars.map((pillar) => { const Icon = pillar.icon; return <article key={pillar.number} className="rounded-[28px] border border-[#d5e0d9] bg-white p-7 shadow-[0_20px_50px_-35px_rgba(18,56,58,0.45)] dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div className="rounded-2xl bg-[#dff5eb] p-3 text-[#126252] dark:bg-teal-400/10 dark:text-teal-300"><Icon className="h-5 w-5" /></div><span className="text-sm font-bold text-[#c49a52]">{pillar.number}</span></div><h3 className="mt-7 text-xl font-bold">{pillar.title}</h3><p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{pillar.body}</p></article>; })}</div></section>
    </main>
  );
};

export default AboutSection;
