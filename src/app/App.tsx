import { useCallback, useEffect, useState } from "react";
import { api } from "@/shared/api/commands";
import type { AppStatus } from "@/shared/api/types";
import { I18nProvider, useI18n } from "@/shared/i18n";
import { errorText } from "@/shared/lib/errors";
import { FullScreenLoader } from "@/shared/ui/Spinner";
import { LoginPage } from "@/features/auth/LoginPage";
import { SetupWizard } from "@/features/setup/SetupWizard";
import { FatalErrorPage } from "@/features/system/StatusPages";
import { AuthProvider, useAuth } from "./auth";
import { AppRouter } from "./router";
import { ThemeProvider } from "./theme";

type Boot = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ready"; status: AppStatus };

/** Decides between first-run setup, login and the main application. */
function BootGate() {
  const { t, tx } = useI18n();
  const { user } = useAuth();
  const [boot, setBoot] = useState<Boot>({ kind: "loading" });
  const [notice, setNotice] = useState<string | undefined>();

  const load = useCallback(async () => {
    setBoot({ kind: "loading" });
    try {
      setBoot({ kind: "ready", status: await api.appStatus() });
    } catch (e) {
      setBoot({ kind: "error", message: errorText(e, tx) });
    }
  }, [tx]);

  useEffect(() => {
    void load();
  }, [load]);

  if (boot.kind === "loading") return <FullScreenLoader label={t("app.loading")} />;
  if (boot.kind === "error") return <FatalErrorPage message={boot.message} onRetry={() => void load()} />;
  if (!boot.status.initialized) {
    return (
      <SetupWizard
        onDone={() => {
          setNotice(t("setup.done"));
          void load();
        }}
      />
    );
  }
  if (!user) return <LoginPage companyName={boot.status.companyName} version={boot.status.appVersion} notice={notice} />;
  return <AppRouter />;
}

export function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AuthProvider>
          <BootGate />
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
