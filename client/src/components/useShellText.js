import { useCallback } from "react";
import { useLanguage } from "./languageContext";
import { interpolate, translateFeedback } from "@/lib/localize";

// Keep the navigation copy small: workspace translations load with their pages.
const messages = {
  "Could not check your connection.": "تعذّر التأكد من الاتصال.",
  "Your connection may be slow or temporarily unavailable. Try again to continue.": "الاتصال ممكن يكون بطيء أو غير متاح مؤقتًا. جرّب تاني علشان تكمل.",
  "Try again": "حاول تاني",
  "Change language": "تغيير اللغة",
  "profile avatar": "الصورة الشخصية",
  "Edit Profile": "تعديل الملف الشخصي",
  "Courses": "الكورسات",
  "Users": "المستخدمون",
  "Just now": "دلوقتي",
  "{0}m ago": "منذ {0} دقيقة",
  "{0}h ago": "منذ {0} ساعة",
  "{0}d ago": "منذ {0} يوم",
  "Dashboard": "لوحة التحكم",
  "Quiz Results": "نتائج الاختبارات",
  "Admin Access": "حساب إدارة",
  "Instructor Access": "حساب مدرّس",
  "Log out": "تسجيل الخروج",
  "Login": "تسجيل الدخول",
  "Course discussions and order updates.": "مناقشات الدروس وتحديثات الطلبات.",
  "Failed to update notification.": "تعذّر تحديث الإشعار.",
  "Failed to mark notifications as read.": "تعذّر تحديد الإشعارات كمقروءة.",
  "Notifications": "الإشعارات",
  "new": "جديد",
  "Mark all read": "تحديد الكل كمقروء",
  "No notifications yet.": "لسه مفيش إشعارات.",
};

export function useShellText() {
  const { language = "en" } = useLanguage() ?? {};
  return useCallback((text, ...values) => interpolate(language === "ar" ? messages[text] ?? text : text, values), [language]);
}

export function useShellFeedback() {
  const { language = "en" } = useLanguage() ?? {};
  return useCallback((message, fallback) => translateFeedback(messages, message, fallback, language), [language]);
}
