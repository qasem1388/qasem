import type { ReactNode } from "react";
import { Building2, CalendarDays, MapPin, Phone } from "lucide-react";
import type { CalendarDisplay, Company, CompanyInput } from "@/shared/api/types";
import { useI18n } from "@/shared/i18n";
import { SelectField, TextField } from "@/shared/ui/Field";

/** Form state: every text field is a string (empty = not provided). */
export interface CompanyFormState {
  nameAr: string;
  nameEn: string;
  vatNumber: string;
  crNumber: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  street: string;
  buildingNumber: string;
  postalCode: string;
  fiscalYearStartMonth: number;
  calendarDisplay: CalendarDisplay;
}

export const emptyCompanyForm: CompanyFormState = {
  nameAr: "",
  nameEn: "",
  vatNumber: "",
  crNumber: "",
  phone: "",
  email: "",
  city: "",
  district: "",
  street: "",
  buildingNumber: "",
  postalCode: "",
  fiscalYearStartMonth: 1,
  calendarDisplay: "both",
};

export function companyToForm(c: Company | CompanyInput): CompanyFormState {
  return {
    nameAr: c.nameAr,
    nameEn: c.nameEn ?? "",
    vatNumber: c.vatNumber ?? "",
    crNumber: c.crNumber ?? "",
    phone: c.phone ?? "",
    email: c.email ?? "",
    city: c.city,
    district: c.district ?? "",
    street: c.street ?? "",
    buildingNumber: c.buildingNumber ?? "",
    postalCode: c.postalCode ?? "",
    fiscalYearStartMonth: c.fiscalYearStartMonth,
    calendarDisplay: c.calendarDisplay,
  };
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-border bg-surface-2/50 p-5">
      <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-text">
        <span className="text-primary">{icon}</span>
        {title}
      </legend>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

interface Props {
  value: CompanyFormState;
  onChange: (v: CompanyFormState) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

/** Shared by the setup wizard and the company settings page. */
export function CompanyForm({ value, onChange, errors, disabled }: Props) {
  const { t, tx } = useI18n();
  const err = (k: keyof CompanyFormState) => (errors[k] ? tx(`validation.${errors[k]}`) : undefined);
  const text = (k: keyof CompanyFormState) => ({
    value: String(value[k]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value }),
    error: err(k),
    disabled,
    optionalLabel: t("common.optional"),
  });

  return (
    <div className="flex flex-col gap-6">
      <Section icon={<Building2 className="size-4" />} title={t("company.sections.identity")}>
        <TextField label={t("company.nameAr")} required autoFocus {...text("nameAr")} maxLength={150} />
        <TextField label={t("company.nameEn")} ltr {...text("nameEn")} maxLength={150} />
        <TextField label={t("company.vatNumber")} hint={t("company.vatHint")} ltr inputMode="numeric" maxLength={15} placeholder="3XXXXXXXXXXXXX3" {...text("vatNumber")} />
        <TextField label={t("company.crNumber")} hint={t("company.crHint")} ltr inputMode="numeric" maxLength={10} {...text("crNumber")} />
      </Section>

      <Section icon={<Phone className="size-4" />} title={t("company.sections.contact")}>
        <TextField label={t("company.phone")} ltr inputMode="tel" placeholder="05XXXXXXXX" maxLength={20} {...text("phone")} />
        <TextField label={t("company.email")} ltr type="email" placeholder="info@example.sa" maxLength={254} {...text("email")} />
      </Section>

      <Section icon={<MapPin className="size-4" />} title={t("company.sections.address")}>
        <TextField label={t("company.city")} required {...text("city")} maxLength={80} />
        <TextField label={t("company.district")} {...text("district")} maxLength={80} />
        <TextField label={t("company.street")} {...text("street")} maxLength={120} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label={t("company.buildingNumber")} ltr inputMode="numeric" maxLength={4} {...text("buildingNumber")} />
          <TextField label={t("company.postalCode")} ltr inputMode="numeric" maxLength={5} {...text("postalCode")} />
        </div>
      </Section>

      <Section icon={<CalendarDays className="size-4" />} title={t("company.sections.preferences")}>
        <SelectField
          label={t("company.fiscalYearStartMonth")}
          value={String(value.fiscalYearStartMonth)}
          onChange={(e) => onChange({ ...value, fiscalYearStartMonth: Number(e.target.value) })}
          error={err("fiscalYearStartMonth")}
          disabled={disabled}
          options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: tx(`months.${i + 1}`) }))}
        />
        <SelectField
          label={t("company.calendarDisplay")}
          hint={t("company.calendarHint")}
          value={value.calendarDisplay}
          onChange={(e) => onChange({ ...value, calendarDisplay: e.target.value as CalendarDisplay })}
          disabled={disabled}
          options={(["both", "gregorian", "hijri"] as const).map((c) => ({ value: c, label: tx(`calendar.${c}`) }))}
        />
        <TextField label={t("company.baseCurrency")} value={t("company.baseCurrencyValue")} readOnly disabled />
      </Section>
    </div>
  );
}
