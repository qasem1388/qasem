import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Info, ShieldCheck, Sparkles, UserCog } from "lucide-react";
import { api } from "@/shared/api/commands";
import { ApiError } from "@/shared/api/client";
import type { CompanyInput, NewAdminInput } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
import { errorText } from "@/shared/lib/errors";
import { adminSchema, companySchema, zodFieldErrors } from "@/shared/validation/schemas";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/Field";
import { LogoMark } from "@/shared/ui/Logo";
import { CompanyForm, emptyCompanyForm, type CompanyFormState } from "@/features/company/CompanyForm";
import { PasswordStrength } from "./PasswordStrength";

type Step = "welcome" | "company" | "admin" | "review";
const STEPS: Step[] = ["welcome", "company", "admin", "review"];
const STEP_ICONS: Record<Step, ReactNode> = {
  welcome: <Sparkles className="size-4" />,
  company: <Building2 className="size-4" />,
  admin: <UserCog className="size-4" />,
  review: <ShieldCheck className="size-4" />,
};

const emptyAdmin: NewAdminInput = { username: "", fullName: "", password: "", passwordConfirm: "" };

export function SetupWizard({ onDone }: { onDone: () => void }) {
  const { t, tx } = useI18n();
  const [step, setStep] = useState<Step>("welcome");
  const [company, setCompany] = useState<CompanyFormState>(emptyCompanyForm);
  const [admin, setAdmin] = useState<NewAdminInput>(emptyAdmin);
  const [companyErrors, setCompanyErrors] = useState<Record<string, string>>({});
  const [adminErrors, setAdminErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const index = STEPS.indexOf(step);
  const scrollRef = useRef<HTMLDivElement>(null);

  // New step or new error: bring the top of the card (where errors show) into view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, error]);

  const validateCompany = () => {
    const r = companySchema.safeParse(company);
    setCompanyErrors(r.success ? {} : zodFieldErrors(r.error));
    return r.success ? (r.data as CompanyInput) : null;
  };
  const validateAdmin = () => {
    const r = adminSchema.safeParse(admin);
    setAdminErrors(r.success ? {} : zodFieldErrors(r.error));
    return r.success;
  };

  const next = () => {
    setError(null);
    if (step === "company" && !validateCompany()) return setError(t("errors.validation"));
    if (step === "admin" && !validateAdmin()) return setError(t("errors.validation"));
    setStep(STEPS[index + 1] ?? step);
  };

  const finish = async () => {
    const c = validateCompany();
    if (!c || !validateAdmin()) return setError(t("errors.validation"));
    setSubmitting(true);
    setError(null);
    try {
      await api.setupInitialize({ company: c, admin: { ...admin, username: admin.username.trim(), fullName: admin.fullName.trim() } });
      onDone();
    } catch (e) {
      if (e instanceof ApiError && e.code === "validation") {
        setCompanyErrors(e.fieldMap("company."));
        setAdminErrors(e.fieldMap("admin."));
        setStep(Object.keys(e.fieldMap("company.")).length ? "company" : "admin");
      }
      if (e instanceof ApiError && e.code === "already_initialized") onDone();
      setError(errorText(e, tx));
    } finally {
      setSubmitting(false);
    }
  };

  const adminErr = (k: keyof NewAdminInput) => (adminErrors[k] ? tx(`validation.${adminErrors[k]}`) : undefined);

  return (
    <div ref={scrollRef} className="flex h-full flex-col overflow-y-auto bg-bg">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-8 py-4">
        <LogoMark className="size-10" />
        <div>
          <p className="text-lg font-bold">{t("setup.title")}</p>
          <p className="text-xs text-muted">{t("setup.subtitle")}</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {/* Stepper */}
        <ol className="mb-8 flex items-center gap-2" aria-label={t("setup.title")}>
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center gap-2" aria-current={s === step ? "step" : undefined}>
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm",
                  i < index && "border-primary bg-primary text-primary-fg",
                  i === index && "border-primary bg-primary-soft text-primary",
                  i > index && "border-border-strong text-subtle",
                )}
              >
                {i < index ? <Check className="size-4" /> : STEP_ICONS[s]}
              </span>
              <span className={cn("text-sm whitespace-nowrap", i === index ? "font-semibold text-text" : "text-muted")}>
                {tx(`setup.steps.${s}`)}
              </span>
              {i < STEPS.length - 1 && <span className={cn("h-px flex-1", i < index ? "bg-primary" : "bg-border")} />}
            </li>
          ))}
        </ol>

        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
          {error && <Alert tone="danger" className="mb-6">{error}</Alert>}

          {step === "welcome" && (
            <div className="flex flex-col items-center py-6 text-center">
              <LogoMark className="size-20" />
              <h1 className="mt-5 text-3xl font-bold">{t("setup.welcomeTitle")}</h1>
              <p className="mt-3 max-w-xl leading-relaxed text-muted">{t("setup.welcomeBody")}</p>
              <ul className="mt-6 flex flex-col gap-2 text-start">
                {(["p1", "p2", "p3"] as const).map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-success" /> {t(`setup.welcomePoints.${p}`)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step === "company" && <CompanyForm value={company} onChange={setCompany} errors={companyErrors} />}

          {step === "admin" && (
            <form className="mx-auto flex max-w-lg flex-col gap-4" onSubmit={(e) => { e.preventDefault(); next(); }} noValidate>
              <Alert tone="info">{t("setup.adminHint")}</Alert>
              <TextField label={t("admin.fullName")} required autoFocus value={admin.fullName} maxLength={100}
                onChange={(e) => setAdmin({ ...admin, fullName: e.target.value })} error={adminErr("fullName")} />
              <TextField label={t("admin.username")} hint={t("admin.usernameHint")} required ltr autoComplete="off" maxLength={32}
                value={admin.username} onChange={(e) => setAdmin({ ...admin, username: e.target.value })} error={adminErr("username")} />
              <div className="flex flex-col gap-2">
                <TextField label={t("admin.password")} hint={t("setup.passwordRules")} required ltr type="password" autoComplete="new-password" maxLength={128}
                  value={admin.password} onChange={(e) => setAdmin({ ...admin, password: e.target.value })} error={adminErr("password")} />
                <PasswordStrength password={admin.password} />
              </div>
              <TextField label={t("admin.passwordConfirm")} required ltr type="password" autoComplete="new-password" maxLength={128}
                value={admin.passwordConfirm} onChange={(e) => setAdmin({ ...admin, passwordConfirm: e.target.value })} error={adminErr("passwordConfirm")} />
              <button type="submit" hidden />
            </form>
          )}

          {step === "review" && (
            <div className="flex flex-col gap-6">
              <h2 className="text-lg font-semibold">{t("setup.reviewTitle")}</h2>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-3 rounded-xl border border-border bg-surface-2 p-5 text-sm md:grid-cols-2">
                <ReviewRow label={t("company.nameAr")} value={company.nameAr} />
                <ReviewRow label={t("company.nameEn")} value={company.nameEn} ltr />
                <ReviewRow label={t("company.vatNumber")} value={company.vatNumber} ltr />
                <ReviewRow label={t("company.crNumber")} value={company.crNumber} ltr />
                <ReviewRow label={t("company.city")} value={[company.city, company.district].filter(Boolean).join(" — ")} />
                <ReviewRow label={t("company.fiscalYearStartMonth")} value={tx(`months.${company.fiscalYearStartMonth}`)} />
                <ReviewRow label={t("company.calendarDisplay")} value={tx(`calendar.${company.calendarDisplay}`)} />
                <ReviewRow label={t("company.baseCurrency")} value={t("company.baseCurrencyValue")} />
                <ReviewRow label={t("admin.fullName")} value={admin.fullName} />
                <ReviewRow label={t("admin.username")} value={admin.username} ltr />
              </dl>
              <p className="flex items-center gap-2 text-sm text-muted">
                <Info className="size-4 text-primary" /> {t("auth.secureNote")}
              </p>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
            {index > 0 ? (
              <Button variant="secondary" onClick={() => { setError(null); setStep(STEPS[index - 1]!); }} disabled={submitting}
                icon={<ArrowRight className="size-4 ltr:rotate-180" />}>
                {t("common.back")}
              </Button>
            ) : <span />}
            {step === "review" ? (
              <Button onClick={() => void finish()} loading={submitting} size="lg" icon={<Check className="size-4" />}>
                {submitting ? t("setup.finishing") : t("setup.finish")}
              </Button>
            ) : (
              <Button onClick={next} size="lg">
                {step === "welcome" ? t("setup.start") : t("common.next")}
                <ArrowLeft className="size-4 ltr:rotate-180" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 pb-2">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("font-medium", ltr && "num")}>{value || "—"}</dd>
    </div>
  );
}
