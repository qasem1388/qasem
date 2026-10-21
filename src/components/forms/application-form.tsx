"use client";

import { Send } from "lucide-react";
import { useActionState } from "react";
import { submitApplication } from "@/app/[locale]/actions";
import { buttonClasses } from "@/components/ui/button";
import type { Dictionary } from "@/i18n/dictionaries";
import type { FormState } from "@/lib/validation";
import { FileField, Honeypot, TextAreaField, TextField } from "./field";
import { FormStatus } from "./form-status";

const initial: FormState = { status: "idle" };

export function ApplicationForm({ dict, job }: { dict: Dictionary; job: string }) {
  const [state, action, pending] = useActionState(submitApplication, initial);
  const err = (k: string) => {
    if (state.status !== "error") return undefined;
    const code = state.fieldErrors[k];
    return code ? dict.forms.errors[code] : undefined;
  };
  const val = (k: string) => (state.status === "error" ? state.values?.[k] : undefined);

  if (state.status === "success") {
    return <FormStatus state={state} dict={dict} successText={dict.forms.successApplication} />;
  }

  return (
    <form action={action} noValidate className="relative space-y-5">
      <Honeypot />
      <input type="hidden" name="job" value={job} />
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
        <TextField
          name="city"
          defaultValue={val("city")}
          label={dict.forms.city}
          optionalLabel={dict.forms.optional}
          autoComplete="address-level2"
        />
        <TextField
          name="experience"
          defaultValue={val("experience")}
          label={dict.forms.experienceYears}
          optionalLabel={dict.forms.optional}
          inputMode="numeric"
        />
        <TextField
          name="linkedin"
          defaultValue={val("linkedin")}
          label={dict.forms.linkedin}
          optionalLabel={dict.forms.optional}
          type="url"
          dir="ltr"
          error={err("linkedin")}
        />
      </div>
      <TextAreaField
        name="coverLetter"
        defaultValue={val("coverLetter")}
        label={dict.forms.coverLetter}
        optionalLabel={dict.forms.optional}
        rows={4}
      />
      <FileField
        name="cv"
        label={dict.forms.cv}
        required
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        hint={dict.forms.cvHint}
        error={err("cv")}
      />
      <FormStatus state={state} dict={dict} successText={dict.forms.successApplication} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted text-xs">{dict.forms.privacyNote}</p>
        <button type="submit" disabled={pending} className={buttonClasses("primary", "lg", "sm:min-w-52")}>
          <Send className="size-4 rtl:-scale-x-100" aria-hidden />
          {pending ? dict.forms.sending : dict.forms.sendApplication}
        </button>
      </div>
    </form>
  );
}
