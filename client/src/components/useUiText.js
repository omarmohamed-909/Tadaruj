import { useCallback } from "react";
import { useLanguage } from "./languageContext";
import { interfaceMessages, translateInterface } from "@/lib/interfaceMessages";
import { translateFeedback } from "@/lib/localize";

export function useUiText() {
  const { language = "en" } = useLanguage() ?? {};
  return useCallback((text, ...values) => translateInterface(text, language, values), [language]);
}

export function useFeedbackText() {
  const { language = "en" } = useLanguage() ?? {};
  return useCallback((message, fallback) => translateFeedback(interfaceMessages, message, fallback, language), [language]);
}
