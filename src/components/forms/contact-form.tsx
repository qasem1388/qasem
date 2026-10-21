"use client";

import { Send } from "lucide-react";
import { useActionState } from "react";
import { submitContact } from "@/app/[locale]/actions";
import { buttonClasses } from "@/components/ui/button";
import type { Dictionary } from "@/i18n/dictionaries";
import type { FormState } from "@/lib/validation";
import { Honeypot, LocaleInput, TextAreaField, TextField } from "./field";
import { FormStatus } from "./form-status";

const initial: FormState = { status: "idle" };

export function ContactForm({ dict }: { dict: Dictionary }) {
  const [state, action, pending] = useActionState(submitContact, initial);
  const err = (k: string) => {
    if (state.status !== "error") return undefined;
    const code = state.fieldErrors[k];
    return code ? dict.forms.errors[code] : undefined;
  };

  const val = (k: string) => (state.status === "error" ? state.values?.[k] : undefined);

  if (state.status === "success") {
    return <FormStatus state={state} dict={dict} successText={dict.forms.successContact} />;
  }

  return (
    <form action={action} noValidate className="relative space-y-5">
      <Honeypot />
      <LocaleInput />
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
      </div>
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
      <TextAreaField name="message" defaultValue={val("message")} label={dict.forms.message} required error={err("message")} />
      <FormStatus state={state} dict={dict} successText={dict.forms.successContact} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted text-xs">{dict.forms.privacyNote}</p>
        <button type="submit" disabled={pending} className={buttonClasses("secondary", "md", "sm:min-w-44")}>
          <Send className="size-4 rtl:-scale-x-100" aria-hidden />
          {pending ? dict.forms.sending : dict.forms.send}
        </button>
      </div>
    </form>
  );
}
