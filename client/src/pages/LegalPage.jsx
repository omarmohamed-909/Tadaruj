import { Link } from "react-router-dom";
import { useLanguage } from "@/components/languageContext";
import { legalLabel, legalNavigation } from "@/lib/legalNavigation";
import { support } from "@/lib/support";
import { legalContent, legalUpdatedAt } from "./legalContent";

export default function LegalPage({ policy }) {
  const { language, t } = useLanguage();
  const locale = language === "ar" ? "ar" : "en";
  const content = legalContent[locale][policy];
  const title = legalNavigation.find(item => item.key === policy)[locale];
  const updated = new Date(`${legalUpdatedAt}T00:00:00Z`).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  return <main className="bg-background px-5 py-12 text-foreground sm:px-8 md:py-16">
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-border pb-9 md:pb-12">
        <p className="text-sm font-semibold text-primary">{t("brandName")} / {legalLabel(locale)}</p>
        <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">{content.intro}</p>
        <p className="mt-6 text-sm text-muted-foreground">{locale === "ar" ? "آخر تحديث: " : "Last updated: "}<time dateTime={legalUpdatedAt}>{updated}</time></p>
      </header>
      <div className="grid gap-10 py-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16 lg:py-14">
        <aside className="min-w-0">
          <div className="lg:sticky lg:top-24">
            <nav aria-label={legalLabel(locale)} className="flex flex-wrap gap-2 lg:flex-col">
              {legalNavigation.map(item => <Link key={item.key} to={item.path} aria-current={item.key === policy ? "page" : undefined} className={`rounded-xl border px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${item.key === policy ? "border-primary/20 bg-accent text-primary" : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{item[locale]}</Link>)}
            </nav>
            <details className="mt-7 border-t border-border pt-6" open>
              <summary className="cursor-pointer text-sm font-semibold">{locale === "ar" ? "في هذه الصفحة" : "On this page"}</summary>
              <nav aria-label={locale === "ar" ? "أقسام الصفحة" : "Page contents"} className="mt-4 space-y-1">
                {content.sections.map(section => <a key={section.id} href={`#${section.id}`} className="block rounded-lg px-2 py-2 text-sm leading-6 text-muted-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">{section.title}</a>)}
              </nav>
            </details>
          </div>
        </aside>
        <article className="min-w-0">
          <p className="rounded-2xl border border-border bg-card p-6 text-base font-medium leading-8 md:p-7">{content.summary}</p>
          <div className="divide-y divide-border">
            {content.sections.map((section, index) => <section key={section.id} id={section.id} aria-labelledby={`heading-${section.id}`} className="scroll-mt-24 py-8 first:pt-10">
              <h2 id={`heading-${section.id}`} className="text-xl font-bold leading-8 md:text-2xl"><span className="me-3 text-sm font-medium text-primary" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{section.title}</h2>
              {section.paragraphs?.map(paragraph => <p key={paragraph} className="mt-4 text-base leading-8 text-muted-foreground">{paragraph}</p>)}
              {section.items && <ul className="mt-4 list-disc space-y-3 ps-6 text-base leading-8 text-muted-foreground">{section.items.map(item => <li key={item}>{item}</li>)}</ul>}
            </section>)}
          </div>
          <section aria-labelledby="policy-support" className="mt-5 rounded-2xl border border-border bg-card p-6 md:p-8">
            <h2 id="policy-support" className="text-xl font-bold">{locale === "ar" ? "تواصل مع دعم تدرّج" : "Contact Tadaruj support"}</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{locale === "ar" ? "للاستفسارات وطلبات الخصوصية أو المساعدة في مشكلة اشتراك، تواصل معنا عبر وسائل الدعم الرسمية." : "For policy questions, privacy requests, or help with an enrollment issue, use our official support channels."}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a href={support.whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{locale === "ar" ? "تواصل عبر واتساب" : "Contact on WhatsApp"}</a>
              <a href={support.facebookUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{locale === "ar" ? "صفحتنا على فيسبوك" : "Our Facebook page"}</a>
              <a href={support.telephoneUrl} dir="ltr" className="px-2 py-3 text-sm font-semibold text-primary underline underline-offset-4">{support.phone}</a>
            </div>
          </section>
        </article>
      </div>
    </div>
  </main>;
}
