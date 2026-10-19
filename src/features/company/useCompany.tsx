import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/shared/api/commands";
import type { Company } from "@/shared/api/types";
import { useSession } from "@/app/auth";

interface CompanyValue {
  company: Company | null;
  error: unknown;
  setCompany: (c: Company) => void;
  reload: () => Promise<void>;
}

const CompanyContext = createContext<CompanyValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { token } = useSession();
  const [company, setCompany] = useState<Company | null>(null);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    try {
      setCompany(await api.companyGet(token));
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return <CompanyContext.Provider value={{ company, error, setCompany, reload }}>{children}</CompanyContext.Provider>;
}

export function useCompany(): CompanyValue {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used inside <CompanyProvider>");
  return ctx;
}
