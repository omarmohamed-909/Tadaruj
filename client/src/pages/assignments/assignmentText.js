export const statuses = ar => ({ submitted: ar ? "بانتظار التصحيح" : "Awaiting review", graded: ar ? "تم التصحيح" : "Graded", returned: ar ? "مطلوب إعادة التسليم" : "Changes requested" });
export function assignmentError(error, ar) {
  const messages = {
    INVALID_INPUT: ["راجع البيانات وحدود الدرجات وطول النص.", "Check the fields, score limits and text length."],
    INVALID_LINK: ["استخدم رابط HTTPS بدون بيانات دخول.", "Use an HTTPS link without embedded credentials."],
    ACCESS_DENIED: ["ليس لديك صلاحية الوصول للكورس.", "You do not have access to this course."],
    ASSIGNMENT_LOCKED: ["بعد أول تسليم، التعليمات والدرجة ثابتة ولا يمكن إخفاء الواجب. تقدر تغيّر الموعد أو تغلق التسليم.", "After the first submission, the title, instructions and score are locked and the assignment stays published. You can change its deadline or close submissions."],
    ASSIGNMENT_CLOSED: ["الواجب مغلق للتسليم حاليًا.", "This assignment is closed to submissions."],
    STALE_ASSIGNMENT: ["الواجب اتغيّر. حدّث الصفحة قبل الحفظ؛ انسخ تعديلاتك لو محتاجها.", "This assignment changed. Reload before saving; copy your edits if needed."],
    STALE_SUBMISSION: ["التسليم اتغيّر أو اتحفظ بالفعل. حدّث الصفحة قبل المحاولة تاني.", "The submission changed or was already saved. Reload before trying again."],
    SUBMISSION_LOCKED: ["تم التسليم بالفعل. إعادة التسليم تحتاج طلبًا من المدرّس.", "Already submitted. A teacher must request changes before you can resubmit."],
    ATTEMPT_LIMIT: ["وصلت للحد الأقصى: ١٠ نسخ تسليم.", "The limit of ten submission versions has been reached."],
  };
  return messages[error?.data?.code]?.[ar ? 0 : 1] || (ar ? "تعذّر تنفيذ الطلب. بياناتك لسه موجودة؛ حاول تاني." : "The request failed. Your input is preserved; try again.");
}
export const formatDate = (date, ar) => date ? new Date(date).toLocaleString(ar ? "ar-EG" : "en-GB") : (ar ? "بدون موعد نهائي" : "No deadline");
export function localDateInput(value) { if (!value) return ""; const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
export const fieldClass = "min-h-11 w-full rounded-xl border border-border bg-background p-3 text-foreground";
export const buttonClass = "min-h-11 rounded-xl border border-border bg-card px-4 py-2 text-sm disabled:opacity-40";
