const LEGACY_GRADE = /^(?:Grade\s+[1-9]\d*|Prep\s+[1-9]\d*|Primary\s+[1-9]\d*|Secondary\s+[1-9]\d*)$/i;

export const isLegacyGrade = (value = "") => LEGACY_GRADE.test(String(value).trim());

export const getCourseSubject = (course) => {
  const subject = String(course?.subject || "").trim();
  if (subject) return subject;
  const category = String(course?.category || "").trim();
  return isLegacyGrade(category) ? "" : category;
};

export const getCourseGradeLevel = (course) => {
  const gradeLevel = String(course?.gradeLevel || "").trim();
  if (gradeLevel) return gradeLevel;
  const category = String(course?.category || "").trim();
  return isLegacyGrade(category) ? category : "";
};

export const gradeOptions = [
  "All stages", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Prep 1", "Prep 2", "Prep 3", "Secondary 1", "Secondary 2", "Secondary 3",
  "University", "Adult learning",
];

export const getGradeLabel = (value, language = "en") => {
  if (language !== "ar" || !value) return value;
  const grade = String(value).trim();
  const numbered = /^(Grade|Primary|Prep|Secondary)\s+(\d+)$/i.exec(grade);
  if (numbered) {
    const stages = { grade: "الصف", primary: "ابتدائي", prep: "إعدادي", secondary: "ثانوي" };
    return `${stages[numbered[1].toLowerCase()]} ${numbered[2]}`;
  }
  return { "All stages": "كل المراحل", University: "الجامعة", "Adult learning": "تعلّم الكبار" }[grade] || grade;
};

export const subjectSuggestions = [
  "Arabic", "English", "Mathematics", "Science", "Physics", "Chemistry", "Biology",
  "History", "Geography", "Computer Science", "French", "Economics", "Art",
  "اللغة العربية", "اللغة الإنجليزية", "الرياضيات", "العلوم", "الفيزياء", "الكيمياء", "الأحياء", "التاريخ", "الجغرافيا", "الحاسب الآلي",
];
