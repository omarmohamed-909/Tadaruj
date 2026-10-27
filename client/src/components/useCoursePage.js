import { useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { parseCoursePage, withCoursePage } from "@/lib/coursePagination";

export function useCoursePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseCoursePage(searchParams.get("page"));
  const goToPage = useCallback((nextPage) => setSearchParams((current) => withCoursePage(current, nextPage)), [setSearchParams]);
  return { page, searchParams, setSearchParams, goToPage };
}

export function useCanonicalCoursePage(serverPage, fetching, page, setSearchParams) {
  useEffect(() => {
    if (!fetching && Number.isInteger(serverPage) && serverPage > 0 && serverPage !== page) {
      setSearchParams((current) => withCoursePage(current, serverPage), { replace: true });
    }
  }, [serverPage, fetching, page, setSearchParams]);
}
