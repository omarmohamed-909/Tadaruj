import React, { useEffect, useRef } from "react";
import { useLanguage } from "@/components/languageContext";

const LearningPathSection = () => {
  const { t } = useLanguage();
  const sectionRef = useRef(null);
  const steps = [
    ["homeStepOneTitle", "homeStepOneBody"],
    ["homeStepTwoTitle", "homeStepTwoBody"],
    ["homeStepThreeTitle", "homeStepThreeBody"],
  ];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (!("IntersectionObserver" in window)) {
      section.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        section.classList.add("is-visible");
        observer.disconnect();
      }
    }, { threshold: 0.15 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="academy-journey bg-[#12383a] px-6 py-16 text-[#f7f4e9] md:px-10 md:py-20" aria-labelledby="home-path-title">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div className="journey-copy">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-[#e7b96d]">{t("homePathEyebrow")}</p>
          <h2 id="home-path-title" className="max-w-xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {t("homePathTitle")}
          </h2>
          <p className="mt-6 max-w-lg text-base leading-8 text-[#d2e0dc]">{t("homePathBody")}</p>
        </div>
        <div className="grid gap-0 sm:grid-cols-3">
          {steps.map(([title, body], index) => (
            <div key={title} className="journey-step border-t border-white/25 py-6 sm:border-t-0 sm:border-s sm:py-2 sm:ps-6 sm:pe-5">
              <span className="text-sm font-medium text-[#e7b96d]" aria-hidden="true">0{index + 1}</span>
              <h3 className="mt-7 text-xl font-semibold leading-snug">{t(title)}</h3>
              <p className="mt-3 text-sm leading-7 text-[#cadbd6]">{t(body)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LearningPathSection;
