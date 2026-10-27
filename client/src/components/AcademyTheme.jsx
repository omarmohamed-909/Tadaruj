import { useLayoutEffect } from "react";

// Set on the document so portal menus and dialogs inherit the same palette.
export default function AcademyTheme({ enabled }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute("data-academy-theme", enabled);
    return () => root.removeAttribute("data-academy-theme");
  }, [enabled]);
  return null;
}
