import { CircleAlert, CircleCheck } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { FormState } from "@/lib/validation";

export function FormStatus({ state, dict, successText }: { state: FormState; dict: Dictionary; successText: string }) {
  return (
    <div role="status" aria-live="polite">
      {state.status === "success" && (
        <p className="rounded-brand flex items-start gap-2 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            {successText}
            {state.reference && (
              <strong className="ms-1 font-bold" dir="ltr">
                {state.reference}
              </strong>
            )}
          </span>
        </p>
      )}
      {state.status === "error" && (
        <p className="rounded-brand flex items-start gap-2 bg-red-50 p-4 text-sm text-red-700">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {state.code === "rate_limited" ? dict.forms.rateLimited : dict.forms.error}
        </p>
      )}
    </div>
  );
}
