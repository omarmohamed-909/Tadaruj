const legacyGradePattern = /^(?:Grade\s+[1-9]\d*|Prep\s+[1-9]\d*|Primary\s+[1-9]\d*|Secondary\s+[1-9]\d*)$/i;

export const isLegacyGrade = (value = "") => legacyGradePattern.test(String(value).trim());

export const courseSubject = (course) => {
    const subject = String(course?.subject || "").trim();
    if (subject) return subject;
    const legacyCategory = String(course?.category || "").trim();
    return isLegacyGrade(legacyCategory) ? "" : legacyCategory;
};

export const courseGradeLevel = (course) => {
    const gradeLevel = String(course?.gradeLevel || "").trim();
    if (gradeLevel) return gradeLevel;
    const legacyCategory = String(course?.category || "").trim();
    return isLegacyGrade(legacyCategory) ? legacyCategory : "";
};

export const withCourseTaxonomy = (course) => ({
    ...course,
    subject: courseSubject(course),
    gradeLevel: courseGradeLevel(course),
});

export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
