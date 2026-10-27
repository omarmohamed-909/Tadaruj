// Localize known system templates while preserving instructor/course names verbatim.
export function notificationText(notification, language) {
  const message = notification.message || "";
  if (language !== "ar") return message;
  const templates = {
    "manual-order-approved": [/^Your payment for (.*) was confirmed\. Course access is now available\.$/s, (_, course) => `تم تأكيد دفع كورس ${course}. الكورس متاح ليك دلوقتي.`],
    "manual-order-rejected": [/^Your order for (.*) was rejected by the instructor\.$/s, (_, course) => `المدرّس رفض طلب اشتراكك في ${course}.`],
    "comment-reply": [/^(.*?) replied to your comment in (.*?) for (.*)\.$/s, (_, actor, lecture, course) => `${actor} ردّ على تعليقك في درس ${lecture} من كورس ${course}.`],
    "comment": [/^(.*?) commented on (.*?) in (.*)\.$/s, (_, actor, lecture, course) => `${actor} علّق على درس ${lecture} في كورس ${course}.`],
  };
  const template = templates[notification.type];
  return template ? message.replace(template[0], template[1]) : message;
}
