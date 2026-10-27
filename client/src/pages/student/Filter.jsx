import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useGetPublishedCourseQuery } from "@/features/api/courseApi";
import { getCourseGradeLevel, getCourseSubject, getGradeLabel } from "@/lib/courseTaxonomy";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/components/languageContext";

const choices = (courses, getter) => [...new Set(courses.map(getter).filter(Boolean))].sort((a, b) => a.localeCompare(b));

const Filter = ({ handleFilterChange }) => {
  const { t, language } = useLanguage();
  const { data } = useGetPublishedCourseQuery();
  const courses = data?.courses ?? [];
  const subjects = choices(courses, getCourseSubject);
  const grades = choices(courses, getCourseGradeLevel);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedGrades, setSelectedGrades] = useState([]);
  const [sortByPrice, setSortByPrice] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleSubject = (subject) => {
    const next = selectedSubjects.includes(subject) ? selectedSubjects.filter((item) => item !== subject) : [...selectedSubjects, subject];
    setSelectedSubjects(next);
    handleFilterChange(next, selectedGrades, sortByPrice);
  };

  const toggleGrade = (grade) => {
    const next = selectedGrades.includes(grade) ? selectedGrades.filter((item) => item !== grade) : [...selectedGrades, grade];
    setSelectedGrades(next);
    handleFilterChange(selectedSubjects, next, sortByPrice);
  };

  const clearFilters = () => {
    setSelectedSubjects([]);
    setSelectedGrades([]);
    setSortByPrice("");
    handleFilterChange([], [], "");
  };

  const renderChoices = (label, emptyText, options, selected, onToggle) => (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{label}</h2>
      {options.length === 0 ? <p className="text-sm text-muted-foreground">{emptyText}</p> : (
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
              <Checkbox checked={selected.includes(option)} onCheckedChange={() => onToggle(option)} />
              <span className="text-sm">{label === t("stage") ? getGradeLabel(option, language) : option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <aside className="w-full md:w-[26%]">
      <div className="rounded-3xl border border-border bg-card p-4 shadow-sm md:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><SlidersHorizontal className="h-4 w-4 text-primary" />{t("filters")}</h2>
          <Button type="button" variant="outline" size="sm" className="md:hidden" onClick={() => setIsExpanded(!isExpanded)}>{t("filters")} <ChevronDown className="ms-1 h-4 w-4" /></Button>
        </div>
        {(selectedSubjects.length + selectedGrades.length > 0) && <p className="mt-1 text-xs text-primary">{selectedSubjects.length + selectedGrades.length} {t("selected")}</p>}
        <div className={`${isExpanded ? "mt-4 block" : "hidden"} space-y-4 md:mt-4 md:block`}>
          <Select value={sortByPrice} onValueChange={(value) => { setSortByPrice(value); handleFilterChange(selectedSubjects, selectedGrades, value); }}>
            <SelectTrigger><SelectValue placeholder={t("sortPrice")} /></SelectTrigger>
            <SelectContent><SelectItem value="low">{t("priceLow")}</SelectItem><SelectItem value="high">{t("priceHigh")}</SelectItem></SelectContent>
          </Select>
          <Separator />
          {renderChoices(t("subject"), t("noSubjects"), subjects, selectedSubjects, toggleSubject)}
          <Separator />
          {renderChoices(t("stage"), t("noStages"), grades, selectedGrades, toggleGrade)}
          {(selectedSubjects.length > 0 || selectedGrades.length > 0 || sortByPrice) && <Button type="button" variant="ghost" className="w-full" onClick={clearFilters}>{t("clearFilters")}</Button>}
        </div>
      </div>
    </aside>
  );
};

export default Filter;
