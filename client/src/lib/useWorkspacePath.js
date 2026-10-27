import { useLocation } from "react-router-dom";
import { useCallback } from "react";

export const useWorkspacePath = () => {
  const { pathname } = useLocation();
  const base = pathname.startsWith("/instructor/") ? "/instructor" : "/admin";
  return useCallback((path = "") => `${base}${path}`, [base]);
};
