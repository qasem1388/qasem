"use client";

import { FileText } from "lucide-react";
import { useActionState } from "react";
import { submitQuote } from "@/app/[locale]/actions";
import { buttonClasses } from "@/components/ui/button";
import type { Dictionary } from "@/i18n/dictionaries";
import type { FormState } from "@/lib/validation";
import { Honeypot, SelectField, TextAreaField, TextField } from "./field";
import { FormStatus } from "./form-status";

const initial: FormState = { status: "idle" };

export function QuoteForm({ dict, services }: { dict: Dictionary; services: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState(submitQuote, initial);
  const err = (k: string) => {
    if (state.status !== "error") return undefined;
    const code = state.fieldErrors[k];
    return code ? dict.forms.errors[code] : undefined;
  };

  const val = (k: string) => (state.status === "error" ? state.values?.[k] : undefined);

  if (state.status === "success") {
    return <FormStatus state={state} dict={dict} successText={dict.forms.successQuote} />;
  }

  return (
    <form action={action} noValidate className="relative space-y-5">
      <Honeypot />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          name="name"
          defaultValue={val("name")}
          label={dict.forms.name}
          required
          autoComplete="name"
          error={err("name")}
        />
        <TextField
          name="company"
          defaultValue={val("company")}
          label={dict.forms.company}
          optionalLabel={dict.forms.optional}
          autoComplete="organization"
        />
        <TextField
          name="phone"
          defaultValue={val("phone")}
          label={dict.forms.phone}
          required
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          error={err("phone")}
        />
        <TextField
          name="email"
          defaultValue={val("email")}
          label={dict.forms.email}
          required
          type="email"
          autoComplete="email"
          dir="ltr"
          error={err("email")}
        />
      </div>
      <SelectField
        name="service"
        defaultValue={val("service")}
        label={dict.forms.service}
        required
        placeholder={dict.forms.selectService}
        options={services}
        error={err("service")}
      />
      <TextAreaField
        name="details"
        defaultValue={val("details")}
        label={dict.forms.details}
        required
        rows={4}
        error={err("details")}
      />
      <FormStatus state={state} dict={dict} successText={dict.forms.successQuote} />
      <button type="submit" disabled={pending} className={buttonClasses("primary", "lg", "w-full")}>
        <FileText className="size-5" aria-hidden />
        {pending ? dict.forms.sending : dict.forms.sendQuote}
      </button>
    </form>
  );
}
