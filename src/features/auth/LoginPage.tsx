import { useState, type FormEvent } from "react";
import { CheckCircle2, Eye, EyeOff, LockKeyhole, Moon, Sun, User } from "lucide-react";
import { useAuth } from "@/app/auth";
import { useTheme } from "@/app/theme";
import { useI18n } from "@/shared/i18n";
import { errorText } from "@/shared/lib/errors";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/Field";
import { LogoMark } from "@/shared/ui/Logo";

export function LoginPage({ companyName, version, notice }: { companyName: string | null; version: string; notice?: string }) {
  const { t, tx } = useI18n();
  const { login, expired } = useAuth();
  const { theme, toggle } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!username.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(errorText(err, tx));
      setPassword("");
      setTouched(false);
    } finally {
      setBusy(false);
    }
  };

  const points = ["p1", "p2", "p3", "p4"] as const;

  return (
    <div className="flex h-full">
      {/* Brand panel (start side = right in RTL) */}
      <section className="relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden bg-sidebar p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -top-40 -start-40 size-[520px] rounded-full bg-[#0f766e]/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -end-32 size-[460px] rounded-full bg-[#d97706]/15 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <LogoMark className="size-12" />
          <div>
            <p className="text-2xl font-bold">{t("app.name")}</p>
            <p className="text-xs tracking-[0.25em] text-white/60">HESABATI</p>
          </div>
        </div>
        <div className="relative">
          <h2 className="text-4xl leading-tight font-bold">{t("auth.heroTitle")}</h2>
          <p className="mt-3 text-white/70">{t("app.tagline")}</p>
          <ul className="mt-8 flex flex-col gap-4">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-white/85">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#5eead4]" aria-hidden="true" />
                {t(`auth.heroPoints.${p}`)}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/45">
          {t("app.version")} <span className="num">{version}</span>
        </p>
      </section>

      {/* Form panel */}
      <section className="relative flex flex-1 items-center justify-center bg-bg p-6">
        <button
          type="button"
          onClick={toggle}
          className="absolute top-5 end-5 rounded-lg p-2 text-muted hover:bg-surface-3"
          aria-label={t("theme.toggle")}
        >
          {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>

        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <LogoMark className="size-14" />
            <p className="mt-3 text-2xl font-bold">{t("app.name")}</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-8 shadow-xl shadow-black/5">
            <div className="mb-6">
              {companyName && <p className="mb-1 text-sm font-medium text-primary">{companyName}</p>}
              <h1 className="text-2xl font-bold text-text">{t("auth.title")}</h1>
              <p className="mt-1 text-sm text-muted">{t("auth.subtitle")}</p>
            </div>

            <div className="mb-4 flex flex-col gap-3 empty:hidden">
              {notice && !error && <Alert tone="success">{notice}</Alert>}
              {expired && !error && <Alert tone="warning">{t("auth.sessionExpired")}</Alert>}
              {error && <Alert tone="danger">{error}</Alert>}
            </div>

            <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
              <TextField
                label={t("auth.username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                ltr
                required
                maxLength={32}
                error={touched && !username.trim() ? t("validation.required") : undefined}
                trailing={<User className="size-4 text-subtle" aria-hidden="true" />}
              />
              <TextField
                label={t("auth.password")}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                ltr
                required
                maxLength={128}
                error={touched && !password ? t("validation.required") : undefined}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="rounded p-1 text-subtle hover:text-text"
                    aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
              />
              <Button type="submit" size="lg" loading={busy} className="mt-2 w-full">
                {busy ? t("auth.submitting") : t("auth.submit")}
              </Button>
            </form>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-subtle">
              <LockKeyhole className="size-3.5" aria-hidden="true" />
              {t("auth.secureNote")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
