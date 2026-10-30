import { useLanguage } from "./languageContext";
import { groupCurriculum } from "@/lib/curriculum";

export default function CurriculumList({ lectures, units = [], renderLecture }) {
  const { language } = useLanguage();
  if (!units.length) return lectures.map(renderLecture);
  return groupCurriculum(lectures, units).filter(group => group.lessons.length).map(group => <section key={group.id} className="space-y-2">
    <h3 className="flex items-center justify-between gap-3 rounded-lg bg-secondary px-3 py-3 text-sm font-bold text-foreground">
      <span>{group.title || (language === "ar" ? "دروس عامة" : "General lessons")}</span>
      <span className="shrink-0 text-xs font-normal text-muted-foreground">{group.lessons.length} {language === "ar" ? "درس" : "lessons"}</span>
    </h3>
    {group.lessons.map(({ lecture, index }) => renderLecture(lecture, index))}
  </section>);
}
