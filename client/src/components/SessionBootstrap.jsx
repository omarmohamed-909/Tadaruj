import { useLoadUserQuery } from "@/features/api/authApi";
import { SessionContext } from "./sessionContext";

export default function SessionBootstrap({ children }) {
  const { data, isLoading, isUninitialized, isError, error, refetch } = useLoadUserQuery();
  const rejected = error?.status === 401 || error?.status === 403;
  return <SessionContext.Provider value={{ checking: Boolean(isLoading || isUninitialized), failed: Boolean(isError && !rejected && !data?.user), rejected, retry: refetch }}>{children}</SessionContext.Provider>;
}
