import { Home, RotateCw } from "lucide-react";
import { useLanguage } from "./languageContext";

export default function FailureState({ notFound = false, onRetry }) {
  const { language = "en" } = useLanguage() ?? {};
  const ar = language === "ar";
  return (
    <section dir={ar ? "rtl" : "ltr"} className="flex min-h-[65vh] items-center justify-center bg-[#f4f7f5] px-5 py-16 text-[#102c2f] dark:bg-[#0d292b] dark:text-[#edf6f1]">
      <div className="w-full max-w-xl text-center">
        <img src="/brand-mark.webp" alt={ar ? "تدرّج" : "Tadaruj"} className="mx-auto mb-8 h-20 w-20 object-contain" />
        <p className="text-sm font-semibold tracking-widest text-[#126252] dark:text-teal-200">{notFound ? "404" : ar ? "نرجع نكمل؟" : "Let’s get you back"}</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{notFound ? (ar ? "الصفحة دي مش موجودة" : "This page could not be found") : (ar ? "حصل خطأ أثناء عرض الصفحة" : "Something went wrong loading this page")}</h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-8 text-[#506966] dark:text-[#b5cfca]">{notFound ? (ar ? "ممكن الرابط اتغيّر أو الصفحة اتنقلت. ارجع للرئيسية أو استكشف الكورسات." : "The link may have changed or the page may have moved. Head home or explore the courses.") : (ar ? "جرّب تحميل الصفحة تاني. لو المشكلة مستمرة، ارجع للرئيسية وحاول بعد شوية." : "Try loading the page again. If the problem continues, head home and try again shortly.")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {!notFound && <button type="button" onClick={onRetry ?? (() => window.location.reload())} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#126252] px-6 font-semibold text-white hover:bg-[#0b4c3f] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 dark:bg-teal-200 dark:text-[#12383a]"><RotateCw aria-hidden="true" size={18} />{ar ? "حاول تاني" : "Try again"}</button>}
          <a href="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#b9cfc4] px-6 font-semibold hover:bg-[#e4efe8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 dark:border-[#38635e] dark:hover:bg-[#173f3e]"><Home aria-hidden="true" size={18} />{ar ? "الصفحة الرئيسية" : "Back to home"}</a>
          {notFound && <a href="/courses" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#126252] px-6 font-semibold text-white hover:bg-[#0b4c3f] dark:bg-teal-200 dark:text-[#12383a]">{ar ? "استكشف الكورسات" : "Explore courses"}</a>}
        </div>
      </div>
    </section>
  );
}
