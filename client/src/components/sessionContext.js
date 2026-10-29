import { createContext, useContext } from "react";

export const SessionContext = createContext({ checking: false, failed: false, rejected: false, retry: () => {} });
export const useSession = () => useContext(SessionContext);
