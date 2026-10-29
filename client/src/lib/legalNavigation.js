// Keep policy copy in the lazy page; the footer only needs these labels.
export const legalNavigation = [
  { key: "privacy", path: "/privacy", en: "Privacy policy", ar: "سياسة الخصوصية" },
  { key: "terms", path: "/terms", en: "Terms of use", ar: "شروط الاستخدام" },
  { key: "refunds", path: "/refund-policy", en: "Payments & refunds", ar: "الدفع والاسترداد" },
];

export const legalLabel = (language) => language === "ar" ? "السياسات" : "Policies";
