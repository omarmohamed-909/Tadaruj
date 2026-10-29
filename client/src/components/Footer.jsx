import DeferredImage from "./DeferredImage";
import { Facebook, MessageCircle } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "./languageContext";
import { support } from "@/lib/support";
import { legalLabel, legalNavigation } from "@/lib/legalNavigation";

const Footer = () => {
  const { t, language } = useLanguage();
  const logoSrc = language === "ar" ? "/tadaruj-logo-ar-dark.webp" : "/tadaruj-logo-dark.webp";
  const links = [["/", t("home")], ["/courses", t("courses")], ["/about-us", t("about")], ["/course/search?query=", t("browse")]];
  return (
    <footer className="relative overflow-hidden bg-[#0b2528] text-white">
      <div className="pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full bg-teal-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-[#e7b96d]/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-6 pb-8 pt-14 md:px-10 md:pt-20">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.7fr_0.9fr_1fr]">
          <div><div><Link to="/" aria-label={t("brandName")} className="inline-block"><DeferredImage width={512} height={384} src={logoSrc} alt={t("brandName")} className="h-28 w-auto object-contain" /></Link><p className="mt-2 text-sm text-slate-300">{t("footerTag")}</p></div><p className="mt-6 max-w-sm text-sm leading-7 text-slate-300">{t("footerBody")}</p><div className="mt-6 flex items-center gap-3"><a href={support.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={language === "ar" ? "واتساب" : "WhatsApp"} className="rounded-full border border-white/15 p-2.5 text-slate-300 transition hover:border-teal-300 hover:text-teal-200"><MessageCircle className="h-4 w-4" /></a><a href={support.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label={language === "ar" ? "فيسبوك" : "Facebook"} className="rounded-full border border-white/15 p-2.5 text-slate-300 transition hover:border-teal-300 hover:text-teal-200"><Facebook className="h-4 w-4" /></a></div></div>
          <div><h4 className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-teal-200">{t("exploreLabel")}</h4><nav className="space-y-3">{links.map(([href, label]) => <Link key={href} to={href} className="block text-sm text-slate-300 transition hover:text-white">{label}</Link>)}</nav></div>
          <div><h4 className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-teal-200">{legalLabel(language)}</h4><nav aria-label={legalLabel(language)} className="space-y-1">{legalNavigation.map(item => <Link key={item.key} to={item.path} className="block rounded-lg py-2 text-sm text-slate-300 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-200">{item[language === "ar" ? "ar" : "en"]}</Link>)}</nav></div>
          <div><h4 className="mb-5 text-xs font-bold uppercase tracking-[0.2em] text-teal-200">{t("contact")}</h4><p className="text-sm leading-7 text-slate-300">{t("footerContact")}</p><a href={support.telephoneUrl} dir="ltr" className="mt-3 inline-block text-sm font-semibold text-white transition hover:text-teal-200">{support.phone}</a></div>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><span>© 2026 {t("brandName")}</span><span>{language === "ar" ? "نتعلم خطوة بخطوة" : "Learning, one step at a time"}</span></div>
      </div>
    </footer>
  );
};

export default Footer;
