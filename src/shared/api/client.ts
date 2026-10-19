import { invoke } from "@tauri-apps/api/core";

export interface FieldError {
  field: string;
  code: string;
}

/** Error returned by any backend command (see `src-tauri/src/error.rs`). */
export class ApiError extends Error {
  readonly code: string;
  readonly fields: FieldError[];
  readonly minutesRemaining?: number;

  constructor(code: string, message: string, fields: FieldError[] = [], minutesRemaining?: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.fields = fields;
    this.minutesRemaining = minutesRemaining;
  }

  /** Field errors keyed by field path, optionally stripping a prefix. */
  fieldMap(prefix = ""): Record<string, string> {
    const out: Record<string, string> = {};
    for (const f of this.fields) {
      if (f.field.startsWith(prefix)) out[f.field.slice(prefix.length)] ??= f.code;
    }
    return out;
  }
}

export const SESSION_EXPIRED_EVENT = "hesabati:session-expired";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function toApiError(raw: unknown): ApiError {
  if (raw && typeof raw === "object" && "code" in raw) {
    const r = raw as { code: string; message?: string; fields?: FieldError[]; minutes_remaining?: number };
    return new ApiError(r.code, r.message ?? r.code, r.fields ?? [], r.minutes_remaining);
  }
  return new ApiError("network", typeof raw === "string" ? raw : "IPC failure");
}

/** Typed `invoke` that always rejects with `ApiError`. */
export async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) throw new ApiError("no_backend", "Not running inside Tauri");
  try {
    return await invoke<T>(command, args);
  } catch (raw) {
    const err = toApiError(raw);
    if (err.code === "unauthenticated") window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    throw err;
  }
}
